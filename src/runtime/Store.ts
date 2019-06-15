import { Store } from 'relay-runtime'
import {
  MutableRecordSource,
  Scheduler,
  ReaderSelector,
  NormalizationSelector,
  OperationLoader,
  OperationDescriptor,
  UpdatedRecords,
  Disposable,
  Snapshot,
} from 'relay-runtime/lib/RelayStoreTypes';


import { UNPUBLISH_RECORD_SENTINEL } from 'relay-runtime/lib/RelayStoreUtils';
import * as DataChecker from 'relay-runtime/lib/DataChecker';
import * as RelayModernRecord from 'relay-runtime/lib/RelayModernRecord';
import * as RelayReader from 'relay-runtime/lib/RelayReader';
import * as RelayReferenceMarker from 'relay-runtime/lib/RelayReferenceMarker';

import * as hasOverlappingIDs from 'relay-runtime/lib/hasOverlappingIDs';
import * as recycleNodesInto from 'relay-runtime/lib/recycleNodesInto';
import * as resolveImmediate from 'fbjs/lib/resolveImmediate';

//import * as defaultGetDataID from 'relay-runtime/lib/defaultGetDataID';
type Subscription = {
  callback: (snapshot: Snapshot) => void,
  snapshot: Snapshot,
};
/**
 * @public
 *
 * An implementation of the `Store` interface defined in `RelayStoreTypes`.
 *
 * Note that a Store takes ownership of all records provided to it: other
 * objects may continue to hold a reference to such records but may not mutate
 * them. The static Relay core is architected to avoid mutating records that may have been
 * passed to a store: operations that mutate records will either create fresh
 * records or clone existing records and modify the clones. Record immutability
 * is also enforced in development mode by freezing all records passed to a store.
 */
export interface StoreOptions {
  source: RecordSource,
  gcScheduler?: Scheduler,
  operationLoader?: OperationLoader,
  //UNSTABLE_DO_NOT_USE_getDataID?: GetDataID, master branch
  ttl?: number
}

import Cache, { CacheOptions } from "@wora/cache-persist";
import RelayModernEnvironment from './RelayModernEnvironment';
import RecordSource from './RecordSource';

class RelayStore implements Store {

  private _gcScheduler: Scheduler;
  private _hasScheduledGC: boolean;
  private _operationLoader?: any;
  private _recordSource: RecordSource;
  private _subscriptions: Set<Subscription>;
  private _updatedRecordIDs: UpdatedRecords;
  private _gcHoldCounter: number;
  private _shouldScheduleGC: boolean;
  private _ttl?: number;
  private _cache: Cache;
  private _environment: RelayModernEnvironment;

  constructor(
    persistOptions: CacheOptions = {},
    persistOptionsRecords: CacheOptions = {},
    gcScheduler: Scheduler = resolveImmediate,
    operationLoader: OperationLoader = null,
    ttl: number = 10 * 60 * 1000,
  ) {
    /*if (__DEV__) {
      const storeIDs = source.getRecordIDs();
      for (let ii = 0; ii < storeIDs.length; ii++) {
        const record = source.get(storeIDs[ii]);
        if (record) {
          RelayModernRecord.freeze(record);
        }
      }
    }*/
    this._gcScheduler = gcScheduler;
    this._hasScheduledGC = false;
    this._operationLoader = operationLoader;
    this._subscriptions = new Set();
    this._updatedRecordIDs = {};
    this._gcHoldCounter = 0;
    this._shouldScheduleGC = false;
    this._ttl = ttl;

    const persistOptionsStore = {
      prefix: 'relay-store',
      serialize: true,
      ...persistOptions,
    };
    const persistOptionsRecordSource = {
      prefix: 'relay-records',
      serialize: true,
      ...persistOptions,
      ...persistOptionsRecords,
    }
    /*const idbStorages: CacheStorage[] = IDBStorage.create("relay", ["roots", "cache"]);
    const idb: CacheOptions = {
      storage: idbStorages[0],
      serialize: false,
    }
    
    const idb1: CacheOptions = {
      storage: idbStorages[1],
      serialize: false,
    }*/


    const cacheRecordSource = new Cache(persistOptionsRecordSource);
    const cache = new Cache(persistOptionsStore);


    this._recordSource = new RecordSource(cacheRecordSource);

    this._cache = cache;
  }

  public restore(environment): Promise<Cache[]> {
    this._environment = environment;
    return Promise.all([this._cache.restore(), this._recordSource.restore()]);
  }

  public retain(selector: NormalizationSelector, execute?: boolean): Disposable {
    const name = selector.node.name + "." + JSON.stringify(selector.variables);
    const dispose = () => {
      const root = this._cache.get(name);
      if (root) {
        const newRoot = {
          ...root,
          dispose: true,
        }
        this._cache.set(name, newRoot);
        //this.store.dispatch(writeThunk(WRITE_ROOT_ACTION, roots) as any as Action);
      }
      this._scheduleGC();
    };
    const root = this._cache.get(name);
    const newRoot = {
      selector,
      retainTime: execute || !root ? Date.now() : root.retainTime,
      dispose: false,
      execute: execute
    }
    this._cache.set(name, newRoot);
    return { dispose };
  }



  public lookup(selector: ReaderSelector, owner?: OperationDescriptor): Snapshot {
    const snapshot = RelayReader.read(this._recordSource, selector, owner);
    const name = selector.node.name + "." + JSON.stringify(selector.variables);
    const root = this._cache.get(name);
    const expired: boolean = root ? !this.isCurrent(root.retainTime, this._ttl) : false;


    return {
      ...snapshot,
      expired
    };
  }



  //TODO ADD for OFFLINE
  /*__expireAll(): void {
    const roots = this.store.getState()[NORMALIZED_ROOTS_KEY];
    Object.keys(roots).forEach(index => {
      const selRoot = roots[index];
      selRoot.retainTime = Date.now() - (this._ttl);
    });
    this.store.dispatch(writeThunk(WRITE_ROOT_ACTION, roots) as any as Action);
  }*/

  public __gc(): void {
    if (!this._environment.isOnline()) {
      return;
    }
    const references = new Set();
    this._cache.getAllKeys().forEach(index => {
      const selRoot = this._cache.get(index);
      const expired: boolean = !this.isCurrent(selRoot.retainTime, this._ttl);
      if (!selRoot.dispose || !expired) {
        RelayReferenceMarker.mark(
          this._recordSource,
          selRoot.selector,
          references,
          this._operationLoader,
        );
      } else {
        this._cache.remove(index)
      }
    });
    // Short-circuit if *nothing* is referenced
    if (!references.size) {
      this._recordSource.clear();
      return;
    }
    // Evict any unreferenced nodes
    const storeIDs = this._recordSource.getRecordIDs();
    for (let ii = 0; ii < storeIDs.length; ii++) {
      const dataID = storeIDs[ii];
      if (!references.has(dataID)) {
        this._recordSource.remove(dataID);
      }
    }
  }

  private isCurrent(fetchTime: number, ttl: number): boolean {
    return fetchTime + ttl >= Date.now();
  }

  public getSource(): RecordSource {
    return this._recordSource;
  }

  public check(selector: NormalizationSelector): boolean {
    return DataChecker.check(
      this._recordSource,
      this._recordSource,
      selector,
      [],
      this._operationLoader,
    );
  }

  public notify(): void {
    this._subscriptions.forEach(subscription => {
      this._updateSubscription(subscription);
    });
    this._updatedRecordIDs = {};
  }

  public publish(source: RecordSource): void {
    updateTargetFromSource(this._recordSource, source, this._updatedRecordIDs);
  }

  public subscribe(
    snapshot: Snapshot,
    callback: (snapshot: Snapshot) => void,
  ): Disposable {
    const subscription = { callback, snapshot };
    const dispose = () => {
      this._subscriptions.delete(subscription);
    };
    this._subscriptions.add(subscription);
    return { dispose };
  }

  public holdGC(): Disposable {
    this._gcHoldCounter++;
    const dispose = () => {
      if (this._gcHoldCounter > 0) {
        this._gcHoldCounter--;
        if (this._gcHoldCounter === 0 && this._shouldScheduleGC) {
          this._scheduleGC();
          this._shouldScheduleGC = false;
        }
      }
    };
    return { dispose };
  }

  public toJSON(): any {
    return 'RelayModernStore()';
  }

  // Internal API
  public __getUpdatedRecordIDs(): UpdatedRecords {
    return this._updatedRecordIDs;
  }

  public _updateSubscription(subscription: Subscription): void {
    const { callback, snapshot } = subscription;
    if (!hasOverlappingIDs(snapshot, this._updatedRecordIDs)) {
      return;
    }
    let nextSnapshot = RelayReader.read(
      this._recordSource,
      snapshot,
      snapshot.owner,
    );
    const nextData = recycleNodesInto(snapshot.data, nextSnapshot.data);
    nextSnapshot = {
      ...nextSnapshot,
      data: nextData,
    };
    /*if (__DEV__) {
      deepFreeze(nextSnapshot);
    }*/
    subscription.snapshot = nextSnapshot;
    if (nextSnapshot.data !== snapshot.data) {
      callback(nextSnapshot);
    }
  }

  public _scheduleGC() {
    if (this._gcHoldCounter > 0) {
      this._shouldScheduleGC = true;
      return;
    }
    if (this._hasScheduledGC) {
      return;
    }
    this._hasScheduledGC = true;
    this._gcScheduler(() => {
      this.__gc();
      this._hasScheduledGC = false;
    });
  }


}

function updateTargetFromSource(
  target: MutableRecordSource,
  source: RecordSource,
  updatedRecordIDs: UpdatedRecords,
): void {
  const dataIDs = source.getRecordIDs();
  for (let ii = 0; ii < dataIDs.length; ii++) {
    const dataID = dataIDs[ii];
    const sourceRecord = source.get(dataID);
    const targetRecord = target.get(dataID);
    // Prevent mutation of a record from outside the store.
    /*if (__DEV__) {
      if (sourceRecord) {
        RelayModernRecord.freeze(sourceRecord);
      }
    }*/
    if (sourceRecord === UNPUBLISH_RECORD_SENTINEL) {
      // Unpublish a record
      target.remove(dataID);
      updatedRecordIDs[dataID] = true;
    } else if (sourceRecord && targetRecord) {
      const nextRecord = RelayModernRecord.update(targetRecord, sourceRecord);
      if (nextRecord !== targetRecord) {
        // Prevent mutation of a record from outside the store.
        /*if (__DEV__) {
          RelayModernRecord.freeze(nextRecord);
        }*/
        updatedRecordIDs[dataID] = true;
        target.set(dataID, nextRecord);
      }
    } else if (sourceRecord === null) {
      target.delete(dataID);
      if (targetRecord !== null) {
        updatedRecordIDs[dataID] = true;
      }
    } else if (sourceRecord) {
      target.set(dataID, sourceRecord);
      updatedRecordIDs[dataID] = true;
    } // don't add explicit undefined
  }
}



export default RelayStore;
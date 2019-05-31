import { Environment, Observable as RelayObservable, GraphQLResponse } from 'relay-runtime';

import { EnvironmentConfig } from 'relay-runtime/lib/RelayModernEnvironment';

import Store from './Store';
import { Store as StoreRedux } from 'redux';

import {
  NormalizationSelector,
  Disposable,
} from 'relay-runtime/lib/RelayStoreTypes';

import { v4 as uuid } from "uuid";
import StoreOffline, { NORMALIZED_OFFLINE, NORMALIZED_REHYDRATED, NORMALIZED_DETECTED, RelayCache, PersistOptions } from './redux/OfflineStore';


const actions = {
  ENQUEUE: 'ENQUEUE_OFFLINE_MUTATION',
  COMMIT: 'COMMIT_OFFLINE_MUTATION',
  ROLLBACK: 'ROLLBACK_OFFLINE_MUTATION',
};

/*import Cache, { CacheStorage, CacheOptions } from "cache-persist";
import IDBStorage from 'cache-persist/lib/idbstorage';
import { Store } from '..';

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
type EnvironmentOfflineConfig = Omit<EnvironmentConfig, "store">; 
type StoreOfflineConfigs= Omit<StoreOptions, "source">; 

export interface PersistOptions {
  cache?: CacheOptions, 
  store?: StoreOfflineConfigs,
}

*/

class RelayModernEnvironment extends Environment {
  
  private _isRestored: boolean;
  private _storeOffline: StoreRedux<RelayCache>;

  constructor(config: EnvironmentConfig, offlineOptions: PersistOptions= {}) {
    super(config);
    this._storeOffline = StoreOffline.create(this, offlineOptions);
  }

  public restore(): Promise<boolean> {
    return ((this as any)._store as Store).restore(this._storeOffline).then(result =>
      this._isRestored = true
    ).catch( error => {
      this._isRestored = false;
      throw error;
    }
    )
  }

  public isRestored():boolean {
    return this._isRestored;
  }

  public isRehydrated() {
    return this._isRestored && this._storeOffline.getState()[NORMALIZED_REHYDRATED] && this._storeOffline.getState()[NORMALIZED_DETECTED];
  }

  public isOnline() {
    return this._storeOffline.getState()[NORMALIZED_OFFLINE].online;
  }

  public getStoreOffline() {
    return this._storeOffline;
  }

  public retain(selector: NormalizationSelector, execute: boolean = true): Disposable {
    return (this as any)._store.retain(selector, execute);
  }

  public executeMutationOffline({
    operation,
    optimisticResponse,
    optimisticUpdater,
    updater,
    uploadables,
  }): RelayObservable<GraphQLResponse> {
    return super.executeMutation({
      operation,
      optimisticResponse,
      optimisticUpdater,
      updater,
      uploadables,
    });
  }
  

  public executeMutation({
    operation,
    optimisticResponse,
    optimisticUpdater,
    updater,
    uploadables,
  }): RelayObservable<GraphQLResponse> {
    if (this.isOnline()) {
      return super.executeMutation({
        operation,
        optimisticResponse,
        optimisticUpdater,
        updater,
        uploadables,
      })
    } else {
      return RelayObservable.create(sink => {
        let optimisticUpdate;
        if (optimisticResponse || optimisticUpdater) {
          optimisticUpdate = {
            operation: operation,
            selectorStoreUpdater: optimisticUpdater,
            response: optimisticResponse || null,
          };
        }
        if (optimisticUpdate != null) {
          //TODO fix type
          (this as any)._publishQueue.applyUpdate(optimisticUpdate);
          (this as any)._publishQueue.run();
        }
        const fetchTime = Date.now();
        const id = uuid();
        this._storeOffline.dispatch({
          type: actions.ENQUEUE,
          payload: { optimisticResponse },
          meta: {
            offline: {
              effect: {
                request: {
                  operation,
                  optimisticResponse,
                  uploadables
                },
                fetchTime: fetchTime,
                id: id
              },
              commit: { type: actions.COMMIT },
              rollback: { type: actions.ROLLBACK },
            }
          }
        });

        return () => null
      });
    }

  }



}


export default RelayModernEnvironment;
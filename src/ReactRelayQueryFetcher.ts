import * as QueryFetcherOriginal from 'react-relay/lib/ReactRelayQueryFetcher';
import {
  Disposable,
  IEnvironment,
  OperationDescriptor,
  Snapshot,
  FetchOptions
} from 'relay-runtime/lib/RelayStoreTypes';
import { STORE_THEN_NETWORK, CACHE_FIRST } from './RelayOfflineTypes';

class ReactRelayQueryFetcher extends QueryFetcherOriginal {

  _cachedLookup: {snapshot?: Snapshot, offline?: boolean};

  constructor(args?: {
    cacheSelectionReference: Disposable,
    selectionReferences: Array<Disposable>,
  }) {
    super(args);
    this._cachedLookup = null;
  }

  _retainCachedOperation(
    environment: IEnvironment,
    operation: OperationDescriptor,
    ttl: number
  ) {
    (this as QueryFetcherOriginal)._disposeCacheSelectionReference();
    (this as QueryFetcherOriginal)._cacheSelectionReference = environment.retain(operation.root, { execute: false, ttl });
  }

  lookupInStore(
    environment: IEnvironment,
    operation: OperationDescriptor,
    dataFrom: any, ttl: number
  ): Snapshot {
    const offline = !environment.isOnline();
    this._cachedLookup = {
      offline
    };
    if(dataFrom === CACHE_FIRST ||
        dataFrom === STORE_THEN_NETWORK ||
        offline ||
        dataFrom === 'store-or-network') {
          
      if (environment.check(operation.root)) {
        this._retainCachedOperation(environment, operation, ttl);
        const snapshot:Snapshot = environment.lookup(operation.fragment, operation);
        if(snapshot) {
          this._cachedLookup = {
            snapshot,
            offline,
          }
        };
        if(!this.isValidSnapshot()) {
          (this as QueryFetcherOriginal)._cacheSelectionReference = null; // avoid dispose when call network
        }
        return snapshot;
      }
    }
    
    return null;
  }

  isValidSnapshot(): boolean {
    return this._cachedLookup && 
      (this._cachedLookup.offline || 
        this._cachedLookup.snapshot);
  }

  fetch(fetchOptions: FetchOptions): Snapshot {
    if (this.isValidSnapshot())
        return null;
    super.fetch(fetchOptions);
  }

}

export default ReactRelayQueryFetcher;

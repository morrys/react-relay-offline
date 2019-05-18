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
  ) {
    (this as QueryFetcherOriginal)._disposeCacheSelectionReference();
    (this as QueryFetcherOriginal)._cacheSelectionReference = environment.retain(operation.root, false);
  }

  lookupInStore(
    environment: IEnvironment,
    operation: OperationDescriptor,
    dataFrom: any
  ): Snapshot {
    const offline = !environment.isOnline();
    this._cachedLookup = null;
    if(dataFrom === CACHE_FIRST ||
        dataFrom === STORE_THEN_NETWORK ||
        offline ||
        dataFrom === 'store-or-network') {
          
      if (environment.check(operation.root)) {
        this._retainCachedOperation(environment, operation);
        const snapshot:Snapshot = environment.lookup(operation.fragment, operation);
        if(snapshot) {
          this._cachedLookup = {
            snapshot,
            offline,
          }
        };
        return snapshot;
      }
    }
    
    return null;
  }

  isValidSnapshot(): boolean {
    return this._cachedLookup && 
      (this._cachedLookup.offline || 
        this._cachedLookup.snapshot &&  !(this._cachedLookup.snapshot as any).expired);
  }

  fetch(fetchOptions: FetchOptions): Snapshot {
    if (this.isValidSnapshot())
        return null;
    super.fetch(fetchOptions);
  }

}

export default ReactRelayQueryFetcher;

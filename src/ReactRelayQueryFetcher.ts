import * as QueryFetcherOriginal from 'react-relay/lib/ReactRelayQueryFetcher';
import {
  Disposable,
  IEnvironment,
  OperationDescriptor,
  Snapshot
} from 'relay-runtime/lib/RelayStoreTypes';

class ReactRelayQueryFetcher extends QueryFetcherOriginal {

  constructor(args?: {
    cacheSelectionReference: Disposable,
    selectionReferences: Array<Disposable>,
  }) {
    super(args);
  }

  resetCacheSelectionReference() {
    (this as QueryFetcherOriginal)._cacheSelectionReference = null;
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
    
    if(dataFrom === 'CACHE_FIRST' ||
        dataFrom === 'STORE_THEN_NETWORK' ||
        !environment.isOnline() ||
        dataFrom === 'store-or-network') {
      if (environment.check(operation.root)) {
        this._retainCachedOperation(environment, operation);
        return environment.lookup(operation.fragment, operation);
      }
    }
    return null;
  }

}

export default ReactRelayQueryFetcher;

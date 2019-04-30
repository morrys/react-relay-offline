import * as QueryFetcherOriginal from 'react-relay/lib/ReactRelayQueryFetcher';
import {
  Disposable,
  IEnvironment,
  OperationDescriptor,
} from 'relay-runtime/lib/RelayStoreTypes';

class ReactRelayQueryFetcher extends QueryFetcherOriginal {

  constructor(args?: {
    cacheSelectionReference: Disposable,
    selectionReferences: Array<Disposable>,
  }) {
    super(args);
  }

  resetCacheSelectionReference() {
    super._cacheSelectionReference = null;
  }

  _retainCachedOperation(
    environment: IEnvironment,
    operation: OperationDescriptor,
  ) {
    super._disposeCacheSelectionReference();
    super._cacheSelectionReference = environment.retain(operation.root, false);
  }

}

export default ReactRelayQueryFetcher;

import * as React from 'react';
import ReactRelayQueryFetcher from './ReactRelayQueryFetcher'
import {  ReactRelayContext } from 'react-relay';
import QueryFetcherOriginal from 'react-relay/lib/ReactRelayQueryFetcher';

import {
  CacheConfig,
  GraphQLTaggedNode,
  IEnvironment,
  RelayContext,
  RequestParameters,
  Snapshot,
  Variables,
} from 'relay-runtime/lib/RelayStoreTypes';

import * as areEqual from 'fbjs/lib/areEqual';

const CACHE_FIRST = 'CACHE_FIRST';
const NETWORK_ONLY = 'NETWORK_ONLY';
const STORE_THEN_NETWORK = 'STORE_THEN_NETWORK';
interface DataFromEnum {
  NETWORK_ONLY: String,
  STORE_THEN_NETWORK: String,
  CACHE_FIRST: String,
};
type DataFrom = keyof DataFromEnum;



interface RetryCallbacks {
  handleDataChange:
  | null
  | ((args: {
    error?: Error,
    snapshot?: Snapshot
  }) => void),
  handleRetryAfterError: null | ((error: Error) => void),
};

export type RenderProps = {
  error: Error,
  props: Object,
  retry: () => void,
  cached?: boolean
};

export interface Props {
  cacheConfig?: CacheConfig,
  dataFrom?: DataFrom,
  environment: IEnvironment,
  query: GraphQLTaggedNode,
  render: (renderProps: RenderProps) => React.ReactNode,
  variables: Variables,
};

interface State {
  error: Error | null,
  prevPropsEnvironment: IEnvironment,
  prevPropsVariables: Variables,
  prevQuery: GraphQLTaggedNode,
  queryFetcher: ReactRelayQueryFetcher,
  relayContext: RelayContext,
  renderProps: RenderProps,
  retryCallbacks: RetryCallbacks,
  requestCacheKey: string,
  snapshot: Snapshot | null,
  cached: boolean
};

const requestCache = {};

class QueryRenderer extends React.Component<Props, State> {
  
  state: State;

  constructor(props) {
    super(props);
    // Callbacks are attached to the current instance and shared with static
    // lifecyles by bundling with state. This is okay to do because the
    // callbacks don't change in reaction to props. However we should not
    // "leak" them before mounting (since we would be unable to clean up). For
    // that reason, we define them as null initially and fill them in after
    // mounting to avoid leaking memory.
    const retryCallbacks = {
      handleDataChange: null,
      handleRetryAfterError: null,
    };

    let queryFetcher;
    let requestCacheKey;
    if (props.query) {
      const { query } = props;

      const { getRequest } = props.environment.unstable_internal;
      const request = getRequest(query);
      requestCacheKey = getRequestCacheKey(request.params, props.variables);
      queryFetcher = requestCache[requestCacheKey]
        ? requestCache[requestCacheKey].queryFetcher
        : new ReactRelayQueryFetcher();
    } else {
      queryFetcher = new ReactRelayQueryFetcher();
    }
    this.state = ({
        prevPropsEnvironment: props.environment,
        prevPropsVariables: props.variables,
        prevQuery: props.query,
        queryFetcher,
        retryCallbacks,
        ...fetchQueryAndComputeStateFromProps(
          props,
          queryFetcher,
          retryCallbacks,
          requestCacheKey,
        ),
      }) as State;

  }

  //override
  componentDidMount() {
    const { retryCallbacks, queryFetcher, requestCacheKey, cached } = this.state;
    if (requestCacheKey) {
      delete requestCache[requestCacheKey];
    }

    retryCallbacks.handleDataChange = (params: {
      error?: Error,
      snapshot?: Snapshot,
    }): void => {
      const error = params.error == null ? null : params.error;
      const snapshot = params.snapshot == null ? null : params.snapshot;

      this.setState(prevState => {
        const { requestCacheKey: prevRequestCacheKey } = prevState;
        if (prevRequestCacheKey) {
          delete requestCache[prevRequestCacheKey];
        }

        // Don't update state if nothing has changed.
        if (snapshot === prevState.snapshot && error === prevState.error) {
          return null;
        }
        return {
          renderProps: getRenderProps(
            error,
            snapshot,
            queryFetcher,
            retryCallbacks,
          ),
          snapshot,
          cached,
          requestCacheKey: null,
        };
      });
    };
    retryCallbacks.handleRetryAfterError = (error: Error) =>
      this.setState(prevState => {
        const { requestCacheKey: prevRequestCacheKey } = prevState;
        if (prevRequestCacheKey) {
          delete requestCache[prevRequestCacheKey];
        }

        return {
          renderProps: getLoadingRenderProps(),
          requestCacheKey: null,
        };
      });

    // Re-initialize the ReactRelayQueryFetcher with callbacks.
    // If data has changed since constructions, this will re-render.
    if (this.props.query && !cached) {
      (queryFetcher as QueryFetcherOriginal).setOnDataChange(retryCallbacks.handleDataChange);
    }
  }

  render() {
    const {renderProps, relayContext} = this.state;
    return <ReactRelayContext.Provider value={relayContext}>
        {this.props.render(renderProps)}
      </ReactRelayContext.Provider>
  }

  



  static getDerivedStateFromProps(
    nextProps: Props,
    prevState: State,
  ): Partial<State> | null {
    if (
      prevState.prevQuery !== nextProps.query ||
      prevState.prevPropsEnvironment !== nextProps.environment ||
      !areEqual(prevState.prevPropsVariables, nextProps.variables)
    ) {
      const {query} = nextProps;
      (prevState.queryFetcher as QueryFetcherOriginal).disposeRequest();
      const prevSelectionReferences = (prevState.queryFetcher as QueryFetcherOriginal).getSelectionReferences();
      
      let queryFetcher;
      if (query) {
        const {getRequest} = nextProps.environment.unstable_internal;
        const request = getRequest(query);
        const requestCacheKey = getRequestCacheKey(
          request.params,
          nextProps.variables,
        );
        queryFetcher = requestCache[requestCacheKey]
          ? requestCache[requestCacheKey].queryFetcher
          : new ReactRelayQueryFetcher(prevSelectionReferences);
      } else {
        queryFetcher = new ReactRelayQueryFetcher(prevSelectionReferences);
      }
      return {
        prevQuery: nextProps.query,
        prevPropsEnvironment: nextProps.environment,
        prevPropsVariables: nextProps.variables,
        queryFetcher: queryFetcher,
        ...fetchQueryAndComputeStateFromProps(
          nextProps,
          queryFetcher,
          prevState.retryCallbacks,
          undefined
          // passing no requestCacheKey will cause it to be recalculated internally
          // and we want the updated requestCacheKey, since variables may have changed
        ),
      };
    }

    return null;
  }

  componentDidUpdate(): void {
    // We don't need to cache the request after the component commits
    const {requestCacheKey} = this.state;
    if (requestCacheKey) {
      delete requestCache[requestCacheKey];
      // HACK
      delete this.state.requestCacheKey;
    }
  }

  componentWillUnmount(): void {
    (this.state.queryFetcher as QueryFetcherOriginal).dispose();
  }

  shouldComponentUpdate(nextProps: Props, nextState: State): boolean {
    return (
      nextProps.render !== this.props.render ||
      nextState.renderProps !== this.state.renderProps
    );
  }
  
}

function fetchQueryAndComputeStateFromProps(
  props: Props,
  queryFetcher: QueryFetcherOriginal,
  retryCallbacks: RetryCallbacks,
  requestCacheKey: string,
): Partial<State> {
  const { environment, query, variables } = props;
  const genericEnvironment: IEnvironment = (environment);
  if (query) {
    const {
      createOperationDescriptor,
      getRequest,
    } = genericEnvironment.unstable_internal;
    const request = getRequest(query);
    const operation = createOperationDescriptor(request, variables);
    const relayContext = getContext(genericEnvironment, operation.variables);
    const offline = !genericEnvironment.isOnline();
    if (typeof requestCacheKey === 'string' && requestCache[requestCacheKey]) {
      // This same request is already in flight.
      const { snapshot } = requestCache[requestCacheKey]; //TODO offline
      if (snapshot) {
        // Use the cached response
        return {
          error: null,
          relayContext,
          renderProps: getRenderProps(
            null,
            snapshot,
            queryFetcher,
            retryCallbacks,
          ),
          cached: true, //TODO TEST
          snapshot,
          requestCacheKey,
        };
      } else {
        // Render loading state
        return {
          error: null,
          relayContext,
          renderProps: getLoadingRenderProps(),
          snapshot: null,
          requestCacheKey,
          cached: true, //TODO TEST
        };
      }
    }

    var cached = false;
    try {
      const dataFrom = props.dataFrom || genericEnvironment.getDataFrom();
      const storeSnapshot =
        dataFrom === CACHE_FIRST || 
        props.dataFrom === STORE_THEN_NETWORK ||
          offline
          ? queryFetcher.lookupInStore(genericEnvironment, operation)
          : null;
      cached = (
        offline || //TODO to be evaluated ( offline && storeSnapshot)
        (dataFrom === CACHE_FIRST && storeSnapshot && !(storeSnapshot as any).expired));
      const querySnapshot = cached ? undefined :
        queryFetcher.fetch({
          cacheConfig: props.cacheConfig,
          dataFrom: dataFrom,
          environment: genericEnvironment,
          onDataChange: retryCallbacks.handleDataChange,
          operation,
        });

      // Use network data first, since it may be fresher
      const snapshot = querySnapshot || storeSnapshot;

      // cache the request to avoid duplicate requests
      if (!cached) {
        requestCacheKey =
          requestCacheKey || getRequestCacheKey(request.params, props.variables);
        requestCache[requestCacheKey] = { queryFetcher, snapshot };
      }

      if (!snapshot) {
        return {
          error: null,
          relayContext,
          renderProps: {...getLoadingRenderProps(), cached},
          snapshot: null,
          requestCacheKey,
          cached
        };
      }

      return {
        error: null,
        relayContext,

        renderProps: getRenderProps(
          null,
          snapshot,
          queryFetcher,
          retryCallbacks,
          cached
        ),
        cached,
        snapshot,
        requestCacheKey,
      };
    } catch (error) {
      return {
        error,
        relayContext,
        renderProps: getRenderProps(error, null, queryFetcher, retryCallbacks),
        snapshot: null,
        requestCacheKey,
        cached: null
      };
    }
  } else {
    queryFetcher.dispose();
    const relayContext = getContext(genericEnvironment, variables);
    return {
      error: null,
      relayContext,
      renderProps: getEmptyRenderProps(),
      requestCacheKey: null, // if there is an error, don't cache request
      cached: null
    };
  }
}

function getContext(
  environment: IEnvironment,
  variables: Variables,
): RelayContext {
  return {
    environment,
    variables,
  };
}
function getLoadingRenderProps(): RenderProps {
  return {
    error: null,
    props: null, // `props: null` indicates that the data is being fetched (i.e. loading)
    retry: null,
  };
}

function getEmptyRenderProps(): RenderProps {
  return {
    error: null,
    props: {}, // `props: {}` indicates no data available
    retry: null,
  };
}

function getRenderProps(
  error: Error,
  snapshot: Snapshot,
  queryFetcher: QueryFetcherOriginal,
  retryCallbacks: RetryCallbacks,
  cached: boolean = false,
): RenderProps {
  return {
    error: error ? error : null,
    props: snapshot ? snapshot.data : null,
    cached: cached,
    retry: () => {
      const syncSnapshot = queryFetcher.retry();
      if (
        syncSnapshot &&
        typeof retryCallbacks.handleDataChange === 'function'
      ) {
        retryCallbacks.handleDataChange({snapshot: syncSnapshot});
      } else if (
        error &&
        typeof retryCallbacks.handleRetryAfterError === 'function'
      ) {
        // If retrying after an error and no synchronous result available,
        // reset the render props
        retryCallbacks.handleRetryAfterError(error);
      }
    },
  };
}

function getRequestCacheKey(
  request: RequestParameters,
  variables: Variables,
): string {
  const requestID = request.id || request.text;
  return JSON.stringify({
    id: String(requestID),
    variables,
  });
}

export default QueryRenderer;
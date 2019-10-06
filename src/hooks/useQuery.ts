import ReactRelayQueryFetcher from '../ReactRelayQueryFetcher'
import { useState, useEffect, useRef } from "react";

import {
    IEnvironment,
    RelayContext,
    Snapshot,
} from 'relay-runtime/lib/RelayStoreTypes';

import * as areEqual from 'fbjs/lib/areEqual';
import { UseQueryProps, HooksProps, OperationContextProps } from '../RelayOfflineTypes';



function usePrevious(value): any {
    const ref = useRef();
    if (ref.current === null || ref.current === undefined) {
        const c:any = {...value, queryFetcher: new ReactRelayQueryFetcher()};
        ref.current = c;
    }
    useEffect(() => {
      value.queryFetcher = (ref.current as any).queryFetcher;
      ref.current = value;
    });
    return ref.current;
  }

//TODO Change relayContext con relay
function useQuery(props: UseQueryProps)  {
    const {environment, query, variables } = props
    const prev = usePrevious({environment, query, variables});
    const queryFetcher = prev.queryFetcher;
    const [hooksProps, setHooksProps] = useState<HooksProps>(() => {
        return execute(environment, query, variables);
    });
    
    useEffect(() => {
        return () => {
            queryFetcher.dispose()
        };
    }, []);

    useEffect(() => {
        if (prev.query !== query ||
            prev.environment !== environment ||
      !areEqual(prev.variables, variables) ) {
        setHooksProps(execute(environment, query, variables))
      }
    }, [environment, query, variables]);

    function execute(environment, query, variables) {
        const genericEnvironment: IEnvironment = (environment);
        if (!query) {
            queryFetcher.dispose();
            return getOperationContext({ operation: null, relay: {environment, variables} });
        } else {
            queryFetcher.disposeRequest();
            const { createOperationDescriptor, getRequest, } = genericEnvironment.unstable_internal;
            const request = getRequest(query);
            const operation = createOperationDescriptor(request, variables);
            return getOperationContext({ operation: operation, relay: {environment, variables: operation.variables} });
        }
    }

    function getOperationContext(operationContext: OperationContextProps) {
        const { environment } = props;
        const genericEnvironment: IEnvironment = (environment);
        const operation = operationContext.operation;
        if (!operation) {
            return getResult({empty: true, relay: operationContext.relay});
        }
        try {
            const storeSnapshot = queryFetcher.lookupInStore(genericEnvironment, operation, props.dataFrom, props.ttl); //i need this
            //const storeSnapshot = queryFetcher.lookupInStore(genericEnvironment, operation);
            const querySnapshot = queryFetcher.fetch({
                    cacheConfig: props.cacheConfig,
                    dataFrom: props.dataFrom,
                    environment: genericEnvironment,
                    onDataChange: !queryFetcher._fetchOptions ? (params: {
                        error?: Error,
                        snapshot?: Snapshot,
                    }): void => {
                        const error = params.error == null ? null : params.error;
                        const snapshot = params.snapshot == null ? null : params.snapshot;
            
                        setHooksProps(getResult({ error, snapshot, cached: false, relay: operationContext.relay }));
                    } : undefined,
                    operation,
                });

            // Use network data first, since it may be fresher
            const snapshot = querySnapshot || storeSnapshot;
            return getResult({ error: null, snapshot, cached: !!storeSnapshot || !environment.isOnline(), relay: operationContext.relay }); //relay
        } catch (error) {
            return getResult({ error: error, snapshot: null, cached: false, relay: operationContext.relay }); //relay
        }
    }

    function getResult(result: {relay: RelayContext, empty?: boolean, error?: Error, snapshot?: Snapshot, cached?: boolean}) {
        if(!result) {
            return;
        }
        const renderProps = {
            error: null,
            props: result.empty ? {} : null, 
            retry: null,
            cached: false
        }
        if (result.snapshot || result.error || result.cached) {
            renderProps.props = result.snapshot ? result.snapshot.data : null,
            renderProps.error = result.error ? result.error : null,
            renderProps.cached = result.cached || false,
            renderProps.retry = () => {
                setHooksProps(execute(props.environment, props.query, props.variables));
            }
        } 
        if(!hooksProps || hooksProps.renderProps!==renderProps)
            return {renderProps, relay: result.relay};    
    }

   /*useMemo(() => {
          render?
    }, [hooksProps]);*/

    return hooksProps;

}

export default useQuery;
import * as React from 'react';
import ReactRelayQueryFetcher from '../ReactRelayQueryFetcher'
import { useState, useEffect, useRef } from "react";

import {
    CacheConfig,
    GraphQLTaggedNode,
    IEnvironment,
    RelayContext,
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


export type RenderProps = {
    error: Error,
    props: Object,
    retry: () => void,
    cached?: boolean
};

export type HooksProps = {
    renderProps: RenderProps,
    relayContext: RelayContext,
};

export interface Props {
    cacheConfig?: CacheConfig,
    dataFrom?: DataFrom,
    environment: IEnvironment,
    query: GraphQLTaggedNode,
    render: (renderProps: RenderProps) => React.ReactNode,
    variables: Variables,
};

export type OperationContextProps = {
    operation: any,
    relayContext: RelayContext,
};

function usePrevious(value): any {
    const ref = useRef();
    if (ref.current === null || ref.current === undefined) {
        const c:any = {queryFetcher: new ReactRelayQueryFetcher()};
        ref.current = c;
    }
    useEffect(() => {
      value.queryFetcher = (ref.current as any).queryFetcher;
      ref.current = value;
    });
    return ref.current;
  }


export default function (props: Props)  {
    const {environment, query, variables, render } = props
    const prev = usePrevious({environment, query, variables, render});
    const queryFetcher = prev.queryFetcher;
    const [hooksProps, setHooksProps] = useState<HooksProps>( { relayContext: {environment: props.environment, variables: props.variables} , 
        renderProps : {
        error: null,
        props: null, 
        retry: null,
        cached: false
    }});
    
    useEffect(() => {
        return () => {
            queryFetcher.dispose()
        };
    }, []);

    useEffect(() => {
        if (prev.query !== query ||
            prev.environment !== environment ||
      !areEqual(prev.variables, variables) ) {
          execute(environment, query, variables)
      }
    }, [environment, query, variables]);

    function execute(environment, query, variables) {
        const genericEnvironment: IEnvironment = (environment);
        if (!query) {
            queryFetcher.dispose();
            setOperationContext({ operation: null, relayContext: {environment, variables} });
        } else {
            queryFetcher.disposeRequest();
            const { createOperationDescriptor, getRequest, } = genericEnvironment.unstable_internal;
            const request = getRequest(query);
            const operation = createOperationDescriptor(request, variables);
            setOperationContext({ operation: operation, relayContext: {environment, variables: operation.variables} });
        }
    }

    function setOperationContext(operationContext: OperationContextProps) {
        const { environment } = props;
        const genericEnvironment: IEnvironment = (environment);
        const operation = operationContext.operation;
        if (!operation) {
            setResult({empty: true, relayContext: operationContext.relayContext});
            return;
        }

        const offline = !genericEnvironment.isOnline();
        try {
            const dataFrom = props.dataFrom || genericEnvironment.getDataFrom();
            const storeSnapshot = queryFetcher.lookupInStore(genericEnvironment, operation, dataFrom);
            const cached = (
                offline || //TODO to be evaluated ( offline && storeSnapshot)
                (dataFrom === CACHE_FIRST && storeSnapshot && !(storeSnapshot as any).expired));
            const querySnapshot = cached ? undefined :
            queryFetcher.fetch({
                    cacheConfig: props.cacheConfig,
                    dataFrom: dataFrom,
                    environment: genericEnvironment,
                    onDataChange: !prev.environment || prev.environment === undefined ? (params: {
                        error?: Error,
                        snapshot?: Snapshot,
                        cached?: boolean,
                    }): void => {
                        const error = params.error == null ? null : params.error;
                        const snapshot = params.snapshot == null ? null : params.snapshot;
                        const cached = params.cached == null ? null : params.cached;
            
                        setResult({ error, snapshot, cached, relayContext: operationContext.relayContext });
                    } : undefined,
                    operation,
                });

            // Use network data first, since it may be fresher
            const snapshot = querySnapshot || storeSnapshot;
            setResult({ error: null, snapshot, cached, relayContext: operationContext.relayContext }); //relayContext
        } catch (error) {
            setResult({ error: error, snapshot: null, cached: false, relayContext: operationContext.relayContext }); //relayContext
        }
    }

    function setResult(result: {relayContext: RelayContext, empty?: boolean, error?: Error, snapshot?: Snapshot, cached?: boolean}) {
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
                const syncSnapshot = queryFetcher.retry();
                if ( syncSnapshot ) {
                    setResult({ error: null, snapshot: syncSnapshot, cached: false, relayContext: result.relayContext })
                } else if ( result.error ) {
                    setResult({ error: result.error, snapshot: undefined, cached: false, relayContext: result.relayContext })
                }
            }
        } 
        if(hooksProps.renderProps!==renderProps)
            setHooksProps({renderProps, relayContext: result.relayContext});    
    }

   /*useMemo(() => {
          render?
    }, [hooksProps]);*/

    return hooksProps;

}
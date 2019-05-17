import * as React from 'react';
import ReactRelayQueryFetcher from './ReactRelayQueryFetcher'
import { useState, useEffect, useRef } from "react";
import { ReactRelayContext } from 'react-relay';
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
import useQuery from './hooks/useQuery';

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
    const hooksProps = useQuery(props);

    return <ReactRelayContext.Provider value={hooksProps.relayContext}>
        {props.render(hooksProps.renderProps)}
    </ReactRelayContext.Provider>

}



//export default QueryRendererHook;
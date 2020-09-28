import * as React from 'react';
import { QueryRendererProps } from './RelayOfflineTypes';
import { useQueryOffline } from './hooks/useQueryOffline';
import { OperationType } from 'relay-runtime';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const QueryRendererHook = <T extends OperationType>(props: QueryRendererProps<T>) => {
    const { render, fetchPolicy, query, variables, cacheConfig, ttl, fetchKey, fetchObserver } = props;
    const hooksProps = useQueryOffline(query, variables, {
        networkCacheConfig: cacheConfig,
        fetchPolicy,
        ttl,
        fetchKey,
        fetchObserver,
    });

    return <React.Fragment>{render(hooksProps)}</React.Fragment>;
};

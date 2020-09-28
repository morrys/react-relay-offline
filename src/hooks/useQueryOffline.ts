import { useState, useRef } from 'react';
import { useRelayEnvironment, useQueryFetcher, STORE_ONLY } from 'relay-hooks';
import { OperationType, GraphQLTaggedNode } from 'relay-runtime';
import { OfflineRenderProps, QueryOptionsOffline } from '../RelayOfflineTypes';
import { useMemoOperationDescriptor } from 'relay-hooks/lib/useQuery';
import { Environment } from '@wora/relay-offline';

export const useQueryOffline = function <TOperationType extends OperationType>(
    gqlQuery: GraphQLTaggedNode,
    variables: TOperationType['variables'],
    options: QueryOptionsOffline = {},
): OfflineRenderProps<TOperationType> {
    const environment = useRelayEnvironment<Environment>();
    const ref = useRef<{ haveProps: boolean }>({
        haveProps: false,
    });

    const rehydrated = environment.isRehydrated();

    const [, forceUpdate] = useState(null);

    if (!rehydrated) {
        environment
            .hydrate()
            .then(() => {
                const { haveProps } = ref.current;
                if (!haveProps) {
                    forceUpdate(ref.current);
                }
            })
            .catch((error) => {
                throw error; //
            });
    }

    const query = useMemoOperationDescriptor(gqlQuery, variables);

    const queryFetcher = useQueryFetcher();

    const { fetchPolicy, networkCacheConfig, ttl, skip, fetchKey, fetchObserver } = options;

    const { props, error, ...others } = queryFetcher.execute(
        environment,
        query,
        {
            networkCacheConfig,
            fetchPolicy: rehydrated && environment.isOnline() ? fetchPolicy : STORE_ONLY,
            skip,
            fetchKey,
            fetchObserver,
        },
        (environment, query) => environment.retain(query, { ttl }), // TODO new directive
    );
    ref.current = {
        haveProps: !!props,
    };
    return {
        ...others,
        props,
        rehydrated,
        error: error,
    };
};

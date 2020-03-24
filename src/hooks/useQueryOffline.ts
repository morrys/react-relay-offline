import { useState, useRef } from 'react';
import { useRelayEnvironment, useQueryFetcher } from 'relay-hooks';
import { OperationType, GraphQLTaggedNode } from 'relay-runtime';
import { STORE_ONLY, FetchPolicy } from 'relay-hooks/lib//RelayHooksType';
import { CacheConfig } from 'relay-runtime';
import { OfflineRenderProps } from '../RelayOfflineTypes';
import { useMemoOperationDescriptor } from 'relay-hooks/lib/useQuery';

const useQueryOffline = function <TOperationType extends OperationType>(
    gqlQuery: GraphQLTaggedNode,
    variables: TOperationType['variables'],
    options: {
        fetchPolicy?: FetchPolicy;
        networkCacheConfig?: CacheConfig;
        ttl?: number;
    } = {},
): OfflineRenderProps<TOperationType> {
    const environment = useRelayEnvironment();
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

    const { fetchPolicy, networkCacheConfig, ttl } = options;

    const { props, error, ...others } = queryFetcher.execute(
        environment,
        query,
        {
            networkCacheConfig,
            fetchPolicy: rehydrated && environment.isOnline() ? fetchPolicy : STORE_ONLY,
        },
        (environment, query) => environment.retain(query.root, { ttl }), // TODO new directive
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

export default useQueryOffline;

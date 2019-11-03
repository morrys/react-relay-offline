import { useEffect, useState, useRef } from "react";
import { useRelayEnvironment, useQueryFetcher } from "relay-hooks";
import { OperationType, GraphQLTaggedNode } from "relay-runtime";
import { STORE_ONLY, FetchPolicy } from "relay-hooks/lib//RelayHooksType";
import { CacheConfig } from "relay-runtime";
import { OfflineRenderProps } from "../RelayOfflineTypes";
import { useMemoOperationDescriptor } from "relay-hooks/lib/useQuery";

const useQueryOffline = function<TOperationType extends OperationType>(
  gqlQuery: GraphQLTaggedNode,
  variables: TOperationType["variables"],
  options: {
    fetchPolicy?: FetchPolicy;
    networkCacheConfig?: CacheConfig;
    ttl?: number;
  } = {}
): OfflineRenderProps<TOperationType> {
  const environment = useRelayEnvironment();
  const ref = useRef<{ rehydrated: boolean; error: Error; props: any }>({
    rehydrated: environment.isRehydrated(),
    error: null,
    props: null
  });

  const [, forceUpdate] = useState(null);

  const { rehydrated } = ref.current;

  if (!rehydrated) {
    environment
      .hydrate()
      .then(() => {
        const current = {
          ...ref.current,
          rehydrated: true,
          error: null
        };
        const { props } = ref.current;
        ref.current = current;
        if (!props) forceUpdate(current);
      })
      .catch(error => {
        const current = {
          ...ref.current,
          rehydrated: false,
          error
        };
        ref.current = current;
        forceUpdate(current);
      });
  }

  const query = useMemoOperationDescriptor(gqlQuery, variables);

  const queryFetcher = useQueryFetcher();

  const { fetchPolicy, networkCacheConfig, ttl } = options;

  useEffect(() => {
    // TODO create new directive for ttl
    const disposable = environment.retain(query.root, { ttl });
    return () => {
      disposable.dispose();
    };
  }, [environment, query]);

  const { props, error, ...others } = queryFetcher.execute(environment, query, {
    networkCacheConfig,
    fetchPolicy: rehydrated || environment.isOnline() ? fetchPolicy : STORE_ONLY
  });

  const current = {
    ...others,
    ...ref.current,
    props,
    error: error || ref.current.error
  };
  ref.current = current;
  return current;
};

export default useQueryOffline;

import {
  GraphQLTaggedNode,
  RelayContext
} from "relay-runtime/lib/RelayStoreTypes";
import { OperationType, CacheConfig } from "relay-runtime";
import { FetchPolicy, RenderProps } from "relay-hooks/lib/RelayHooksType";

export interface UseQueryProps<T extends OperationType> {
  cacheConfig?: CacheConfig;
  fetchPolicy?: FetchPolicy;
  query: GraphQLTaggedNode;
  variables: T["variables"];
  ttl?: number;
}

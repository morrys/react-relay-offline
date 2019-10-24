import { GraphQLTaggedNode } from "relay-runtime/lib/RelayStoreTypes";
import { OperationType, CacheConfig } from "relay-runtime";
import { FetchPolicy, RenderProps } from "relay-hooks/lib/RelayHooksType";

export interface QueryRendererProps<T> extends QueryProps<T> {
  render: (renderProps: RenderProps<T>) => React.ReactNode;
}

export interface QueryRendererOfflineProps<T> extends QueryRendererProps<T> {
  environment: any;
}

export interface OfflineRenderProps<T> extends RenderProps<T> {
  rehydratate: boolean;
}
export interface QueryProps<T extends OperationType> {
  cacheConfig?: CacheConfig;
  fetchPolicy?: FetchPolicy;
  query: GraphQLTaggedNode;
  variables: T["variables"];
  ttl?: number;
}

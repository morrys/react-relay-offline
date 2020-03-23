import { OperationType, CacheConfig, GraphQLTaggedNode } from 'relay-runtime';
import { FetchPolicy, RenderProps } from 'relay-hooks';

export interface QueryRendererProps<T> extends QueryProps<T> {
    render: (renderProps: RenderProps<T>) => React.ReactNode;
}

export interface QueryRendererOfflineProps<T> extends QueryRendererProps<T> {
    environment: any;
}

export interface OfflineRenderProps<T> extends RenderProps<T> {
    rehydrated: boolean;
}
export interface QueryProps<T extends OperationType> {
    cacheConfig?: CacheConfig;
    fetchPolicy?: FetchPolicy;
    query: GraphQLTaggedNode;
    variables: T['variables'];
    ttl?: number;
}

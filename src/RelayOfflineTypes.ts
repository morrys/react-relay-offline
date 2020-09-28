import { OperationType, CacheConfig, GraphQLTaggedNode, Observer, Snapshot } from 'relay-runtime';
import { FetchPolicy, RenderProps, QueryOptions } from 'relay-hooks';
import { Environment } from '@wora/relay-offline';

export interface QueryRendererProps<T extends OperationType> extends QueryProps<T> {
    render: (renderProps: RenderProps<T>) => React.ReactNode;
}

export interface QueryRendererOfflineProps<T extends OperationType> extends QueryRendererProps<T> {
    environment: Environment;
}

export interface OfflineRenderProps<T extends OperationType> extends RenderProps<T> {
    rehydrated: boolean;
}
export interface QueryProps<T extends OperationType> {
    cacheConfig?: CacheConfig;
    fetchPolicy?: FetchPolicy;
    fetchKey?: string | number;
    query: GraphQLTaggedNode;
    variables: T['variables'];
    ttl?: number;
    skip?: boolean;
    fetchObserver?: Observer<Snapshot>;
}

export type QueryOptionsOffline = QueryOptions & {
    ttl?: number;
};

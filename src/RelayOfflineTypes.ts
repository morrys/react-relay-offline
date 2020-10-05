import { OperationType, CacheConfig, GraphQLTaggedNode, Observer, Snapshot } from 'relay-runtime';
import { FetchPolicy, RenderProps, QueryOptions, LoadQuery } from 'relay-hooks';
import { Environment } from '@wora/relay-offline';

export interface QueryRendererProps<T extends OperationType> extends QueryProps<T> {
    render: (renderProps: OfflineRenderProps<T>) => React.ReactNode;
}

export interface QueryRendererOfflineProps<T extends OperationType> extends QueryRendererProps<T> {
    environment: Environment;
}

export interface OfflineRenderProps<T extends OperationType> extends RenderProps<T> {
    rehydrated: boolean;
    online: boolean;
}

export interface OfflineLoadQuery extends LoadQuery {
    getValue: <TOperationType extends OperationType = OperationType>(
        environment?: Environment,
    ) => OfflineRenderProps<TOperationType> | Promise<any>;
    next: <TOperationType extends OperationType>(
        environment: Environment,
        gqlQuery: GraphQLTaggedNode,
        variables?: TOperationType['variables'],
        options?: QueryOptions,
    ) => Promise<void>;
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

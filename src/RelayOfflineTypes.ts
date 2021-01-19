import { OperationType, CacheConfig, GraphQLTaggedNode } from 'relay-runtime';
import { RenderProps, QueryOptions, LoadQuery } from 'relay-hooks';
import { Environment } from '@wora/relay-offline';

export interface CacheConfigTTL extends CacheConfig {
    ttl?: number;
}

export interface OfflineLoadQuery extends LoadQuery {
    getValue: <TOperationType extends OperationType = OperationType>(
        environment?: Environment,
    ) => RenderProps<TOperationType> | Promise<any>;
    next: <TOperationType extends OperationType>(
        environment: Environment,
        gqlQuery: GraphQLTaggedNode,
        variables?: TOperationType['variables'],
        options?: QueryOptionsOffline,
    ) => Promise<void>;
}

export interface QueryProps<T extends OperationType> extends QueryOptionsOffline {
    query: GraphQLTaggedNode;
    variables: T['variables'];
}

export type QueryOptionsOffline = QueryOptions & {
    networkCacheConfig?: CacheConfigTTL;
};

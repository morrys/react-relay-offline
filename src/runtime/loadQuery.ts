import { internalLoadQuery } from 'relay-hooks/lib/loadQuery';
import { QueryFetcher } from 'relay-hooks/lib/QueryFetcher';
import { OperationType, OperationDescriptor } from 'relay-runtime';
import { OfflineLoadQuery, OfflineRenderProps, QueryOptionsOffline } from '../RelayOfflineTypes';
import { Environment } from '@wora/relay-offline';

const queryExecute = <TOperationType extends OperationType = OperationType>(
    queryFetcher: QueryFetcher<TOperationType>,
    environment: Environment,
    query: OperationDescriptor,
    options: QueryOptionsOffline,
): OfflineRenderProps<TOperationType> => {
    const online = environment.isOnline();
    const rehydrated = environment.isRehydrated();
    if (!online) {
        options.fetchPolicy = 'store-only';
    }
    const data = queryFetcher.execute(environment, query, options, (environment, query) => environment.retain(query, { ttl: options.ttl }));
    return {
        ...data,
        online,
        rehydrated,
    };
};

export const loadLazyQuery = <TOperationType extends OperationType = OperationType>(): OfflineLoadQuery<TOperationType, Environment> => {
    return internalLoadQuery(true, queryExecute) as OfflineLoadQuery<TOperationType, Environment>;
};

export const loadQuery = <TOperationType extends OperationType = OperationType>(): OfflineLoadQuery<TOperationType, Environment> => {
    return internalLoadQuery(false, queryExecute) as OfflineLoadQuery<TOperationType, Environment>;
};

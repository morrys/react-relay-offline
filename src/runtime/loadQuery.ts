import { LoadQuery, RenderProps } from 'relay-hooks';
import { internalLoadQuery } from 'relay-hooks/lib/loadQuery';
import { QueryFetcher } from 'relay-hooks/lib/QueryFetcher';
import { OperationType, OperationDescriptor } from 'relay-runtime';
import { QueryOptionsOffline } from '../RelayOfflineTypes';
import { Environment } from '@wora/relay-offline';

const queryExecute = <TOperationType extends OperationType = OperationType>(
    queryFetcher: QueryFetcher<TOperationType>,
    environment: Environment,
    query: OperationDescriptor,
    options: QueryOptionsOffline,
): RenderProps<TOperationType> => {
    if (!environment.isOnline()) {
        options.fetchPolicy = 'store-only';
    }
    return queryFetcher.execute(environment, query, options, (environment, query) => environment.retain(query, { ttl: options.ttl }));
};

export const loadLazyQuery = <TOperationType extends OperationType = OperationType>(): LoadQuery<TOperationType, Environment> => {
    return internalLoadQuery(true, queryExecute);
};

export const loadQuery = <TOperationType extends OperationType = OperationType>(): LoadQuery<TOperationType, Environment> => {
    return internalLoadQuery(false, queryExecute);
};

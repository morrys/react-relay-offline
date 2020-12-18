import { OperationType } from 'relay-runtime';
import { OfflineLoadQuery } from '../RelayOfflineTypes';
import { usePreloadedQuery, RenderProps } from 'relay-hooks';

export const usePreloadedQueryOffline = <TOperationType extends OperationType = OperationType>(
    loadQuery: OfflineLoadQuery,
): RenderProps<TOperationType> => {
    return usePreloadedQuery(loadQuery);
};

import { OperationType } from 'relay-runtime';
import { OfflineLoadQuery, OfflineRenderProps } from '../RelayOfflineTypes';
import { usePreloadedQuery } from 'relay-hooks';

export const usePreloadedQueryOffline = <TOperationType extends OperationType = OperationType>(
    loadQuery: OfflineLoadQuery,
): OfflineRenderProps<TOperationType> => {
    return usePreloadedQuery(loadQuery) as OfflineRenderProps<TOperationType>;
};

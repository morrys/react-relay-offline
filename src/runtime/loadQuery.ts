import { GraphQLTaggedNode, OperationType, IEnvironment } from 'relay-runtime';
import { QueryOptionsOffline } from '../RelayOfflineTypes';
import { QueryFetcher } from 'relay-hooks/lib/QueryFetcher';
import { RenderProps, LoadQuery } from 'relay-hooks';

export const internalLoadQuery = <TOperationType extends OperationType = OperationType>(promise = false): LoadQuery<TOperationType> => {
    let queryFetcher = new QueryFetcher<TOperationType>();

    const dispose = (): void => {
        queryFetcher.dispose();
        queryFetcher = new QueryFetcher<TOperationType>();
    };

    const next = (
        environment,
        gqlQuery: GraphQLTaggedNode,
        variables: TOperationType['variables'] = {},
        options: QueryOptionsOffline = {},
    ): Promise<void> => {
        const online = environment.isOnline();
        const rehydrated = environment.isRehydrated();
        if (!online || !rehydrated) {
            options.fetchPolicy = 'store-only';
        }
        options.networkCacheConfig = options.networkCacheConfig ?? { force: true };
        queryFetcher.resolve(environment, gqlQuery, variables, options);
        const toThrow = queryFetcher.checkAndSuspense();
        return toThrow ? (toThrow instanceof Error ? Promise.reject(toThrow) : toThrow) : Promise.resolve();
    };

    const getValue = (environment?: IEnvironment): RenderProps<TOperationType> | null | Promise<any> => {
        queryFetcher.resolveEnvironment(environment);
        queryFetcher.checkAndSuspense(promise);
        return queryFetcher.getData();
    };

    const subscribe = (callback: () => any): (() => void) => {
        queryFetcher.setForceUpdate(callback);
        return (): void => {
            queryFetcher.setForceUpdate(() => undefined);
        };
    };
    return {
        next,
        subscribe,
        getValue,
        dispose,
    };
};

export const loadLazyQuery = <TOperationType extends OperationType = OperationType>(): LoadQuery<TOperationType> => {
    return internalLoadQuery(true);
};

export const loadQuery = <TOperationType extends OperationType = OperationType>(): LoadQuery<TOperationType> => {
    return internalLoadQuery(false);
};

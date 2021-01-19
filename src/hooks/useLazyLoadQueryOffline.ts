import { useRelayEnvironment, useLazyLoadQuery, STORE_ONLY, RenderProps } from 'relay-hooks';
import { OperationType, GraphQLTaggedNode } from 'relay-runtime';
import { QueryOptionsOffline } from '../RelayOfflineTypes';
import { Environment } from '@wora/relay-offline';

export const useLazyLoadQueryOffline = function <TOperationType extends OperationType>(
    gqlQuery: GraphQLTaggedNode,
    variables: TOperationType['variables'],
    options: QueryOptionsOffline = {},
): RenderProps<TOperationType> {
    const environment = useRelayEnvironment<Environment>();

    const rehydrated = environment.isRehydrated();

    const online = environment.isOnline();

    if (!rehydrated || !online) {
        options.fetchPolicy = STORE_ONLY;
    }

    const queryResult = useLazyLoadQuery(gqlQuery, variables, options);

    if (!rehydrated) {
        const promise = environment
            .hydrate()
            .then(() => undefined)
            .catch((error) => {
                throw error; //
            });
        if (!queryResult.data) {
            throw promise;
        }
    }
    return queryResult;
};

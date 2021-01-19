import { useQuery, useRelayEnvironment, STORE_ONLY, RenderProps } from 'relay-hooks';
import { OperationType, GraphQLTaggedNode } from 'relay-runtime';
import { QueryOptionsOffline } from '../RelayOfflineTypes';
import { useForceUpdate } from 'relay-hooks/lib/useForceUpdate';
import { Environment } from '@wora/relay-offline';

export const useQueryOffline = function <TOperationType extends OperationType>(
    gqlQuery: GraphQLTaggedNode,
    variables: TOperationType['variables'],
    options: QueryOptionsOffline = {},
): RenderProps<TOperationType> {
    const environment = useRelayEnvironment<Environment>();

    const rehydrated = environment.isRehydrated();

    const forceUpdate = useForceUpdate();

    const online = environment.isOnline();

    if (!rehydrated || !online) {
        options.fetchPolicy = STORE_ONLY;
    }

    const queryResult = useQuery(gqlQuery, variables, options);

    if (!rehydrated) {
        environment
            .hydrate()
            .then(() => {
                if (!queryResult.data) {
                    forceUpdate();
                }
            })
            .catch((error) => {
                throw error; //
            });
    }
    return queryResult;
};

import { loadQuery as loadQueryHooks, loadLazyQuery as loadLazyQueryHooks, QueryOptions } from 'relay-hooks';
import { OperationType, GraphQLTaggedNode } from 'relay-runtime';
import { LoadQuery } from 'relay-hooks/lib/loadQuery';

const internalLoadQuery = <TOperationType extends OperationType = OperationType>(
    loadQuery: LoadQuery<TOperationType>,
): LoadQuery<TOperationType> => {
    const originalNext = loadQuery.next;
    // eslint-disable-next-line space-before-function-paren
    loadQuery.next = function (
        environment,
        gqlQuery: GraphQLTaggedNode,
        variables: TOperationType['variables'] = {},
        options: QueryOptions = {},
    ): Promise<void> {
        if (!environment.isOnline()) {
            options.fetchPolicy = 'store-only';
        }
        return originalNext.apply(this, [environment, gqlQuery, variables, options]);
    };
    return loadQuery;
};

export const loadLazyQuery = <TOperationType extends OperationType = OperationType>(): LoadQuery<TOperationType> => {
    return internalLoadQuery(loadLazyQueryHooks());
};

export const loadQuery = <TOperationType extends OperationType = OperationType>(): LoadQuery<TOperationType> => {
    return internalLoadQuery(loadQueryHooks());
};

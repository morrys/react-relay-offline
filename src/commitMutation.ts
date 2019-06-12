import { Environment, Disposable } from 'relay-runtime/lib/RelayStoreTypes';
import { MutationConfig, resolveMutation, executeOnline, executeOffline } from './hooks/useMutation';

function commitMutation<T>(
    environment: Environment,
    config: MutationConfig<T>,
): Disposable {
    const resolver = resolveMutation(environment, config);
    if (environment.isOnline()) {
        return executeOnline(environment, config, resolver);
    } else {
        return executeOffline(environment, config, resolver);
    }
}

export default commitMutation;
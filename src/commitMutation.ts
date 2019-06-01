import { Environment } from 'relay-runtime/lib/RelayStoreTypes';
import { MutationConfig, resolveMutation, executeOnline, executeOffline } from './hooks/useMutation';

function commitMutation<T>(
    environment: Environment,
    config: MutationConfig<T>,
) {
    const resolver = resolveMutation(environment, config);
    if (environment.isOnline()) {
        executeOnline(environment, config, resolver);
    } else {
        executeOffline(environment, config, resolver);
    }
}

export default commitMutation;
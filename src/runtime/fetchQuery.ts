import { fetchQuery as relayFetchQuery } from 'react-relay';
import { OperationType } from 'relay-runtime';

/**
 * https://github.com/facebook/relay/commit/c925281a609db199986bc9625d958f516642e95d#diff-391b381e9c777ee38b225619a38e1c1d
 * For the moment the types are not explicit because it seems that in the next relay version there will be some important changes
 */

async function fetchQuery<T extends OperationType>(...args): Promise<T['response']> {
    const [environment] = args;

    if (!environment.isRehydrated()) {
        await environment.hydrate();
    }

    return relayFetchQuery(...args);
}

export default fetchQuery;

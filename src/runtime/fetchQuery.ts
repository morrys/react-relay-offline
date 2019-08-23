import { fetchQuery as relayFetchQuery } from 'react-relay'

/**
 * https://github.com/facebook/relay/commit/c925281a609db199986bc9625d958f516642e95d#diff-391b381e9c777ee38b225619a38e1c1d
 * For the moment the types are not explicit because it seems that in the next relay version there will be some important changes
 */

async function fetchQuery(...args) {
    const [environment] = args

    if (!environment.isRestored()) {
        await environment.restore()
    }

    return relayFetchQuery(...args)
}

export default fetchQuery;
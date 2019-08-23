import { fetchQuery as relayFetchQuery } from 'react-relay'

async function fetchQuery(...args) {
    const [environment] = args

    if (!environment.isRestored()) {
        await environment.restore()
    }

    return relayFetchQuery(...args)
}

export default fetchQuery;
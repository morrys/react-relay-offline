import { applyMiddleware, createStore, compose, combineReducers, Store, Action, AnyAction } from 'redux';
import { offline } from '@redux-offline/redux-offline';
import defaultOfflineConfig from '@redux-offline/redux-offline/lib/defaults';
import { PERSIST_REHYDRATE } from "@redux-offline/redux-offline/lib/constants";
import thunk from 'redux-thunk';
import { OfflineAction } from '@redux-offline/redux-offline/lib/types';
import { ThunkAction } from "redux-thunk";
import createIdbStorage from './db';
export type OfflineCallback = (err: any, success: any) => void;
export const NORMALIZED_CACHE_KEY = 'relay';
export const NORMALIZED_ROOTS_KEY = 'relay-roots';
export const NORMALIZED_OFFLINE = 'offline';
export const WRITE_CACHE_ACTION = 'RELAY_WRITE_CACHE';
export const WRITE_ROOT_ACTION = 'RELAY_WRITE_ROOT';

const BASE_TIME_MS = 100;
const JITTER_FACTOR = 100;
const MAX_DELAY_MS = 5 * 60 * 1000;

const getDelay = count => ((2 ** count) * BASE_TIME_MS) + (JITTER_FACTOR * Math.random());
const getEffectDelay = (_action: OfflineAction, retries: number) => {
    const delay = getDelay(retries);

    return delay <= MAX_DELAY_MS ? delay : null;
};

type AppState = {
    offline: {
        online: boolean,
        outbox: any[]
    },
}

export const writeThunk:
    (type: string, payload: any) => ThunkAction<Action, RelayCache, null, AnyAction> =
    (type, payload) => (dispatch, _getState) => dispatch({
        type,
        payload,
    });

export interface RelayCache extends AppState {
    rehydrated: boolean,
    [NORMALIZED_CACHE_KEY]: any,
    [NORMALIZED_ROOTS_KEY]: any,
}

const cacheReducer = () => ({
    [NORMALIZED_CACHE_KEY]: (state = {}, action) => {
        const { type, payload: normCache } = action;
        switch (type) {
            case WRITE_CACHE_ACTION:
                return {
                    ...normCache
                };
            default:
                return state;
        }
    }
});

const rootsReducer = () => ({
    [NORMALIZED_ROOTS_KEY]: (state = {}, action) => {
        const { type, payload: normCache } = action;
        switch (type) {
            case WRITE_ROOT_ACTION:
                return {
                    ...normCache
                };
            default:
                return state;
        }
    }
});



const { detectNetwork } = defaultOfflineConfig;
const persistDefaultOptions = typeof window !== 'undefined' ? {
    key: NORMALIZED_ROOTS_KEY,
    storage: createIdbStorage(),
    serialize: false, // Data serialization is not required and helps allows DevTools to inspect storage value

} : {
        whitelist: [
            NORMALIZED_CACHE_KEY,
            NORMALIZED_ROOTS_KEY,
            NORMALIZED_OFFLINE,
        ]
    }

const newStore = (network, persistOptions= persistDefaultOptions, persistCallback = () => null,
    callback: OfflineCallback = () => { }, ): Store<RelayCache> => {

    const store = createStore(
        combineReducers({
            rehydrated: (state = false, action) => {
                switch (action.type) {
                    case PERSIST_REHYDRATE:
                        return true;
                    default:
                        return state;
                }
            },
            ...cacheReducer(),
            ...rootsReducer(),
        }),
        typeof window !== 'undefined' && (window as any).__REDUX_DEVTOOLS_EXTENSION__ && (window as any).__REDUX_DEVTOOLS_EXTENSION__(),
        compose(
            applyMiddleware(thunk),
            offline({
                ...defaultOfflineConfig,
                retry: getEffectDelay,
                persistCallback: () => {
                    persistCallback();
                },
                persistOptions: persistOptions,
                effect: (effectPayload, action) => effect(
                    effectPayload,
                    action,
                    store,
                    network,
                    callback,
                    detectNetwork
                ),
                discard: (error, action, retries) => discard(callback, error, action, retries),
            })
        )
    );

    return store;
};

const effect = async (effect, action: OfflineAction, store, network, callback, offlineStatusChangeCallbackCreator: any) => {
    if (action && action.type === 'ENQUEUE_OFFLINE_MUTATION') {

        const operation = effect.request.operation;
        //TODO remove retry if present
        const source = await network.execute(
            operation.node.params,
            operation.variables,
            { force: true },
            null,
        );
        return source;
    }
    return false;
};

const discard = (callback: OfflineCallback, error, action, retries) => {
    const discardResult = _discard(error, action, retries);

    if (discardResult) {
        if (typeof callback === 'function') {
            tryFunctionOrLogError(() => {
                callback({ error }, null);
            });
        }
    }

    return discardResult;
}

function tryFunctionOrLogError(f: Function) {
    try {
        return f();
    } catch (e) {
        if (console.error) {
            console.error(e);
        }
    }
}

const _discard = (error, action: OfflineAction, retries) => {
    const { graphQLErrors = [] }: { graphQLErrors } = error;

    if (graphQLErrors.length) {
        //logger('Discarding action.', action, graphQLErrors);

        return true;
    } /*else { //TODO AppSync
        const { networkError: { graphQLErrors = [] } = { graphQLErrors: [] } } = error;
        const appSyncClientError = graphQLErrors.find(err => err.errorType && err.errorType.startsWith('AWSAppSyncClient:'));

        if (appSyncClientError) {
            return true;
        }
    }*/

    return error.permanent || retries > 10;
};




export default newStore;
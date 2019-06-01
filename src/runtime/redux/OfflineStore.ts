import { applyMiddleware, createStore, compose, combineReducers, Store, Action, AnyAction, ReducersMapObject } from 'redux';
import { offline } from '@redux-offline/redux-offline';
import defaultOfflineConfig from '@redux-offline/redux-offline/lib/defaults';
import { PERSIST_REHYDRATE } from "@redux-offline/redux-offline/lib/constants";
import thunk from 'redux-thunk';
import { OfflineAction } from '@redux-offline/redux-offline/lib/types';
import { ThunkAction } from "redux-thunk";
import RelayModernEnvironment from '../RelayModernEnvironment';
export type OfflineCallback = (type: string, payload: any, error: any) => void;
export const NORMALIZED_OFFLINE = 'offline';
export const NORMALIZED_DETECTED = 'detected';
export const NORMALIZED_REHYDRATED = 'rehydrated';
export const WRITE_DETECTED_NETWORK = 'RELAY_DETECTED_NETWORK';

const KEY_PREFIX_PERSIT = 'relayPersist:';

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
}

export interface PersistOptions {
    storage?: any,
    keyPrefix?: string,
    customWhitelist?: string[],
    serialize?: boolean,
    customReducers?: ReducersMapObject
}



class StoreOffline {

    private _base_time_ms = 100;
    private _factor = 100;
    private _max_delay = 5 * 60 * 1000;

    public static create(environment: RelayModernEnvironment, persistOptions: PersistOptions = {},
        persistCallback = () => null,
        callback: OfflineCallback = () => { }, ): Store<RelayCache> {

        const storeOffline = new StoreOffline(persistOptions.storage, persistOptions.keyPrefix, persistOptions.customWhitelist, persistOptions.serialize, persistOptions.customReducers);
        const { detectNetwork } = defaultOfflineConfig;

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
                detected: (state = false, action) => {
                    switch (action.type) {
                        case WRITE_DETECTED_NETWORK:
                            return true;
                        default:
                            return state;
                    }
                },
            }),
            typeof window !== 'undefined' && (window as any).__REDUX_DEVTOOLS_EXTENSION__ && (window as any).__REDUX_DEVTOOLS_EXTENSION__(),
            compose(
                applyMiddleware(thunk),
                offline({
                    ...defaultOfflineConfig,
                    detectNetwork: callback => {
                        detectNetwork(online => {
                            callback(online);
                            store.dispatch(writeThunk(WRITE_DETECTED_NETWORK, true) as any as Action);
                        });
                    },
                    retry: storeOffline.getEffectDelay,
                    persistCallback: () => {
                        persistCallback();
                    },
                    persistOptions: {
                        ...storeOffline.getPersistOptions()
                    },
                    effect: (effectPayload, action) => storeOffline.effect(
                        effectPayload,
                        action,
                        store,
                        environment,
                        callback,
                        detectNetwork
                    ),
                    discard: (error, action, retries) => storeOffline.discard(callback, error, action, retries),
                })
            )
        );

        return store;

    }


    private _storage: any;
    private _keyPrefix: string;
    private _whitelist: string[]
    private _serialize: boolean;
    private _reducers: ReducersMapObject;

    constructor(storage?: any,
        keyPrefix: string = KEY_PREFIX_PERSIT,
        customWhitelist: string[] = [],
        serialize: boolean = true,
        customReducers?: ReducersMapObject) {
        this._storage = storage;
        this._keyPrefix = keyPrefix;
        this._whitelist = customWhitelist;
        this._serialize = serialize;
        this._reducers = customReducers;
    }

    public getPersistOptions(): { [key: string]: any; } {
        return {
            ...(this._storage && { storage: this._storage }),
            keyPrefix: this._keyPrefix,
            serialize: this._serialize,
            whitelist: [
                NORMALIZED_OFFLINE,
            ].concat(this._whitelist)
        }
    }

    public getCustomReducers(): ReducersMapObject {
        return {
            ...this._reducers
        }
    }

    private getDelay = count => ((2 ** count) * this._base_time_ms) + (this._factor * Math.random());

    private getEffectDelay = (_action: OfflineAction, retries: number) => {
        const delay = this.getDelay(retries);

        return delay <= this._max_delay ? delay : null;
    };

    public effect = async (effect, action: OfflineAction, store, environment, callback, offlineStatusChangeCallbackCreator: any) => {
        if (action && action.type === 'ENQUEUE_OFFLINE_MUTATION') {

            const operation = effect.request.operation;
            const uploadables = effect.request.uploadables;
            const optimisticResponse = effect.request.optimisticResponse;
            //TODO remove retry if present
            const errors = [];
            const source = environment.executeMutationOffline({
                    operation,
                    optimisticResponse,
                    uploadables,
                  }
            ).subscribe({
                next: payload => {
                  if (payload.errors) {
                    errors.push(...payload.errors);
                  }
                  if(callback) {
                    callback("next", payload, errors.length !== 0 ? errors : null);
                  }
                },
                complete: () => {
                  if (callback) {
                    const snapshot = environment.lookup(operation.fragment, operation);
                    callback(
                        'complete',
                      (snapshot.data as any),
                      errors.length !== 0 ? errors : null,
                    );
                  }
                },
                error: (error, isUncaughtThrownError?: boolean) => callback('error', error, isUncaughtThrownError),
              });
            return source;
        }
        return false;
    };

    public discard = (callback: OfflineCallback, error, action, retries) => {
        const discardResult = this._discard(error, action, retries);

        if (discardResult) {
            if (typeof callback === 'function') {
                this.tryFunctionOrLogError(() => {
                    callback('discard', { error }, null);
                });
            }
        }

        return discardResult;
    }

    private tryFunctionOrLogError(f: Function) {
        try {
            return f();
        } catch (e) {
            if (console.error) {
                console.error(e);
            }
        }
    }

    private _discard = (error, action: OfflineAction, retries) => {
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

}

export default StoreOffline;
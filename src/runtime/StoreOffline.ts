import Cache, { CacheOptions } from "@wora/cache-persist";
import { v4 as uuid } from "uuid";
import { Disposable, Network, } from 'relay-runtime/lib/RelayStoreTypes';
import RelayModernEnvironment from './RelayModernEnvironment';

type Subscription = {
    callback: (state) => void,
};

export type OfflineOptions = {
    manualExecution?: boolean;
    network?: Network;
    onComplete?: (options: {id: string, offlinePayload: any, snapshot: any}) => boolean;
    onDiscard?: (options: {id: string, offlinePayload: any, error: any}) => boolean;
    //onDispatch?: (request: any) => any;
}

class RelayStoreOffline {

    private _cache: Cache;
    private _subscriptions: Set<Subscription> = new Set();
    private _busy: boolean = false;
    private _environment: any;
    private _offlineOptions: OfflineOptions;

    constructor(environment: RelayModernEnvironment, persistOptions: CacheOptions = {}, offlineOptions?: OfflineOptions, ) {

        const persistOptionsStoreOffline = {
            prefix: 'relay-offline',
            serialize: true,
            ...persistOptions,
        };

        const cache = new Cache(persistOptionsStoreOffline);
        this._cache = cache;
        this._environment = environment;
        this._offlineOptions = {
            network: this._environment._network,
            onComplete: (options: any) => { return true },
            onDiscard: (options: any) => { return true },
            //onDispatch: (request: any) => undefined,
        }
        if (offlineOptions) {
            this._offlineOptions = {
                ...this._offlineOptions,
                ...offlineOptions
            }

        }

    }

    public restore(): Promise<Cache> {
        return this._cache.restore().then(cache => {
            this.notify();
            return cache;
        });
    }

    public dispatch(request) {
        //const { onDispatch } = this._offlineOptions;
        const fetchTime = Date.now();
        const id = uuid();
        const promiseSet = this._cache.set(id, { request, fetchTime });//, extra: onDispatch(request) });
        this.notify();
        return promiseSet;
    }

    public subscribe(
        callback: (state) => void,
    ): Disposable {
        const subscription = { callback };
        const dispose = () => {
            this._subscriptions.delete(subscription);
        };
        this._subscriptions.add(subscription);
        return dispose;
    }

    public notify(): void {
        this._subscriptions.forEach(subscription => {
            subscription.callback(this._cache.getState());
        });
    }

    public getListMutation(): ReadonlyArray<any> {
        const requests = Object.assign({}, this._cache.getState());
        return Object.entries(requests).sort(([, v1], [, v2]) => v1.fetchTime - v2.fetchTime).map(item => { return { id: item[0], payload: requests[item[0]] } });
    }


    public execute() {

        if (!this._busy) {
            this._busy = true;
            const requestOrderer: ReadonlyArray<any> = this.getListMutation();
            for (const request of requestOrderer) {
                this.executeMutation(request.id, request.payload)
            }
            this._busy = false;


        }
    }

    async discardMutation(id, payload) {
        const { request } = payload;
        const backup = request.backup;
        await this._cache.remove(id);
        this._environment.getStore().publish(backup);
        this._environment.getStore().notify();
    }

    async executeMutation(id, payload) {
        const { network, onComplete, onDiscard } = this._offlineOptions;
        const { request } = payload;
        const operation = request.operation;
        const uploadables = request.uploadables;
        const source = network.execute(
            operation.node.params,
            operation.variables,
            { force: true },
            uploadables,
        ).subscribe({
            complete: () => {
                const snapshot = this._environment.lookup(operation.fragment, operation);
                if (onComplete( {id, offlinePayload: payload, snapshot: (snapshot.data as any) }) ) {
                    this._cache.remove(id);
                }
            },
            error: (error, isUncaughtThrownError?: boolean) => {
                if (onDiscard({id, offlinePayload: payload, error }))
                    this.discardMutation(id, payload);
            },
            /*next: response => {
                if (this._callback) {
                    this._callback("next", response, null);
                }
            },
            start: subscription => this._callback(
                'start',
                subscription,
                null,
            ),*/
        });
        /*const source = environment.executeMutationOffline({
                operation,
                optimisticResponse,
                uploadables,
              }
        ).subscribe({
            
            
            
          });*/
        return source;
    }

}


export default RelayStoreOffline;
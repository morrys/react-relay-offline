import Cache, { CacheOptions } from "@wora/cache-persist";
import { v4 as uuid } from "uuid";
import {
    MutableRecordSource,
    Scheduler,
    ReaderSelector,
    NormalizationSelector,
    OperationLoader,
    OperationDescriptor,
    UpdatedRecords,
    Disposable,
    Snapshot,
} from 'relay-runtime/lib/RelayStoreTypes';
import RelayModernEnvironment from './RelayModernEnvironment';

type Subscription = {
    callback: (state) => void,
};

class RelayStoreOffline {

    private _cache: Cache;
    private _subscriptions: Set<Subscription> = new Set();
    private _busy: boolean = false;
    private _environment: any;
    private _callback:any;

    constructor(environment: RelayModernEnvironment, callback, persistOptions: CacheOptions = {}, ) {

        const persistOptionsStoreOffline = {
            prefix: 'relay-offline',
            serialize: true,
            ...persistOptions,
        };

        const cache = new Cache(persistOptionsStoreOffline);
        this._cache = cache;
        this._environment = environment;
        this._callback = callback;

    }

    restore(): Promise<Cache> {
        return this._cache.restore().then(cache => {
            this.notify();
            return cache;
        });
    }

    dispatch(request) {
        const fetchTime = Date.now();
        const id = uuid();
        const promiseSet = this._cache.set(id, { request, fetchTime });
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

    getListMutation(): ReadonlyArray<any> {
        const requests = Object.assign({}, this._cache.getState());
        return Object.entries(requests).sort(([,v1], [,v2]) => v1.fetchTime - v2.fetchTime).map(item => {return {id: item[0], payload: requests[item[0]] }});
    }


    execute() {
        
        if(!this._busy) {
            this._busy = true;
            const requestOrderer: ReadonlyArray<any> =  this.getListMutation();
            for (const request of requestOrderer) {
                this.executeMutation(request.id, request.payload)
            }
            this._busy = false;

            
        }
    }

    async executeMutation(id, payload) {
        const { request } = payload;
        const operation = request.operation;
            const uploadables = request.uploadables;
            const optimisticResponse = request.optimisticResponse;
            //TODO remove retry if present
            const errors = [];
            const source = this._environment._network.execute(
                operation.node.params,
                operation.variables,
                {force: true},
                uploadables,
              ).subscribe({
                complete: () => {
                    if (this._callback) {
                        this._cache.remove(id);
                      const snapshot = this._environment.lookup(operation.fragment, operation);
                      this._callback(
                          'complete',
                        (snapshot.data as any),
                        errors.length !== 0 ? errors : null,
                      );
                    }
                  },
                error: (error, isUncaughtThrownError?: boolean) => this._callback('error', error, isUncaughtThrownError),
                next: response => {
                    if(this._callback) {
                        this._callback("next", response, null);
                    }
                  },
                start: subscription => this._callback(
                    'start',
                    subscription,
                     null,
                ),
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
import { Environment, Observable as RelayObservable, GraphQLResponse } from 'relay-runtime';

import { EnvironmentConfig } from 'relay-runtime/lib/RelayModernEnvironment';

import Store from './Store';
import { CacheOptions } from "@wora/cache-persist";

import { NetInfo } from "@wora/detect-network";

import {
  NormalizationSelector,
  Disposable,
} from 'relay-runtime/lib/RelayStoreTypes';

import StoreOffline from "./StoreOffline";

export type OfflineCallback = (type: string, payload: any, error: any) => void;

class RelayModernEnvironment extends Environment {

  private _isRestored: boolean;
  private _storeOffline: StoreOffline;
  private _isOnline: boolean;

  constructor(config: EnvironmentConfig,
    callback: OfflineCallback = () => { },
    persistOptions: CacheOptions = {},
    persistCallback = () => null,
  ) {
    super(config);
    this._storeOffline = new StoreOffline(this, callback, persistOptions);
    //this._storeOffline = StoreOffline.create(this, persistOptions, persistCallback, callback);
  }

  public restore(): Promise<boolean> {
    if (this._isRestored) {
      return Promise.resolve(true);
    }
    NetInfo.isConnected.addEventListener('connectionChange', isConnected => {
      this._isOnline = isConnected;
      if(isConnected) {
        this._storeOffline.execute();
      }
    });
    ;
    return Promise.all([NetInfo.isConnected.fetch(), this._storeOffline.restore(),
      ((this as any)._store as Store).restore(this),
    ]).then(result => {
      const isConnected = result[0];
      this._isOnline = isConnected;
      this._isRestored = true;
      return true;
    }).catch(error => {
      this._isRestored = false;
      throw error;
    })
  }

  public isRestored(): boolean {
    return this._isRestored;
  }

  public isRehydrated() {
    return this._isRestored;// && this._storeOffline.getState()[NORMALIZED_REHYDRATED];
  }

  public isOnline() {
    return this._isOnline;
  }

  public getStoreOffline() {
    return this._storeOffline;
  }

  public retain(selector: NormalizationSelector, execute: boolean = true): Disposable {
    return (this as any)._store.retain(selector, execute);
  }

  public executeMutationOffline({
    operation,
    optimisticResponse,
    optimisticUpdater,
    updater,
    uploadables,
  }): RelayObservable<GraphQLResponse> {
    return super.executeMutation({
      operation,
      optimisticResponse,
      optimisticUpdater,
      updater,
      uploadables,
    });
  }


  /*public executeMutation({
    operation,
    optimisticResponse,
    optimisticUpdater,
    updater,
    uploadables,
  }): RelayObservable<GraphQLResponse> {
    if (this.isOnline()) {
      return super.executeMutation({
        operation,
        optimisticResponse,
        optimisticUpdater,
        updater,
        uploadables,
      })
    } else {
      return RelayObservable.create(sink => {
        let optimisticUpdate;
        if (optimisticResponse || optimisticUpdater) {
          optimisticUpdate = {
            operation: operation,
            selectorStoreUpdater: optimisticUpdater,
            response: optimisticResponse || null,
          };
        }
        if (optimisticUpdate != null) {
          //TODO fix type
          (this as any)._publishQueue.applyUpdate(optimisticUpdate);
          (this as any)._publishQueue.run();
        }
        const fetchTime = Date.now();
        const id = uuid();
        this._storeOffline.dispatch({
          type: actions.ENQUEUE,
          payload: { optimisticResponse },
          meta: {
            offline: {
              effect: {
                request: {
                  operation,
                  optimisticResponse,
                  uploadables
                },
                fetchTime: fetchTime,
                id: id
              },
              commit: { type: actions.COMMIT },
              rollback: { type: actions.ROLLBACK },
            }
          }
        });

        return () => null
      });
    }

  }*/



}


export default RelayModernEnvironment;
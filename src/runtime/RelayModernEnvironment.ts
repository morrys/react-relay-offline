import { Environment, Observable as RelayObservable, GraphQLResponse } from 'relay-runtime';

import { EnvironmentConfig } from 'relay-runtime/lib/RelayModernEnvironment';

import Store from './Store';
import { Store as StoreRedux } from 'redux';

import NetInfo from "../detect/NetInfo";

import {
  NormalizationSelector,
  Disposable,
} from 'relay-runtime/lib/RelayStoreTypes';

import StoreOffline, { NORMALIZED_OFFLINE, NORMALIZED_REHYDRATED, NORMALIZED_DETECTED, RelayCache, PersistOptions, OfflineCallback } from './redux/OfflineStore';

class RelayModernEnvironment extends Environment {

  private _isRestored: boolean;
  private _storeOffline: StoreRedux<RelayCache>;
  private _isOnline: boolean;

  constructor(config: EnvironmentConfig,
    callback: OfflineCallback = () => { },
    persistOptions: PersistOptions = {},
    persistCallback = () => null,
  ) {
    super(config);
    this._storeOffline = StoreOffline.create(this, persistOptions, persistCallback, callback);
  }

  public restore(): Promise<boolean> {
    if (this._isRestored) {
      return Promise.resolve(true);
    }
    NetInfo.isConnected.addEventListener('connectionChange', state => {
      console.log("Connection state", state);
      console.log("Connection type", state.type);
      console.log("Is connected?", state.isConnected);
      this._isOnline = state.isConnected;
    });
    ;
    return Promise.all([((this as any)._store as Store).restore(this._storeOffline),
    NetInfo.isConnected.fetch()]).then(result => {
      console.log("Environment", result);
      const isConnected = result[1];
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
    return this._isRestored && this._storeOffline.getState()[NORMALIZED_REHYDRATED];
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
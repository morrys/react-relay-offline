import { Environment, Observable as RelayObservable, GraphQLResponse } from 'relay-runtime';

import { EnvironmentConfig } from 'relay-runtime/lib/RelayModernEnvironment';

import Store from './Store';
import { CacheOptions } from "@wora/cache-persist";

import { NetInfo } from "@wora/detect-network";

import {
  NormalizationSelector,
  Disposable,
} from 'relay-runtime/lib/RelayStoreTypes';

import StoreOffline, { OfflineOptions } from "./StoreOffline";



class RelayModernEnvironment extends Environment {

  private _isRestored: boolean;
  private _storeOffline: StoreOffline;
  private _isOnline: boolean;
  private _manualExecution: boolean = false;

  constructor(config: EnvironmentConfig,
    offlineOptions: OfflineOptions,
    persistOfflineOptions: CacheOptions = {},
  ) {
    super(config);
    this._manualExecution = offlineOptions && offlineOptions.manualExecution;
    this._storeOffline = new StoreOffline(this, persistOfflineOptions, offlineOptions);
    //this._storeOffline = StoreOffline.create(this, persistOptions, persistCallback, callback);
  }

  public clearCache(): Promise<boolean> {
    return Promise.all([((this as any)._store as Store).purge(),
    ]).then(result => {
      return true;
    });

  }

  public restore(): Promise<boolean> {
    if (this._isRestored) {
      return Promise.resolve(true);
    }
    NetInfo.isConnected.addEventListener('connectionChange', isConnected => {
      this._isOnline = isConnected;
      if(isConnected && !this._manualExecution) {
        this._storeOffline.execute();
      }
    });
    ;
    return Promise.all([NetInfo.isConnected.fetch(), this._storeOffline.restore(),
      ((this as any)._store as Store).restore(this),
    ]).then(result => {
      const isConnected = result[0];
      this._isOnline = isConnected;
      if(isConnected && !this._manualExecution) {
        this._storeOffline.execute();
      }
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


  public executeMutation(mutationOptions): RelayObservable<GraphQLResponse> {
    if (this.isOnline()) {
      return super.executeMutation(mutationOptions)
    } else {
      return RelayObservable.create(sink => {
          this._storeOffline.publish(this, mutationOptions).subscribe({
            complete: () => sink.complete(),
            error: error => sink.error(error),
            next: response => sink.next(response)
          });
        return () => { };
      });
    }

  }



}


export default RelayModernEnvironment;
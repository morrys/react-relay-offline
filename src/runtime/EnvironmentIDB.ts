import { CacheStorage, CacheOptions } from "@wora/cache-persist";
import IDBStorage from '@wora/cache-persist/lib/idbstorage';
import { EnvironmentConfig } from 'relay-runtime/lib/RelayModernEnvironment';
import Store from "./Store";
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
import RelayModernEnvironment, { OfflineCallback } from "./RelayModernEnvironment";

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
type EnvironmentOfflineConfig = Omit<EnvironmentConfig, "store">; // Equivalent to: {b: number, c: boolean}


class EnvironmentIDB {

    public static create(config: EnvironmentOfflineConfig,
        callback: OfflineCallback = () => { },
        persistCallback = () => null,
        persistOptions: CacheOptions = {},
        gcScheduler?: Scheduler,
        operationLoader?: OperationLoader,
        ttl?: number,
         ): RelayModernEnvironment {
        let idbStore: CacheOptions;  
        let idbRecords: CacheOptions; 
        let idbOffline: CacheOptions;   
        const serialize: boolean = persistOptions.serialize; 
        if (typeof window !== 'undefined') {
            const idbStorages: CacheStorage[] = IDBStorage.create(name || "relay", ["store", "records", "redux"]);

            idbStore = {
                ...persistOptions,
                storage: idbStorages[0],
                serialize: serialize || false,
            }

            idbRecords = {
                storage: idbStorages[1],
                serialize: serialize || false,
            }

            idbOffline = {
                storage: idbStorages[2],
                serialize: serialize || false,
            }
        }
        const store = new Store(idbStore, idbRecords, gcScheduler, operationLoader, ttl);
        return new RelayModernEnvironment({...config, store}, callback, idbOffline, persistCallback)
    }
}

export default EnvironmentIDB;
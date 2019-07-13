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
import RelayModernEnvironment from "./RelayModernEnvironment";
import { OfflineOptions, Payload } from "./OfflineFirstRelay";

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
type EnvironmentOfflineConfig = Omit<EnvironmentConfig, "store">; // Equivalent to: {b: number, c: boolean}


class EnvironmentIDB {

    public static create(config: EnvironmentOfflineConfig,
        offlineOptions: OfflineOptions<Payload>,
        storeOptions: {
            persistOptions?: CacheOptions,
            gcScheduler?: Scheduler,
            operationLoader?: OperationLoader,
            ttl?: number,
        } = {},
         ): RelayModernEnvironment {

        const persistOptions = {
            ...storeOptions.persistOptions,

        } 
        let idbStore: CacheOptions;  
        let idbRecords: CacheOptions; 
        let idbOffline: CacheOptions;   
        const serialize: boolean = persistOptions.serialize; 
        const prefix: string = persistOptions.prefix; 
        if (typeof window !== 'undefined') {
            const idbStorages: CacheStorage[] = IDBStorage.create(prefix || "relay", ["store", "records", "redux"]);

            idbStore = {
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
        const store = new Store(storeOptions.ttl, idbStore, idbRecords, storeOptions.gcScheduler, storeOptions.operationLoader);
        return new RelayModernEnvironment({...config, store}, offlineOptions, idbOffline);
    }
}

export default EnvironmentIDB;
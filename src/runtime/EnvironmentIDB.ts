import Cache, { CacheStorage, CacheOptions } from "cache-persist";
import IDBStorage from 'cache-persist/lib/idbstorage';
import { EnvironmentConfig } from 'relay-runtime/lib/RelayModernEnvironment';
import Store from "./Store";
import createIdbStorage from './redux/indexeddb/db';
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
import { PersistOptions } from "./redux/OfflineStore";

interface StoreIDBOptions {
    serialize: boolean,
    name: string,
}

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
type EnvironmentOfflineConfig = Omit<EnvironmentConfig, "store">; // Equivalent to: {b: number, c: boolean}


class EnvironmentIDB {

    public static create(config: EnvironmentOfflineConfig,
        persistOptions: PersistOptions = {},
        gcScheduler?: Scheduler,
        operationLoader?: OperationLoader,
        ttl?: number,
         ): RelayModernEnvironment {
        let idbStore: CacheOptions;  
        let idbRecords: CacheOptions; 
        let idbOffline: PersistOptions;   
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
                storage: createIdbStorage(idbStorages[2].getStorage(), "redux"),
                serialize: serialize || false,
            }
        }
        const store = new Store(idbStore, idbRecords, gcScheduler, operationLoader, ttl);
        return new RelayModernEnvironment({...config, store}, idbOffline)
    }
}

export default EnvironmentIDB;
/*
import { Store } from 'redux';
import { Network } from 'relay-runtime/lib/RelayStoreTypes';
import createIdbStorage from './indexeddb/db';
import StoreOffline, { PersistOptions, RelayCache, OfflineCallback } from './OfflineStore';
import RelayModernEnvironment from '../RelayModernEnvironment';

class StoreOfflineIDB {

    public static create(environment: RelayModernEnvironment, persistOptions: PersistOptions = {},
        persistCallback = () => null,
        callback: OfflineCallback = () => { }, ): Store<RelayCache> {
        if (typeof window !== 'undefined') {
            persistOptions.storage = createIdbStorage();
            persistOptions.serialize = false;
        }
        return StoreOffline.create(environment, persistOptions, persistCallback, callback);
    }
}

//TODO da modificare a StoreOffline quando passo alla versione 1.0.0
export default StoreOfflineIDB.create;*/
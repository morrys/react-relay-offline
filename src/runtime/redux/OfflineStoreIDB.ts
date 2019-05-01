import { Store } from 'redux';
import { Network } from 'relay-runtime/lib/RelayStoreTypes';
import createIdbStorage from './indexeddb/db';
import StoreOffline, { PersistOptions, RelayCache, OfflineCallback } from './OfflineStore';

class StoreOfflineIDB {

    public static create(network: Network, persistOptions: PersistOptions = {},
        persistCallback = () => null,
        callback: OfflineCallback = () => { }, ): Store<RelayCache> {
        if (typeof window !== 'undefined') {
            persistOptions.storage = createIdbStorage();
            persistOptions.serialize = false;
        }
        return StoreOffline(network, persistOptions, persistCallback, callback);
    }
}

//TODO da modificare a StoreOffline quando passo alla versione 1.0.0
export default StoreOfflineIDB.create;
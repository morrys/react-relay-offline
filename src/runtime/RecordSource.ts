import { Store, Action } from 'redux';
import {Record} from 'relay-runtime/lib/RelayCombinedEnvironmentTypes';
import * as RelayRecordState from 'relay-runtime/lib/RelayRecordState';
import {MutableRecordSource} from 'relay-runtime/lib/RelayStoreTypes';
import { RelayCache, NORMALIZED_CACHE_KEY, writeThunk, WRITE_CACHE_ACTION } from "./redux/Store";

const {EXISTENT, NONEXISTENT, UNKNOWN} = RelayRecordState;

export default class OfflineRecordSource implements MutableRecordSource {

    private store: Store<RelayCache>;

    constructor(store: Store<RelayCache>, records?: any ) {
        this.store = store;
    }

    public clear(): void {
        this.writeCache({});
    }

    public delete(dataID: string): void {
        const cache = this.getCacheState();
        cache[dataID] = null;
        this.writeCache(cache);
    }

    public get(dataID: string): Record {
        return this.getCacheState()[dataID];
    }

    public getRecordIDs(): Array<string> {
        return Object.keys(this.getCacheState());
    }

    public getStatus(dataID: string): RelayRecordState {
        const cache = this.getCacheState();
        if (!cache.hasOwnProperty(dataID)) {
            return UNKNOWN;
        }
        return cache[dataID] == null ? NONEXISTENT : EXISTENT;
    }

    public has(dataID: string): boolean {
        return this.getCacheState().hasOwnProperty(dataID);
    }

    public load(
        dataID: string,
        callback: (error: Error, record: Record) => void,
    ): void {
        callback(null, this.get(dataID));
    }

    public remove(dataID: string): void {
        const cache = this.getCacheState();
        delete cache[dataID];
        this.writeCache(cache);
    }

    public set(dataID: string, record: Record): void {
        const cache = this.getCacheState();
        cache[dataID] = record;
        this.writeCache(cache);
    };

    

    public size(): number {
        return Object.keys(this.getCacheState()).length;
    }

    public toJSON(): any {
        return this.getCacheState(); 
    }

    public getCacheState(): any {
        return this.store.getState()[NORMALIZED_CACHE_KEY];
    }

    public writeCache(cache: any) {
        this.store.dispatch(writeThunk(WRITE_CACHE_ACTION, cache) as any as Action);
    }

}


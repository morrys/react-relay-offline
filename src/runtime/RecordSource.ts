import {Record} from 'relay-runtime/lib/RelayCombinedEnvironmentTypes';
import * as RelayRecordState from 'relay-runtime/lib/RelayRecordState';
import {MutableRecordSource} from 'relay-runtime/lib/RelayStoreTypes';

const {EXISTENT, NONEXISTENT, UNKNOWN} = RelayRecordState;

import Cache from "@wora/cache-persist";
export interface MutableRecordSourceOffline extends MutableRecordSource {
    restore(): Promise<Cache>
  }

export default class RecordSource implements MutableRecordSourceOffline {

    private _cache: Cache;

    constructor(cache: Cache ) {
        this._cache = cache;
    }

    public purge(): Promise<boolean> {
        return this._cache.purge();
      }

    public restore(): Promise<Cache> {
        return this._cache.restore();
    }

    public clear(): void {
        this._cache.purge();
    }

    public delete(dataID: string): void {
        this._cache.delete(dataID);
    }

    public get(dataID: string): Record {
        return this._cache.get(dataID);
    }

    public getRecordIDs(): Array<string> {
        return this._cache.getAllKeys();
    }

    public getStatus(dataID: string): RelayRecordState {
        const state = this._cache.getState();
        if (!state.hasOwnProperty(dataID)) {
            return UNKNOWN;
        }
        return state[dataID] == null ? NONEXISTENT : EXISTENT;
    }

    public has(dataID: string): boolean {
        return this._cache.getState().hasOwnProperty(dataID);
    }

    public load(
        dataID: string,
        callback: (error: Error, record: Record) => void,
    ): void {
        callback(null, this.get(dataID));
    }

    public remove(dataID: string): void {
        this._cache.remove(dataID);
    }

    public set(dataID: string, record: Record): void {
        this._cache.set(dataID, record);
    };

    public size(): number {
        return this._cache.getAllKeys().length;
    }

    public toJSON(): any {
        return this._cache.getState(); 
    }

}


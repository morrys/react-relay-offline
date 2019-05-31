import { IDBPDatabase } from 'idb';
import setImmediate from 'redux-persist/lib/utils/setImmediate';

export default function createIdbStorage(dbPromise: IDBPDatabase<any>, storeName) {

  return {
    /**
     * Get
     * @param {string} key
     * @return {Promise}
     */
    async getItem(key, cb) {
        const db = await dbPromise;
        const s = await db.get(storeName, key);
        return new Promise((resolve, reject) => {
            try {
                
              setImmediate(() => {
                cb && cb(null, s)
                resolve(s)
              })
            } catch (e) {
              cb && cb(e)
              reject(e)
            }
    })
    },

    /**
     * Set
     * @param {string} key
     * @param {*} item
     * @return {Promise}
     */
    async setItem(key, item, cb) {
        const db = await dbPromise;
        await db.put(storeName, item , key);
        return new Promise((resolve, reject) => {
            try {
                
              setImmediate(() => {
                cb && cb(null)
                resolve()
              })
            } catch (e) {
              cb && cb(e)
              reject(e)
            }
    })},

    /**
     * Remove
     * @param {string} key
     * @return {Promise}
     */
    async removeItem(key, cb) {
        const db = await dbPromise;
        await db.delete(storeName ,key);
        return new Promise((resolve, reject) => {
            try {
                
              setImmediate(() => {
                cb && cb(null)
                resolve()
              })
            } catch (e) {
              cb && cb(e)
              reject(e)
            }
    })},

    /**
     * Get all keys
     * @return {Promise}
     */
    async getAllKeys(cb) {
        const db = await dbPromise;
        const keys = await db.getAllKeys(storeName);
        return new Promise((resolve, reject) => {
            try {
                
              setImmediate(() => {
                cb && cb(null, keys)
                resolve(keys)
              })
            } catch (e) {
              cb && cb(e)
              reject(e)
            }
    })
    },

    /**
     * Get all data
     * @return {Promise}
     */
    async getAll() {
      const db = await dbPromise;
      return db.getAll(storeName);
    },

    /**
     * Clear storage
     * @return {Promise}
     */
    async clear() {
      const db = await dbPromise;
      return db.clear(storeName);
    },
  }
}
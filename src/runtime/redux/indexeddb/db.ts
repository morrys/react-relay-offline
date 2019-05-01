import { openDB, DBSchema } from 'idb';
import setImmediate from 'redux-persist/lib/utils/setImmediate';

export default function createIdbStorage(options:any = {}) {
  /** @var {Object} */
  options = {
    /** Database name */
    name: 'RelayDB',
    /** Store name */
    storeName: 'relay',
    /** Database version */
    version: 1,
    /** Upgrade callback. Useful when for example switching storeName */
    upgradeCallback: upgradeDb => upgradeDb.createObjectStore(options.storeName),
    /** Custom options */
    ...options,
  }

  interface RelayDB extends DBSchema {
    'relay': {
        id: string,
        key: string,
        value: {
            record: any,
            id: string
        },
    },
  }

  /** @var {Promise} */
  const dbPromise = openDB<RelayDB>(options.name, options.version, {
    upgrade(dbPromise) {
        dbPromise.createObjectStore(options.storeName);
    }
  })

  return {
    /**
     * Get
     * @param {string} key
     * @return {Promise}
     */
    async getItem(key, cb) {
        const db = await dbPromise;
        const s = await db.get(options.storeName, key);
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
        await db.put(options.storeName, item , key);
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
        await db.delete(options.storeName ,key);
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
        const keys = await db.getAllKeys(options.storeName);
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
      return db.getAll(options.storeName);
    },

    /**
     * Clear storage
     * @return {Promise}
     */
    async clear() {
      const db = await dbPromise;
      return db.clear(options.storeName);
    },
  }
}
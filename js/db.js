// Database helper functions for Industry Planner
export const DB_NAME = 'industryPlanner';
export const DB_VERSION = 1;
export let db;

/** Open or upgrade the IndexedDB database. */
export async function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const dbInstance = event.target.result;
      if (!dbInstance.objectStoreNames.contains('packs')) {
        dbInstance.createObjectStore('packs', { keyPath: 'id', autoIncrement: true });
      }
      if (!dbInstance.objectStoreNames.contains('items')) {
        const store = dbInstance.createObjectStore('items', { keyPath: 'id', autoIncrement: true });
        store.createIndex('packId', 'packId');
      }
      if (!dbInstance.objectStoreNames.contains('jobs')) {
        const store = dbInstance.createObjectStore('jobs', { keyPath: 'id', autoIncrement: true });
        store.createIndex('packId', 'packId');
      }
    };
    request.onsuccess = (event) => {
      db = event.target.result;
      resolve();
    };
    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

/** Get all records from a store optionally filtered by a predicate. */
export function getAll(storeName, filterFn) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => {
      let result = req.result || [];
      if (filterFn) result = result.filter(filterFn);
      resolve(result);
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

/** Insert or update a record in a store. */
export function saveRecord(storeName, record) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

/** Delete a record by key. */
export function deleteRecord(storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(e.target.error);
  });
}

/** Clear all data from the given stores. */
export async function clearStores() {
  const stores = ['packs', 'items', 'jobs'];
  for (const storeName of stores) {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
  }
}

/** Generate a pseudo-random identifier. */
export function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

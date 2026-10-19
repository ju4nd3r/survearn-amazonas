import { IndexedDBConfig } from '../config/constants';

export class IndexedDBAdapter {
  private readonly memoryFallback = new Map<string, string>();

  private isIndexedDBAvailable(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(IndexedDBConfig.dbName, IndexedDBConfig.dbVersion);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IndexedDBConfig.savesStore)) {
          db.createObjectStore(IndexedDBConfig.savesStore);
        }
        if (!db.objectStoreNames.contains(IndexedDBConfig.settingsStore)) {
          db.createObjectStore(IndexedDBConfig.settingsStore);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
    });
  }

  public async setItem(storeName: string, key: string, value: unknown): Promise<void> {
    const serialized = JSON.stringify(value);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`${storeName}:${key}`, serialized);
      } catch {
        // Ignore quota errors on fallback mirror
      }
    }
    this.memoryFallback.set(`${storeName}:${key}`, serialized);

    if (!this.isIndexedDBAvailable()) {
      return;
    }

    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.put(serialized, key);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error ?? new Error('IndexedDB write failed'));
      };
    });
  }

  public async getItem<T>(storeName: string, key: string): Promise<T | null> {
    if (this.isIndexedDBAvailable()) {
      try {
        const db = await this.openDB();
        const raw = await new Promise<string | undefined>((resolve, reject) => {
          const tx = db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          const req = store.get(key);
          req.onsuccess = () => resolve(req.result as string | undefined);
          req.onerror = () => reject(req.error ?? new Error('IndexedDB read failed'));
          tx.oncomplete = () => db.close();
        });
        if (typeof raw === 'string') {
          return JSON.parse(raw) as T;
        }
      } catch {
        // Fall through to localStorage / memory fallback
      }
    }

    if (typeof localStorage !== 'undefined') {
      const localRaw = localStorage.getItem(`${storeName}:${key}`);
      if (localRaw) {
        return JSON.parse(localRaw) as T;
      }
    }

    const memRaw = this.memoryFallback.get(`${storeName}:${key}`);
    return memRaw ? (JSON.parse(memRaw) as T) : null;
  }

  public async clearAll(): Promise<void> {
    this.memoryFallback.clear();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    if (!this.isIndexedDBAvailable()) return;
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(
        [IndexedDBConfig.savesStore, IndexedDBConfig.settingsStore],
        'readwrite'
      );
      tx.objectStore(IndexedDBConfig.savesStore).clear();
      tx.objectStore(IndexedDBConfig.settingsStore).clear();
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error ?? new Error('IndexedDB clear failed'));
      };
    });
  }
}

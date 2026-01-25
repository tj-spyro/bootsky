/**
 * IndexedDB cache utility for Bluesky API data
 */

const DB_NAME = "boot-sky-cache";
const DB_VERSION = 1;
const STORE_NAME = "cache";
const DEFAULT_TTL = 1000 * 60 * 30; // 30 minutes

interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Generate a cache key for a given handle and data type
 */
function getCacheKey(handle: string, type: "following" | "profile" | "profile-stats"): string {
  return `${type}:${handle.toLowerCase()}`;
}

/**
 * Check if a cache entry is still valid
 */
function isValid<T>(entry: CacheEntry<T>): boolean {
  return Date.now() - entry.timestamp < entry.ttl;
}

/**
 * Initialize IndexedDB connection
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not available"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
  });
}

/**
 * Get data from IndexedDB cache
 */
export async function getCached<T>(
  handle: string,
  type: "following" | "profile" | "profile-stats"
): Promise<T | null> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return null;
  }

  try {
    const db = await openDB();
    const key = getCacheKey(handle, type);

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result as CacheEntry<T> | undefined;

        if (!entry) {
          resolve(null);
          return;
        }

        if (!isValid(entry)) {
          // Remove expired entry
          const deleteTransaction = db.transaction([STORE_NAME], "readwrite");
          const deleteStore = deleteTransaction.objectStore(STORE_NAME);
          deleteStore.delete(key);
          resolve(null);
          return;
        }

        resolve(entry.data);
      };

      request.onerror = () => {
        console.error("Error reading from cache:", request.error);
        resolve(null);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error("Error reading from cache:", error);
    return null;
  }
}

/**
 * Save data to IndexedDB cache
 */
export async function setCached<T>(
  handle: string,
  type: "following" | "profile" | "profile-stats",
  data: T,
  ttl: number = DEFAULT_TTL
): Promise<void> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return;
  }

  const key = getCacheKey(handle, type);
  const entry: CacheEntry<T> = {
    key,
    data,
    timestamp: Date.now(),
    ttl,
  };

  try {
    const db = await openDB();

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(entry);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error("Error writing to cache:", request.error);
        resolve(); // Don't fail if caching fails
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error("Error writing to cache:", error);
    // Don't fail if caching fails
  }
}

/**
 * Clear all expired cache entries
 */
export async function clearExpiredCache(): Promise<void> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return;
  }

  try {
    const db = await openDB();

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null;

        if (cursor) {
          const entry = cursor.value as CacheEntry<unknown>;
          if (!isValid(entry)) {
            cursor.delete();
          }
          cursor.continue();
        }
      };

      request.onerror = () => {
        console.error("Error clearing expired cache:", request.error);
        resolve();
      };

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
    });
  } catch (error) {
    console.error("Error clearing expired cache:", error);
  }
}

/**
 * Clear all cache entries for this app
 */
export async function clearAllCache(): Promise<void> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return;
  }

  try {
    const db = await openDB();

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error("Error clearing cache:", request.error);
        resolve();
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error("Error clearing cache:", error);
  }
}

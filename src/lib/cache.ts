/**
 * Session storage cache utility for Bluesky API data
 */

const CACHE_PREFIX = "boot-sky-cache";
const DEFAULT_TTL = 1000 * 60 * 30; // 30 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Generate a cache key for a given handle and data type
 */
function getCacheKey(handle: string, type: "following" | "profile" | "profile-stats"): string {
  return `${CACHE_PREFIX}:${type}:${handle.toLowerCase()}`;
}

/**
 * Check if a cache entry is still valid
 */
function isValid<T>(entry: CacheEntry<T>): boolean {
  return Date.now() - entry.timestamp < entry.ttl;
}

/**
 * Get data from session storage cache
 */
export function getCached<T>(
  handle: string,
  type: "following" | "profile" | "profile-stats"
): T | null {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return null;
  }

  try {
    const key = getCacheKey(handle, type);
    const cached = sessionStorage.getItem(key);

    if (!cached) {
      return null;
    }

    const entry: CacheEntry<T> = JSON.parse(cached);

    if (!isValid(entry)) {
      sessionStorage.removeItem(key);
      return null;
    }

    return entry.data;
  } catch (error) {
    console.error("Error reading from cache:", error);
    return null;
  }
}

/**
 * Save data to session storage cache
 */
export function setCached<T>(
  handle: string,
  type: "following" | "profile" | "profile-stats",
  data: T,
  ttl: number = DEFAULT_TTL
): void {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return;
  }

  try {
    const key = getCacheKey(handle, type);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.error("Error writing to cache:", error);
    // If quota exceeded, try to clear old entries
    // Check for various quota exceeded error patterns across browsers
    const isQuotaExceeded =
      error instanceof Error &&
      (error.name === "QuotaExceededError" ||
        // Firefox
        (error as { code?: number }).code === 1014 ||
        // Most browsers
        (error as { code?: number }).code === 22);

    if (isQuotaExceeded) {
      clearExpiredCache();
      // Try one more time after clearing
      try {
        const key = getCacheKey(handle, type);
        const entry: CacheEntry<T> = {
          data,
          timestamp: Date.now(),
          ttl,
        };
        sessionStorage.setItem(key, JSON.stringify(entry));
      } catch {
        // If it still fails, just continue without caching
      }
    }
  }
}

/**
 * Clear all expired cache entries
 */
function clearExpiredCache(): void {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return;
  }

  try {
    const keys = Object.keys(sessionStorage);
    const cacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));

    for (const key of cacheKeys) {
      try {
        const cached = sessionStorage.getItem(key);
        if (cached) {
          const entry: CacheEntry<unknown> = JSON.parse(cached);
          if (!isValid(entry)) {
            sessionStorage.removeItem(key);
          }
        }
      } catch {
        // If we can't parse the entry, remove it
        sessionStorage.removeItem(key);
      }
    }
  } catch (error) {
    console.error("Error clearing expired cache:", error);
  }
}

/**
 * Clear all cache entries for this app
 */
export function clearAllCache(): void {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return;
  }

  try {
    const keys = Object.keys(sessionStorage);
    const cacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));

    for (const key of cacheKeys) {
      sessionStorage.removeItem(key);
    }
  } catch (error) {
    console.error("Error clearing cache:", error);
  }
}

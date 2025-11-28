/**
 * Cache interface for dependency injection
 * ALL METHODS ARE ASYNC to support Redis, Memcached, DynamoDB, etc.
 *
 * This interface is intentionally async to support both:
 * - Synchronous in-memory caches (wrapped in resolved Promises)
 * - Asynchronous distributed caches (Redis, Memcached, etc.)
 */
export interface ICache<T = unknown> {
  /**
   * Get value from cache
   * @param key - Cache key
   * @returns Promise resolving to value if found and not expired, null otherwise
   */
  get(key: string): Promise<T | null>;

  /**
   * Set value in cache
   * @param key - Cache key
   * @param value - Value to cache
   */
  set(key: string, value: T): Promise<void>;

  /**
   * Check if key exists and is not expired
   * @param key - Cache key
   * @returns Promise resolving to true if key exists and is valid
   */
  has(key: string): Promise<boolean>;

  /**
   * Delete specific key
   * @param key - Cache key to delete
   */
  delete(key: string): Promise<void>;

  /**
   * Clear all cache entries
   */
  clear(): Promise<void>;

  /**
   * Get cache statistics (optional)
   * @returns Promise resolving to cache stats
   */
  getStats?(): Promise<{ size: number; ttl?: number; [key: string]: unknown }>;

  /**
   * Destroy the cache and cleanup resources
   */
  destroy?(): Promise<void>;
}

/**
 * No-op cache for when caching is disabled
 * Always returns null for gets, ignores sets
 */
export class NoOpCache<T = unknown> implements ICache<T> {
  async get(): Promise<T | null> {
    return null;
  }

  async set(): Promise<void> {
    // No-op
  }

  async has(): Promise<boolean> {
    return false;
  }

  async delete(): Promise<void> {
    // No-op
  }

  async clear(): Promise<void> {
    // No-op
  }

  async getStats() {
    return { size: 0, ttl: 0 };
  }

  async destroy(): Promise<void> {
    // No-op
  }
}

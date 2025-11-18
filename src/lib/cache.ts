/**
 * Simple in-memory cache with TTL support
 */

import { logger } from '../utils/logger.js';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class Cache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private ttl: number;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(ttlMs: number) {
    this.ttl = ttlMs;
    // Set up periodic cleanup every hour or when TTL expires (whichever is smaller)
    const cleanupInterval = Math.min(ttlMs, 3600000); // Max 1 hour
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, cleanupInterval);

    // Ensure timer doesn't prevent process exit
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Get value from cache
   * Returns null if not found or expired
   */
  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      logger.debug(`Cache miss: ${key}`);
      return null;
    }

    const age = Date.now() - entry.timestamp;
    if (age >= this.ttl) {
      logger.debug(`Cache expired: ${key} (age: ${age}ms, ttl: ${this.ttl}ms)`);
      this.store.delete(key);
      return null;
    }

    logger.debug(`Cache hit: ${key}`);
    return entry.data;
  }

  /**
   * Set value in cache
   */
  set(key: string, data: T): void {
    this.store.set(key, {
      data,
      timestamp: Date.now(),
    });
    logger.debug(`Cache set: ${key}`);
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete specific key
   */
  delete(key: string): void {
    this.store.delete(key);
    logger.debug(`Cache deleted: ${key}`);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.store.size;
    this.store.clear();
    logger.debug(`Cache cleared: ${size} entries removed`);
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; ttl: number } {
    return {
      size: this.store.size,
      ttl: this.ttl,
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.store.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.debug(`Cache cleanup: ${removed} expired entries removed`);
    }

    return removed;
  }

  /**
   * Destroy the cache and cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
    logger.debug('Cache destroyed');
  }
}

/**
 * Request deduplication to prevent multiple concurrent identical requests
 */
export class RequestDeduplicator {
  private pending = new Map<string, Promise<unknown>>();

  /**
   * Deduplicate requests by key
   * If a request with the same key is already in flight, return the existing promise
   * @param timeoutMs - Maximum time to wait for the request (default: 60 seconds)
   */
  async deduplicate<T>(key: string, fn: () => Promise<T>, timeoutMs = 60000): Promise<T> {
    // If request already in flight, return existing promise
    if (this.pending.has(key)) {
      logger.debug(`Request deduplication: using existing request for ${key}`);
      return this.pending.get(key) as Promise<T>;
    }

    // Store timeout timer so it can be cleared
    let timeoutTimer: NodeJS.Timeout | undefined;

    // Create a timeout promise that will cleanup if request hangs
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutTimer = setTimeout(() => {
        this.pending.delete(key);
        reject(new Error(`Request timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    // Start new request with automatic cleanup
    const requestPromise = fn().finally(() => {
      this.pending.delete(key);
      // Clear the timeout if request completes
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
      }
    });

    // Race between request and timeout
    const promise = Promise.race([requestPromise, timeoutPromise]);
    this.pending.set(key, promise);
    return promise;
  }

  /**
   * Get count of pending requests
   */
  getPendingCount(): number {
    return this.pending.size;
  }
}

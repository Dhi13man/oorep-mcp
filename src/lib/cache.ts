/**
 * In-memory cache implementation with TTL support
 * Implements ICache interface for dependency injection
 */

import type { ICache } from '../interfaces/ICache.js';
import type { ILogger } from '../interfaces/ILogger.js';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * In-memory cache with TTL support
 * All methods are async to comply with ICache interface
 */
export class InMemoryCache<T = unknown> implements ICache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private ttl: number;
  private cleanupTimer?: NodeJS.Timeout;
  private logger?: ILogger;

  constructor(ttlMs: number, logger?: ILogger) {
    this.ttl = ttlMs;
    this.logger = logger;

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
  async get(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) {
      this.logger?.debug(`Cache miss: ${key}`);
      return null;
    }

    const age = Date.now() - entry.timestamp;
    if (age >= this.ttl) {
      this.logger?.debug(`Cache expired: ${key} (age: ${age}ms, ttl: ${this.ttl}ms)`);
      this.store.delete(key);
      return null;
    }

    this.logger?.debug(`Cache hit: ${key}`);
    return entry.data;
  }

  /**
   * Set value in cache
   */
  async set(key: string, data: T): Promise<void> {
    this.store.set(key, {
      data,
      timestamp: Date.now(),
    });
    this.logger?.debug(`Cache set: ${key}`);
  }

  /**
   * Check if key exists and is not expired
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  /**
   * Delete specific key
   */
  async delete(key: string): Promise<void> {
    this.store.delete(key);
    this.logger?.debug(`Cache deleted: ${key}`);
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    const size = this.store.size;
    this.store.clear();
    this.logger?.debug(`Cache cleared: ${size} entries removed`);
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ size: number; ttl: number }> {
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
      this.logger?.debug(`Cache cleanup: ${removed} expired entries removed`);
    }

    return removed;
  }

  /**
   * Destroy the cache and cleanup resources
   */
  async destroy(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    await this.clear();
    this.logger?.debug('Cache destroyed');
  }
}

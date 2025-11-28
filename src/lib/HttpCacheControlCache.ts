/**
 * HTTP Cache-Control respecting cache wrapper
 * Automatically adjusts TTL based on Cache-Control headers from HTTP responses
 *
 * Respects:
 * - Cache-Control: max-age=X
 * - Cache-Control: no-cache (bypasses cache)
 * - Cache-Control: no-store (bypasses cache)
 * - Expires header (fallback)
 */

import type { ICache } from '../interfaces/ICache.js';
import type { ILogger } from '../interfaces/ILogger.js';

export interface HttpCacheMetadata {
  /**
   * HTTP response headers from the original request
   */
  headers?: Record<string, string>;

  /**
   * When the response was fetched (timestamp)
   */
  fetchedAt?: number;
}

interface CacheEntryWithMetadata<T> {
  data: T;
  metadata?: HttpCacheMetadata;
  expiresAt: number;
}

/**
 * Cache wrapper that respects HTTP Cache-Control headers
 * Similar to browser cache behavior for HTTP responses
 */
export class HttpCacheControlCache<T = unknown> implements ICache<T> {
  private store = new Map<string, CacheEntryWithMetadata<T>>();
  private defaultTtl: number;
  private logger?: ILogger;

  constructor(defaultTtlMs: number, logger?: ILogger) {
    this.defaultTtl = defaultTtlMs;
    this.logger = logger;
  }

  /**
   * Parse Cache-Control header to get max-age in milliseconds
   */
  private parseCacheControl(cacheControl?: string): number | null {
    if (!cacheControl) return null;

    // Check for no-cache or no-store
    if (cacheControl.includes('no-cache') || cacheControl.includes('no-store')) {
      this.logger?.debug('Cache-Control directive: no-cache/no-store');
      return 0; // Don't cache
    }

    // Extract max-age (allow negative values for matching)
    const maxAgeMatch = cacheControl.match(/max-age=(-?\d+)/);
    if (maxAgeMatch) {
      const seconds = parseInt(maxAgeMatch[1], 10);
      // Treat negative or zero max-age as no-cache
      if (seconds <= 0) {
        this.logger?.debug(`Cache-Control max-age=${seconds}: treating as no-cache`);
        return 0;
      }
      const ms = seconds * 1000;
      this.logger?.debug(`Cache-Control max-age: ${seconds}s (${ms}ms)`);
      return ms;
    }

    return null;
  }

  /**
   * Parse Expires header to get expiration time
   */
  private parseExpires(expires?: string, fetchedAt?: number): number | null {
    if (!expires || !fetchedAt) return null;

    try {
      const expiresDate = new Date(expires);
      // Check if date is invalid
      if (isNaN(expiresDate.getTime())) {
        this.logger?.debug('Invalid Expires header');
        return null;
      }
      const ttl = expiresDate.getTime() - fetchedAt;
      this.logger?.debug(`Expires header TTL: ${ttl}ms`);
      return ttl > 0 ? ttl : 0;
    } catch {
      return null;
    }
  }

  /**
   * Determine TTL from HTTP headers
   */
  private getTtlFromHeaders(metadata?: HttpCacheMetadata): number {
    if (!metadata?.headers) {
      return this.defaultTtl;
    }

    const cacheControl = metadata.headers['cache-control'] || metadata.headers['Cache-Control'];
    const expires = metadata.headers['expires'] || metadata.headers['Expires'];

    // Priority 1: Cache-Control max-age
    const maxAge = this.parseCacheControl(cacheControl);
    if (maxAge !== null) {
      return maxAge;
    }

    // Priority 2: Expires header
    const expiresTtl = this.parseExpires(expires, metadata.fetchedAt);
    if (expiresTtl !== null) {
      return expiresTtl;
    }

    // Fallback: default TTL
    return this.defaultTtl;
  }

  async get(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) {
      this.logger?.debug(`Cache miss: ${key}`);
      return null;
    }

    const now = Date.now();
    if (now >= entry.expiresAt) {
      this.logger?.debug(`Cache expired: ${key}`);
      this.store.delete(key);
      return null;
    }

    this.logger?.debug(`Cache hit: ${key}`);
    return entry.data;
  }

  /**
   * Set value in cache with optional HTTP metadata
   * If metadata contains Cache-Control or Expires headers, TTL is auto-adjusted
   */
  async set(key: string, value: T, metadata?: HttpCacheMetadata): Promise<void> {
    const ttl = this.getTtlFromHeaders(metadata);

    if (ttl === 0) {
      this.logger?.debug(`Cache disabled by headers: ${key}`);
      return; // Don't cache if no-cache/no-store
    }

    const expiresAt = Date.now() + ttl;
    this.store.set(key, {
      data: value,
      metadata,
      expiresAt,
    });

    this.logger?.debug(
      `Cache set: ${key} (TTL: ${ttl}ms, expires: ${new Date(expiresAt).toISOString()})`
    );
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
    this.logger?.debug(`Cache deleted: ${key}`);
  }

  async clear(): Promise<void> {
    const size = this.store.size;
    this.store.clear();
    this.logger?.debug(`Cache cleared: ${size} entries removed`);
  }

  async getStats(): Promise<{ size: number; ttl: number }> {
    return {
      size: this.store.size,
      ttl: this.defaultTtl,
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.expiresAt) {
        this.store.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      this.logger?.debug(`HTTP cache cleanup: ${removed} expired entries removed`);
    }

    return removed;
  }

  async destroy(): Promise<void> {
    await this.clear();
    this.logger?.debug('HTTP Cache-Control cache destroyed');
  }
}

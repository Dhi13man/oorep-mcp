/**
 * Tests for HttpCacheControlCache
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpCacheControlCache } from './HttpCacheControlCache.js';

describe('HttpCacheControlCache', () => {
  let cache: HttpCacheControlCache<string>;
  const defaultTtl = 60000; // 60 seconds

  beforeEach(() => {
    cache = new HttpCacheControlCache(defaultTtl);
    vi.useFakeTimers();
  });

  describe('Cache-Control header parsing', () => {
    it('should respect max-age from Cache-Control header', async () => {
      const key = 'test-key';
      const value = 'test-value';
      const maxAge = 30; // 30 seconds

      await cache.set(key, value, {
        headers: {
          'cache-control': `max-age=${maxAge}`,
        },
      });

      // Value should be cached
      expect(await cache.get(key)).toBe(value);

      // Advance time by 29 seconds - should still be cached
      vi.advanceTimersByTime(29000);
      expect(await cache.get(key)).toBe(value);

      // Advance time by 2 more seconds - should be expired
      vi.advanceTimersByTime(2000);
      expect(await cache.get(key)).toBeNull();
    });

    it('should respect no-cache directive', async () => {
      const key = 'test-key';
      const value = 'test-value';

      await cache.set(key, value, {
        headers: {
          'cache-control': 'no-cache',
        },
      });

      // Value should not be cached
      expect(await cache.get(key)).toBeNull();
    });

    it('should respect no-store directive', async () => {
      const key = 'test-key';
      const value = 'test-value';

      await cache.set(key, value, {
        headers: {
          'cache-control': 'no-store',
        },
      });

      // Value should not be cached
      expect(await cache.get(key)).toBeNull();
    });

    it('should use Expires header when Cache-Control not present', async () => {
      const key = 'test-key';
      const value = 'test-value';
      const now = Date.now();
      const expiresAt = new Date(now + 30000).toUTCString(); // 30 seconds from now

      await cache.set(key, value, {
        headers: {
          expires: expiresAt,
        },
        fetchedAt: now,
      });

      // Value should be cached
      expect(await cache.get(key)).toBe(value);

      // Advance time by 29 seconds - should still be cached
      vi.advanceTimersByTime(29000);
      expect(await cache.get(key)).toBe(value);

      // Advance time by 2 more seconds - should be expired
      vi.advanceTimersByTime(2000);
      expect(await cache.get(key)).toBeNull();
    });

    it('should prefer Cache-Control over Expires', async () => {
      const key = 'test-key';
      const value = 'test-value';
      const now = Date.now();
      const expiresAt = new Date(now + 60000).toUTCString(); // 60 seconds

      await cache.set(key, value, {
        headers: {
          'cache-control': 'max-age=30', // 30 seconds - should take precedence
          expires: expiresAt,
        },
        fetchedAt: now,
      });

      // Value should be cached
      expect(await cache.get(key)).toBe(value);

      // Advance time by 29 seconds - should still be cached
      vi.advanceTimersByTime(29000);
      expect(await cache.get(key)).toBe(value);

      // Advance time by 2 more seconds - should be expired (following max-age, not Expires)
      vi.advanceTimersByTime(2000);
      expect(await cache.get(key)).toBeNull();
    });

    it('should use default TTL when no headers provided', async () => {
      const key = 'test-key';
      const value = 'test-value';

      await cache.set(key, value);

      // Value should be cached
      expect(await cache.get(key)).toBe(value);

      // Advance time by defaultTtl - 1ms - should still be cached
      vi.advanceTimersByTime(defaultTtl - 1000);
      expect(await cache.get(key)).toBe(value);

      // Advance time by 2 seconds - should be expired
      vi.advanceTimersByTime(2000);
      expect(await cache.get(key)).toBeNull();
    });

    it('should handle complex Cache-Control headers', async () => {
      const key = 'test-key';
      const value = 'test-value';

      await cache.set(key, value, {
        headers: {
          'cache-control': 'public, max-age=120, s-maxage=3600',
        },
      });

      // Should extract max-age=120
      expect(await cache.get(key)).toBe(value);

      vi.advanceTimersByTime(119000);
      expect(await cache.get(key)).toBe(value);

      vi.advanceTimersByTime(2000);
      expect(await cache.get(key)).toBeNull();
    });
  });

  describe('Basic cache operations', () => {
    it('should store and retrieve values', async () => {
      const key = 'test-key';
      const value = 'test-value';

      await cache.set(key, value);
      expect(await cache.get(key)).toBe(value);
    });

    it('should return null for non-existent keys', async () => {
      expect(await cache.get('non-existent')).toBeNull();
    });

    it('should check if key exists', async () => {
      const key = 'test-key';
      const value = 'test-value';

      expect(await cache.has(key)).toBe(false);

      await cache.set(key, value);
      expect(await cache.has(key)).toBe(true);
    });

    it('should delete specific keys', async () => {
      const key = 'test-key';
      const value = 'test-value';

      await cache.set(key, value);
      expect(await cache.get(key)).toBe(value);

      await cache.delete(key);
      expect(await cache.get(key)).toBeNull();
    });

    it('should clear all entries', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');

      expect(await cache.get('key1')).toBe('value1');
      expect(await cache.get('key2')).toBe('value2');
      expect(await cache.get('key3')).toBe('value3');

      await cache.clear();

      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBeNull();
      expect(await cache.get('key3')).toBeNull();
    });

    it('should handle complex objects', async () => {
      const key = 'object-key';
      const value = { name: 'test', count: 42, nested: { foo: 'bar' } };

      await cache.set(key, value);
      expect(await cache.get(key)).toEqual(value);
    });
  });

  describe('Expiration', () => {
    it('should expire entries after TTL', async () => {
      const key = 'test-key';
      const value = 'test-value';

      await cache.set(key, value);
      expect(await cache.get(key)).toBe(value);

      // Advance time past TTL
      vi.advanceTimersByTime(defaultTtl + 1000);
      expect(await cache.get(key)).toBeNull();
    });

    it('should not return expired entries', async () => {
      const key = 'test-key';
      const value = 'test-value';

      await cache.set(key, value, {
        headers: {
          'cache-control': 'max-age=10',
        },
      });

      expect(await cache.get(key)).toBe(value);

      vi.advanceTimersByTime(11000);
      expect(await cache.get(key)).toBeNull();
    });
  });

  describe('Statistics', () => {
    it('should return cache statistics', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      const stats = await cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.ttl).toBe(defaultTtl);
    });

    it('should update size after deletions', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');

      let stats = await cache.getStats();
      expect(stats.size).toBe(3);

      await cache.delete('key1');

      stats = await cache.getStats();
      expect(stats.size).toBe(2);
    });
  });

  describe('Cleanup', () => {
    it('should clean up expired entries', async () => {
      await cache.set('key1', 'value1', { headers: { 'cache-control': 'max-age=10' } });
      await cache.set('key2', 'value2', { headers: { 'cache-control': 'max-age=20' } });
      await cache.set('key3', 'value3', { headers: { 'cache-control': 'max-age=30' } });

      let stats = await cache.getStats();
      expect(stats.size).toBe(3);

      // Advance time to expire key1
      vi.advanceTimersByTime(11000);
      const removed = cache.cleanup();
      expect(removed).toBe(1);

      stats = await cache.getStats();
      expect(stats.size).toBe(2);
    });

    it('should destroy cache and cleanup resources', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      const stats = await cache.getStats();
      expect(stats.size).toBe(2);

      await cache.destroy();

      const statsAfter = await cache.getStats();
      expect(statsAfter.size).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle invalid Expires header gracefully', async () => {
      const key = 'test-key';
      const value = 'test-value';

      await cache.set(key, value, {
        headers: {
          expires: 'invalid-date',
        },
        fetchedAt: Date.now(),
      });

      // Should fall back to default TTL
      expect(await cache.get(key)).toBe(value);

      vi.advanceTimersByTime(defaultTtl + 1000);
      expect(await cache.get(key)).toBeNull();
    });

    it('should handle negative max-age gracefully', async () => {
      const key = 'test-key';
      const value = 'test-value';

      await cache.set(key, value, {
        headers: {
          'cache-control': 'max-age=-10',
        },
      });

      // Should not cache
      expect(await cache.get(key)).toBeNull();
    });

    it('should handle zero max-age', async () => {
      const key = 'test-key';
      const value = 'test-value';

      await cache.set(key, value, {
        headers: {
          'cache-control': 'max-age=0',
        },
      });

      // Should not cache
      expect(await cache.get(key)).toBeNull();
    });

    it('should overwrite existing keys', async () => {
      const key = 'test-key';

      await cache.set(key, 'value1');
      expect(await cache.get(key)).toBe('value1');

      await cache.set(key, 'value2');
      expect(await cache.get(key)).toBe('value2');
    });

    it('should handle updating with different TTLs', async () => {
      const key = 'test-key';

      await cache.set(key, 'value1', { headers: { 'cache-control': 'max-age=60' } });
      expect(await cache.get(key)).toBe('value1');

      // Update with shorter TTL
      await cache.set(key, 'value2', { headers: { 'cache-control': 'max-age=10' } });
      expect(await cache.get(key)).toBe('value2');

      vi.advanceTimersByTime(11000);
      expect(await cache.get(key)).toBeNull();
    });
  });

  describe('Logger integration', () => {
    it('should work without logger', async () => {
      const cacheWithoutLogger = new HttpCacheControlCache<string>(defaultTtl);
      await cacheWithoutLogger.set('key', 'value');
      expect(await cacheWithoutLogger.get('key')).toBe('value');
    });

    it('should call logger when provided', async () => {
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        setLevel: vi.fn(),
      };

      const cacheWithLogger = new HttpCacheControlCache<string>(defaultTtl, mockLogger);

      await cacheWithLogger.set('key', 'value');
      await cacheWithLogger.get('key');

      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });
});

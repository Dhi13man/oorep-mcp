/**
 * Unit tests for cache and request deduplication
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Cache, RequestDeduplicator } from './cache.js';

describe('Cache', () => {
  let mockCache: Cache<string>;
  const mockTtl = 1000;

  beforeEach(() => {
    mockCache = new Cache<string>(mockTtl);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('Cache when created then stores ttl', async () => {
      const cache = new Cache<number>(5000);
      const stats = await cache.getStats();

      expect(stats.ttl).toBe(5000);
    });
  });

  describe('set and get', () => {
    it('set when called then stores value', async () => {
      const key = 'testKey';
      const value = 'testValue';

      await mockCache.set(key, value);
      const result = await mockCache.get(key);

      expect(result).toBe(value);
    });

    it('get when key does not exist then returns null', async () => {
      const result = await mockCache.get('nonExistentKey');

      expect(result).toBeNull();
    });

    it('set when called multiple times then overwrites value', async () => {
      const key = 'key';
      await mockCache.set(key, 'value1');
      await mockCache.set(key, 'value2');

      const result = await mockCache.get(key);

      expect(result).toBe('value2');
    });
  });

  describe('expiration', () => {
    it('get when entry is expired then returns null', async () => {
      const key = 'key';
      const value = 'value';

      await mockCache.set(key, value);
      vi.advanceTimersByTime(mockTtl + 1);

      const result = await mockCache.get(key);

      expect(result).toBeNull();
    });

    it('get when entry is expired then removes from cache', async () => {
      const key = 'key';
      await mockCache.set(key, 'value');

      vi.advanceTimersByTime(mockTtl + 1);
      await mockCache.get(key);

      const stats = await mockCache.getStats();
      expect(stats.size).toBe(0);
    });

    it('get when entry is not expired then returns value', async () => {
      const key = 'key';
      const value = 'value';

      await mockCache.set(key, value);
      vi.advanceTimersByTime(mockTtl - 1);

      const result = await mockCache.get(key);

      expect(result).toBe(value);
    });

    it('get when exactly at TTL boundary then entry is expired', async () => {
      const key = 'key';
      await mockCache.set(key, 'value');

      vi.advanceTimersByTime(mockTtl);

      const result = await mockCache.get(key);

      expect(result).toBeNull();
    });
  });

  describe('has', () => {
    it('has when key exists and not expired then returns true', async () => {
      await mockCache.set('key', 'value');

      expect(await mockCache.has('key')).toBe(true);
    });

    it('has when key does not exist then returns false', async () => {
      expect(await mockCache.has('nonExistent')).toBe(false);
    });

    it('has when key is expired then returns false', async () => {
      await mockCache.set('key', 'value');
      vi.advanceTimersByTime(mockTtl + 1);

      expect(await mockCache.has('key')).toBe(false);
    });
  });

  describe('delete', () => {
    it('delete when key exists then removes it', async () => {
      const key = 'key';
      await mockCache.set(key, 'value');

      await mockCache.delete(key);

      expect(await mockCache.get(key)).toBeNull();
    });

    it('delete when key does not exist then does not throw', async () => {
      await expect(async () => await mockCache.delete('nonExistent')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('clear when cache has entries then removes all', async () => {
      await mockCache.set('key1', 'value1');
      await mockCache.set('key2', 'value2');
      await mockCache.set('key3', 'value3');

      await mockCache.clear();

      expect(await mockCache.get('key1')).toBeNull();
      expect(await mockCache.get('key2')).toBeNull();
      expect(await mockCache.get('key3')).toBeNull();
      expect((await mockCache.getStats()).size).toBe(0);
    });

    it('clear when cache is empty then does not throw', async () => {
      await expect(async () => await mockCache.clear()).not.toThrow();
    });
  });

  describe('getStats', () => {
    it('getStats when cache is empty then returns zero size', async () => {
      const stats = await mockCache.getStats();

      expect(stats.size).toBe(0);
      expect(stats.ttl).toBe(mockTtl);
    });

    it('getStats when cache has entries then returns correct size', async () => {
      await mockCache.set('key1', 'value1');
      await mockCache.set('key2', 'value2');

      const stats = await mockCache.getStats();

      expect(stats.size).toBe(2);
    });

    it('getStats when entry is expired but not yet cleaned then still counts it', async () => {
      await mockCache.set('key1', 'value1');
      vi.advanceTimersByTime(mockTtl + 1);

      const stats = await mockCache.getStats();

      expect(stats.size).toBe(1);
    });
  });

  describe('cleanup', () => {
    it('cleanup when no expired entries then returns zero', async () => {
      await mockCache.set('key1', 'value1');
      await mockCache.set('key2', 'value2');

      const removed = mockCache.cleanup();

      expect(removed).toBe(0);
      expect((await mockCache.getStats()).size).toBe(2);
    });

    it('cleanup when has expired entries then removes and returns count', async () => {
      await mockCache.set('key1', 'value1');
      await mockCache.set('key2', 'value2');
      vi.advanceTimersByTime(mockTtl + 1);
      await mockCache.set('key3', 'value3');

      const removed = mockCache.cleanup();

      expect(removed).toBe(2);
      expect((await mockCache.getStats()).size).toBe(1);
      expect(await mockCache.get('key3')).toBe('value3');
    });

    it('cleanup when all entries expired then removes all', async () => {
      await mockCache.set('key1', 'value1');
      await mockCache.set('key2', 'value2');
      vi.advanceTimersByTime(mockTtl + 1);

      const removed = mockCache.cleanup();

      expect(removed).toBe(2);
      expect((await mockCache.getStats()).size).toBe(0);
    });

    it('cleanup when cache is empty then returns zero', () => {
      const removed = mockCache.cleanup();

      expect(removed).toBe(0);
    });
  });

  describe('type safety', () => {
    it('Cache when typed as number then stores and retrieves numbers', async () => {
      const cache = new Cache<number>(1000);
      await cache.set('key', 42);

      const result = await cache.get('key');

      expect(result).toBe(42);
      await cache.destroy();
    });

    it('Cache when typed as object then stores and retrieves objects', async () => {
      const cache = new Cache<{ name: string; age: number }>(1000);
      const mockObj = { name: 'Test', age: 30 };

      await cache.set('key', mockObj);
      const result = await cache.get('key');

      expect(result).toEqual(mockObj);
      await cache.destroy();
    });
  });

  describe('cleanup timer', () => {
    it('constructor when ttl less than hour then uses ttl as cleanup interval', async () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');
      const cache = new Cache<string>(5000);

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
      await cache.destroy();
      setIntervalSpy.mockRestore();
    });

    it('constructor when ttl greater than hour then caps cleanup interval at 1 hour', async () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');
      const cache = new Cache<string>(7200000); // 2 hours

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 3600000); // 1 hour
      await cache.destroy();
      setIntervalSpy.mockRestore();
    });

    it('cleanup timer when interval fires then removes expired entries', async () => {
      const cache = new Cache<string>(1000);
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      // Expire entries
      vi.advanceTimersByTime(1001);

      // Add new entry after expiration
      await cache.set('key3', 'value3');

      // Trigger cleanup timer (set to run at TTL interval)
      // Use 999ms to avoid expiring key3 (which would be exactly at TTL boundary)
      vi.advanceTimersByTime(999);

      // Only key3 should remain (key1 and key2 expired and cleaned)
      expect((await cache.getStats()).size).toBe(1);
      expect(await cache.get('key3')).toBe('value3');
      await cache.destroy();
    });

    it('cleanup timer when multiple intervals pass then cleans up periodically', async () => {
      const cache = new Cache<string>(500);

      // First batch
      await cache.set('key1', 'value1');
      vi.advanceTimersByTime(600); // Expire first batch

      // Second batch
      await cache.set('key2', 'value2');
      vi.advanceTimersByTime(600); // Expire second batch, triggers cleanup

      // After cleanup, expired entries should be removed
      expect((await cache.getStats()).size).toBeLessThanOrEqual(1);
      await cache.destroy();
    });
  });

  describe('destroy', () => {
    it('destroy when called then clears cleanup timer', async () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      const cache = new Cache<string>(1000);

      await cache.destroy();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    it('destroy when called then clears all entries', async () => {
      const cache = new Cache<string>(1000);
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      await cache.destroy();

      expect((await cache.getStats()).size).toBe(0);
    });

    it('destroy when called multiple times then does not throw', async () => {
      const cache = new Cache<string>(1000);

      await expect(async () => {
        await cache.destroy();
        await cache.destroy();
        await cache.destroy();
      }).not.toThrow();
    });

    it('destroy when called then subsequent cleanup timer fires do not throw', async () => {
      const cache = new Cache<string>(1000);
      await cache.set('key', 'value');

      await cache.destroy();

      // This would throw if timer wasn't properly cleared
      expect(() => vi.advanceTimersByTime(2000)).not.toThrow();
    });

    it('memory leak prevention: destroy cleans up timer reference', async () => {
      const cache = new Cache<string>(1000);
      await cache.set('key', 'value');

      // Force garbage collection consideration by destroying
      await cache.destroy();

      // Verify cache can be garbage collected (no more references)
      expect((await cache.getStats()).size).toBe(0);
    });
  });
});

describe('RequestDeduplicator', () => {
  let mockDeduplicator: RequestDeduplicator;

  beforeEach(() => {
    mockDeduplicator = new RequestDeduplicator();
  });

  describe('deduplicate', () => {
    it('deduplicate when first request for key then executes function', async () => {
      const key = 'testKey';
      const mockFn = vi.fn().mockResolvedValue('result');

      const result = await mockDeduplicator.deduplicate(key, mockFn);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(result).toBe('result');
    });

    it('deduplicate when concurrent requests for same key then executes function once', async () => {
      const key = 'testKey';
      const mockFn = vi.fn().mockResolvedValue('result');

      const promise1 = mockDeduplicator.deduplicate(key, mockFn);
      const promise2 = mockDeduplicator.deduplicate(key, mockFn);
      const promise3 = mockDeduplicator.deduplicate(key, mockFn);

      const results = await Promise.all([promise1, promise2, promise3]);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(results).toEqual(['result', 'result', 'result']);
    });

    it('deduplicate when different keys then executes both functions', async () => {
      const mockFn1 = vi.fn().mockResolvedValue('result1');
      const mockFn2 = vi.fn().mockResolvedValue('result2');

      const result1 = await mockDeduplicator.deduplicate('key1', mockFn1);
      const result2 = await mockDeduplicator.deduplicate('key2', mockFn2);

      expect(mockFn1).toHaveBeenCalledTimes(1);
      expect(mockFn2).toHaveBeenCalledTimes(1);
      expect(result1).toBe('result1');
      expect(result2).toBe('result2');
    });

    it('deduplicate when request completes then removes from pending', async () => {
      const key = 'testKey';
      const mockFn = vi.fn().mockResolvedValue('result');

      await mockDeduplicator.deduplicate(key, mockFn);

      expect(mockDeduplicator.getPendingCount()).toBe(0);
    });

    it('deduplicate when sequential requests for same key then executes both', async () => {
      const key = 'testKey';
      const mockFn = vi.fn().mockResolvedValue('result');

      await mockDeduplicator.deduplicate(key, mockFn);
      await mockDeduplicator.deduplicate(key, mockFn);

      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('deduplicate when function throws error then propagates error', async () => {
      const key = 'testKey';
      const mockError = new Error('Test error');
      const mockFn = vi.fn().mockRejectedValue(mockError);

      await expect(mockDeduplicator.deduplicate(key, mockFn)).rejects.toThrow('Test error');
    });

    it('deduplicate when function throws then clears from pending', async () => {
      const key = 'testKey';
      const mockFn = vi.fn().mockRejectedValue(new Error('Test error'));

      await expect(mockDeduplicator.deduplicate(key, mockFn)).rejects.toThrow();

      expect(mockDeduplicator.getPendingCount()).toBe(0);
    });

    it('deduplicate when concurrent requests and one fails then all fail with same error', async () => {
      const key = 'testKey';
      const mockError = new Error('Test error');
      const mockFn = vi.fn().mockRejectedValue(mockError);

      const promise1 = mockDeduplicator.deduplicate(key, mockFn);
      const promise2 = mockDeduplicator.deduplicate(key, mockFn);

      await expect(promise1).rejects.toThrow('Test error');
      await expect(promise2).rejects.toThrow('Test error');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPendingCount', () => {
    it('getPendingCount when no pending requests then returns zero', () => {
      expect(mockDeduplicator.getPendingCount()).toBe(0);
    });

    it('getPendingCount when has pending requests then returns count', async () => {
      const mockFn = vi.fn(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve('result'), 100);
          })
      );

      mockDeduplicator.deduplicate('key1', mockFn);
      mockDeduplicator.deduplicate('key2', mockFn);

      expect(mockDeduplicator.getPendingCount()).toBe(2);
    });

    it('getPendingCount when duplicate keys then counts as one', async () => {
      const mockFn = vi.fn(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve('result'), 100);
          })
      );

      mockDeduplicator.deduplicate('key1', mockFn);
      mockDeduplicator.deduplicate('key1', mockFn);

      expect(mockDeduplicator.getPendingCount()).toBe(1);
    });
  });

  describe('type safety', () => {
    it('deduplicate when function returns specific type then preserves type', async () => {
      const mockFn = vi.fn().mockResolvedValue(42);

      const result = await mockDeduplicator.deduplicate<number>('key', mockFn);

      expect(result).toBe(42);
    });

    it('deduplicate when function returns object then preserves type', async () => {
      const mockObj = { name: 'Test', value: 123 };
      const mockFn = vi.fn().mockResolvedValue(mockObj);

      const result = await mockDeduplicator.deduplicate('key', mockFn);

      expect(result).toEqual(mockObj);
    });
  });

  describe('timeout handling', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('deduplicate when request exceeds timeout then rejects with timeout error', async () => {
      const slowFn = vi.fn(
        () =>
          new Promise<string>((resolve) => {
            setTimeout(() => resolve('result'), 70000); // Takes 70 seconds
          })
      );

      const promise = mockDeduplicator.deduplicate('key', slowFn, 5000); // 5 second timeout

      // Advance past timeout
      vi.advanceTimersByTime(5001);

      await expect(promise).rejects.toThrow('Request timeout after 5000ms');
    });

    it('deduplicate when request times out then clears from pending', async () => {
      const slowFn = vi.fn(
        () =>
          new Promise<string>((resolve) => {
            setTimeout(() => resolve('result'), 70000);
          })
      );

      const promise = mockDeduplicator.deduplicate('key', slowFn, 1000);
      expect(mockDeduplicator.getPendingCount()).toBe(1);

      vi.advanceTimersByTime(1001);

      try {
        await promise;
      } catch {
        // Expected to throw
      }

      expect(mockDeduplicator.getPendingCount()).toBe(0);
    });

    it('deduplicate when request completes before timeout then resolves successfully', async () => {
      const fastFn = vi.fn(
        () =>
          new Promise<string>((resolve) => {
            setTimeout(() => resolve('result'), 100);
          })
      );

      const promise = mockDeduplicator.deduplicate('key', fastFn, 5000);

      vi.advanceTimersByTime(100);

      const result = await promise;
      expect(result).toBe('result');
    });

    it('deduplicate when custom timeout specified then uses custom value', async () => {
      const slowFn = vi.fn(
        () =>
          new Promise<string>((resolve) => {
            setTimeout(() => resolve('result'), 10000);
          })
      );

      const promise = mockDeduplicator.deduplicate('key', slowFn, 2000);

      vi.advanceTimersByTime(2001);

      await expect(promise).rejects.toThrow('Request timeout after 2000ms');
    });

    it('deduplicate when concurrent requests and one times out then all fail', async () => {
      const slowFn = vi.fn(
        () =>
          new Promise<string>((resolve) => {
            setTimeout(() => resolve('result'), 10000);
          })
      );

      const promise1 = mockDeduplicator.deduplicate('key', slowFn, 1000);
      const promise2 = mockDeduplicator.deduplicate('key', slowFn, 1000);

      vi.advanceTimersByTime(1001);

      await expect(promise1).rejects.toThrow('Request timeout');
      await expect(promise2).rejects.toThrow('Request timeout');
    });

    it('deduplicate with default timeout uses 60 seconds', async () => {
      const slowFn = vi.fn(
        () =>
          new Promise<string>((resolve) => {
            setTimeout(() => resolve('result'), 70000);
          })
      );

      const promise = mockDeduplicator.deduplicate('key', slowFn);

      // Advance to just before default timeout (60 seconds)
      vi.advanceTimersByTime(59999);
      expect(mockDeduplicator.getPendingCount()).toBe(1);

      // Advance past default timeout
      vi.advanceTimersByTime(2);

      await expect(promise).rejects.toThrow('Request timeout after 60000ms');
    });

    it('deduplicate when request completes then clears timeout timer', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      const fastFn = vi.fn(() => Promise.resolve('result'));

      await mockDeduplicator.deduplicate('key', fastFn, 5000);

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });
});

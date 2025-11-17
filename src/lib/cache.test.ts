/**
 * Unit tests for cache and request deduplication
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
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
    it('Cache when created then stores ttl', () => {
      const cache = new Cache<number>(5000);
      const stats = cache.getStats();

      expect(stats.ttl).toBe(5000);
    });
  });

  describe('set and get', () => {
    it('set when called then stores value', () => {
      const key = 'testKey';
      const value = 'testValue';

      mockCache.set(key, value);
      const result = mockCache.get(key);

      expect(result).toBe(value);
    });

    it('get when key does not exist then returns null', () => {
      const result = mockCache.get('nonExistentKey');

      expect(result).toBeNull();
    });

    it('set when called multiple times then overwrites value', () => {
      const key = 'key';
      mockCache.set(key, 'value1');
      mockCache.set(key, 'value2');

      const result = mockCache.get(key);

      expect(result).toBe('value2');
    });
  });

  describe('expiration', () => {
    it('get when entry is expired then returns null', () => {
      const key = 'key';
      const value = 'value';

      mockCache.set(key, value);
      vi.advanceTimersByTime(mockTtl + 1);

      const result = mockCache.get(key);

      expect(result).toBeNull();
    });

    it('get when entry is expired then removes from cache', () => {
      const key = 'key';
      mockCache.set(key, 'value');

      vi.advanceTimersByTime(mockTtl + 1);
      mockCache.get(key);

      const stats = mockCache.getStats();
      expect(stats.size).toBe(0);
    });

    it('get when entry is not expired then returns value', () => {
      const key = 'key';
      const value = 'value';

      mockCache.set(key, value);
      vi.advanceTimersByTime(mockTtl - 1);

      const result = mockCache.get(key);

      expect(result).toBe(value);
    });

    it('get when exactly at TTL boundary then entry is expired', () => {
      const key = 'key';
      mockCache.set(key, 'value');

      vi.advanceTimersByTime(mockTtl);

      const result = mockCache.get(key);

      expect(result).toBeNull();
    });
  });

  describe('has', () => {
    it('has when key exists and not expired then returns true', () => {
      mockCache.set('key', 'value');

      expect(mockCache.has('key')).toBe(true);
    });

    it('has when key does not exist then returns false', () => {
      expect(mockCache.has('nonExistent')).toBe(false);
    });

    it('has when key is expired then returns false', () => {
      mockCache.set('key', 'value');
      vi.advanceTimersByTime(mockTtl + 1);

      expect(mockCache.has('key')).toBe(false);
    });
  });

  describe('delete', () => {
    it('delete when key exists then removes it', () => {
      const key = 'key';
      mockCache.set(key, 'value');

      mockCache.delete(key);

      expect(mockCache.get(key)).toBeNull();
    });

    it('delete when key does not exist then does not throw', () => {
      expect(() => mockCache.delete('nonExistent')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('clear when cache has entries then removes all', () => {
      mockCache.set('key1', 'value1');
      mockCache.set('key2', 'value2');
      mockCache.set('key3', 'value3');

      mockCache.clear();

      expect(mockCache.get('key1')).toBeNull();
      expect(mockCache.get('key2')).toBeNull();
      expect(mockCache.get('key3')).toBeNull();
      expect(mockCache.getStats().size).toBe(0);
    });

    it('clear when cache is empty then does not throw', () => {
      expect(() => mockCache.clear()).not.toThrow();
    });
  });

  describe('getStats', () => {
    it('getStats when cache is empty then returns zero size', () => {
      const stats = mockCache.getStats();

      expect(stats.size).toBe(0);
      expect(stats.ttl).toBe(mockTtl);
    });

    it('getStats when cache has entries then returns correct size', () => {
      mockCache.set('key1', 'value1');
      mockCache.set('key2', 'value2');

      const stats = mockCache.getStats();

      expect(stats.size).toBe(2);
    });

    it('getStats when entry is expired but not yet cleaned then still counts it', () => {
      mockCache.set('key1', 'value1');
      vi.advanceTimersByTime(mockTtl + 1);

      const stats = mockCache.getStats();

      expect(stats.size).toBe(1);
    });
  });

  describe('cleanup', () => {
    it('cleanup when no expired entries then returns zero', () => {
      mockCache.set('key1', 'value1');
      mockCache.set('key2', 'value2');

      const removed = mockCache.cleanup();

      expect(removed).toBe(0);
      expect(mockCache.getStats().size).toBe(2);
    });

    it('cleanup when has expired entries then removes and returns count', () => {
      mockCache.set('key1', 'value1');
      mockCache.set('key2', 'value2');
      vi.advanceTimersByTime(mockTtl + 1);
      mockCache.set('key3', 'value3');

      const removed = mockCache.cleanup();

      expect(removed).toBe(2);
      expect(mockCache.getStats().size).toBe(1);
      expect(mockCache.get('key3')).toBe('value3');
    });

    it('cleanup when all entries expired then removes all', () => {
      mockCache.set('key1', 'value1');
      mockCache.set('key2', 'value2');
      vi.advanceTimersByTime(mockTtl + 1);

      const removed = mockCache.cleanup();

      expect(removed).toBe(2);
      expect(mockCache.getStats().size).toBe(0);
    });

    it('cleanup when cache is empty then returns zero', () => {
      const removed = mockCache.cleanup();

      expect(removed).toBe(0);
    });
  });

  describe('type safety', () => {
    it('Cache when typed as number then stores and retrieves numbers', () => {
      const cache = new Cache<number>(1000);
      cache.set('key', 42);

      const result = cache.get('key');

      expect(result).toBe(42);
    });

    it('Cache when typed as object then stores and retrieves objects', () => {
      const cache = new Cache<{ name: string; age: number }>(1000);
      const mockObj = { name: 'Test', age: 30 };

      cache.set('key', mockObj);
      const result = cache.get('key');

      expect(result).toEqual(mockObj);
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
});

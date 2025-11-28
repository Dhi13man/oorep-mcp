/**
 * Unit tests for SafeCacheWrapper
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SafeCacheWrapper } from './SafeCacheWrapper.js';
import type { ICache } from '../../interfaces/ICache.js';

describe('SafeCacheWrapper', () => {
  let wrapper: SafeCacheWrapper<string>;
  let mockCache: ICache<string>;
  let mockFallback: ICache<string>;
  let mockLogger: {
    warn: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockCache = {
      get: vi.fn(),
      set: vi.fn(),
      has: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      getStats: vi.fn(),
      destroy: vi.fn(),
    };

    mockFallback = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      has: vi.fn().mockResolvedValue(false),
      delete: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      getStats: vi.fn().mockResolvedValue({ size: 0 }),
      destroy: vi.fn().mockResolvedValue(undefined),
    };

    mockLogger = {
      warn: vi.fn(),
    };
  });

  describe('get operation', () => {
    it('get_whenPrimaryCacheSucceeds_thenReturnsValue', async () => {
      // Arrange
      const key = 'test-key';
      const value = 'test-value';
      mockCache.get = vi.fn().mockResolvedValue(value);
      wrapper = new SafeCacheWrapper(mockCache, mockFallback, mockLogger);

      // Act
      const result = await wrapper.get(key);

      // Assert
      expect(result).toBe(value);
      expect(mockCache.get).toHaveBeenCalledWith(key);
      expect(mockFallback.get).not.toHaveBeenCalled();
    });

    it('get_whenPrimaryCacheFails_thenUsesFallback', async () => {
      // Arrange
      const key = 'test-key';
      const fallbackValue = 'fallback-value';
      const error = new Error('Cache connection failed');
      mockCache.get = vi.fn().mockRejectedValue(error);
      mockFallback.get = vi.fn().mockResolvedValue(fallbackValue);
      wrapper = new SafeCacheWrapper(mockCache, mockFallback, mockLogger);

      // Act
      const result = await wrapper.get(key);

      // Assert
      expect(result).toBe(fallbackValue);
      expect(mockFallback.get).toHaveBeenCalledWith(key);
      expect(mockLogger.warn).toHaveBeenCalledWith('Cache get failed (1/5)', error);
    });

    it('get_whenPermanentlyFailed_thenSkipsPrimaryCache', async () => {
      // Arrange
      const key = 'test-key';
      const error = new Error('Connection lost');
      mockCache.get = vi.fn().mockRejectedValue(error);
      wrapper = new SafeCacheWrapper(mockCache, mockFallback, mockLogger);

      // Act - fail 5 times to trigger permanent failure
      for (let i = 0; i < 5; i++) {
        await wrapper.get('key' + i);
      }

      // Act - next call should skip primary
      vi.clearAllMocks();
      await wrapper.get(key);

      // Assert
      expect(mockCache.get).not.toHaveBeenCalled();
      expect(mockFallback.get).toHaveBeenCalledWith(key);
    });
  });

  describe('set operation', () => {
    it('set_whenPrimaryCacheSucceeds_thenSetsValue', async () => {
      // Arrange
      const key = 'test-key';
      const value = 'test-value';
      mockCache.set = vi.fn().mockResolvedValue(undefined);
      wrapper = new SafeCacheWrapper(mockCache, mockFallback, mockLogger);

      // Act
      await wrapper.set(key, value);

      // Assert
      expect(mockCache.set).toHaveBeenCalledWith(key, value);
      expect(mockFallback.set).not.toHaveBeenCalled();
    });

    it('set_whenPrimaryCacheFails_thenUsesFallback', async () => {
      // Arrange
      const key = 'test-key';
      const value = 'test-value';
      const error = new Error('Write failed');
      mockCache.set = vi.fn().mockRejectedValue(error);
      wrapper = new SafeCacheWrapper(mockCache, mockFallback, mockLogger);

      // Act
      await wrapper.set(key, value);

      // Assert
      expect(mockFallback.set).toHaveBeenCalledWith(key, value);
      expect(mockLogger.warn).toHaveBeenCalledWith('Cache set failed (1/5)', error);
    });
  });

  describe('has operation', () => {
    it('has_whenPrimaryCacheSucceeds_thenReturnsResult', async () => {
      // Arrange
      const key = 'test-key';
      mockCache.has = vi.fn().mockResolvedValue(true);
      wrapper = new SafeCacheWrapper(mockCache, mockFallback, mockLogger);

      // Act
      const result = await wrapper.has(key);

      // Assert
      expect(result).toBe(true);
      expect(mockCache.has).toHaveBeenCalledWith(key);
    });

    it('has_whenPrimaryCacheFails_thenUsesFallback', async () => {
      // Arrange
      const key = 'test-key';
      const error = new Error('Check failed');
      mockCache.has = vi.fn().mockRejectedValue(error);
      mockFallback.has = vi.fn().mockResolvedValue(false);
      wrapper = new SafeCacheWrapper(mockCache, mockFallback, mockLogger);

      // Act
      const result = await wrapper.has(key);

      // Assert
      expect(result).toBe(false);
      expect(mockFallback.has).toHaveBeenCalledWith(key);
    });
  });

  describe('delete operation', () => {
    it('delete_whenPrimaryCacheSucceeds_thenDeletes', async () => {
      // Arrange
      const key = 'test-key';
      mockCache.delete = vi.fn().mockResolvedValue(undefined);
      wrapper = new SafeCacheWrapper(mockCache, mockFallback, mockLogger);

      // Act
      await wrapper.delete(key);

      // Assert
      expect(mockCache.delete).toHaveBeenCalledWith(key);
      expect(mockFallback.delete).not.toHaveBeenCalled();
    });

    it('delete_whenPrimaryCacheFails_thenUsesFallback', async () => {
      // Arrange
      const key = 'test-key';
      const error = new Error('Delete failed');
      mockCache.delete = vi.fn().mockRejectedValue(error);
      wrapper = new SafeCacheWrapper(mockCache, mockFallback, mockLogger);

      // Act
      await wrapper.delete(key);

      // Assert
      expect(mockFallback.delete).toHaveBeenCalledWith(key);
    });
  });

  describe('clear operation', () => {
    it('clear_whenPrimaryCacheSucceeds_thenClears', async () => {
      // Arrange
      mockCache.clear = vi.fn().mockResolvedValue(undefined);
      wrapper = new SafeCacheWrapper(mockCache, mockFallback, mockLogger);

      // Act
      await wrapper.clear();

      // Assert
      expect(mockCache.clear).toHaveBeenCalled();
      expect(mockFallback.clear).not.toHaveBeenCalled();
    });

    it('clear_whenPrimaryCacheFails_thenUsesFallback', async () => {
      // Arrange
      const error = new Error('Clear failed');
      mockCache.clear = vi.fn().mockRejectedValue(error);
      wrapper = new SafeCacheWrapper(mockCache, mockFallback, mockLogger);

      // Act
      await wrapper.clear();

      // Assert
      expect(mockFallback.clear).toHaveBeenCalled();
    });
  });

  describe('getStats operation', () => {
    it('getStats_whenPrimaryCacheSucceeds_thenReturnsStats', async () => {
      // Arrange
      const stats = { size: 42, ttl: 5000 };
      mockCache.getStats = vi.fn().mockResolvedValue(stats);
      wrapper = new SafeCacheWrapper(mockCache, mockFallback, mockLogger);

      // Act
      const result = await wrapper.getStats();

      // Assert
      expect(result).toEqual(stats);
    });

    it('getStats_whenPrimaryCacheFails_thenUsesFallback', async () => {
      // Arrange
      const fallbackStats = { size: 0 };
      const error = new Error('Stats failed');
      mockCache.getStats = vi.fn().mockRejectedValue(error);
      mockFallback.getStats = vi.fn().mockResolvedValue(fallbackStats);
      wrapper = new SafeCacheWrapper(mockCache, mockFallback, mockLogger);

      // Act
      const result = await wrapper.getStats();

      // Assert
      expect(result).toEqual(fallbackStats);
    });

    it('getStats_whenBothCachesLackMethod_thenReturnsDefault', async () => {
      // Arrange
      const cacheWithoutStats: ICache<string> = {
        get: vi.fn(),
        set: vi.fn(),
        has: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
      };
      const fallbackWithoutStats: ICache<string> = {
        get: vi.fn(),
        set: vi.fn(),
        has: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
      };
      wrapper = new SafeCacheWrapper(cacheWithoutStats, fallbackWithoutStats, mockLogger);

      // Act
      const result = await wrapper.getStats();

      // Assert
      expect(result).toEqual({ size: 0 });
    });
  });

  describe('destroy operation', () => {
    it('destroy_whenBothSucceed_thenDestroysBoth', async () => {
      // Arrange
      mockCache.destroy = vi.fn().mockResolvedValue(undefined);
      mockFallback.destroy = vi.fn().mockResolvedValue(undefined);
      wrapper = new SafeCacheWrapper(mockCache, mockFallback, mockLogger);

      // Act
      await wrapper.destroy();

      // Assert
      expect(mockCache.destroy).toHaveBeenCalled();
      expect(mockFallback.destroy).toHaveBeenCalled();
    });

    it('destroy_whenPrimaryFails_thenContinuesWithFallback', async () => {
      // Arrange
      const error = new Error('Primary destroy failed');
      mockCache.destroy = vi.fn().mockRejectedValue(error);
      mockFallback.destroy = vi.fn().mockResolvedValue(undefined);
      wrapper = new SafeCacheWrapper(mockCache, mockFallback, mockLogger);

      // Act
      await wrapper.destroy();

      // Assert
      expect(mockCache.destroy).toHaveBeenCalled();
      expect(mockFallback.destroy).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith('Primary cache destroy failed', error);
    });

    it('destroy_whenFallbackFails_thenLogsWarning', async () => {
      // Arrange
      const error = new Error('Fallback destroy failed');
      mockCache.destroy = vi.fn().mockResolvedValue(undefined);
      mockFallback.destroy = vi.fn().mockRejectedValue(error);
      wrapper = new SafeCacheWrapper(mockCache, mockFallback, mockLogger);

      // Act
      await wrapper.destroy();

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith('Fallback cache destroy failed', error);
    });

    it('destroy_whenBothLackMethod_thenSucceeds', async () => {
      // Arrange
      const cacheWithoutDestroy: ICache<string> = {
        get: vi.fn(),
        set: vi.fn(),
        has: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
      };
      wrapper = new SafeCacheWrapper(cacheWithoutDestroy, cacheWithoutDestroy, mockLogger);

      // Act & Assert - should not throw
      await expect(wrapper.destroy()).resolves.toBeUndefined();
    });
  });

  describe('failure count tracking', () => {
    it('handleError_whenFailureCountReachesMax_thenSwitchesPermanently', async () => {
      // Arrange
      const error = new Error('Persistent failure');
      mockCache.get = vi.fn().mockRejectedValue(error);
      wrapper = new SafeCacheWrapper(mockCache, mockFallback, mockLogger);

      // Act - trigger 5 failures
      for (let i = 0; i < 5; i++) {
        await wrapper.get('key' + i);
      }

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Cache has failed 5 times, switching to fallback permanently'
      );

      // Act - next operation should skip primary
      vi.clearAllMocks();
      await wrapper.get('test-key');

      // Assert
      expect(mockCache.get).not.toHaveBeenCalled();
      expect(mockFallback.get).toHaveBeenCalled();
    });

    it('handleError_whenDifferentOperationsFail_thenCountsCumulatively', async () => {
      // Arrange
      const error = new Error('Various failures');
      mockCache.get = vi.fn().mockRejectedValue(error);
      mockCache.set = vi.fn().mockRejectedValue(error);
      mockCache.has = vi.fn().mockRejectedValue(error);
      mockCache.delete = vi.fn().mockRejectedValue(error);
      mockCache.clear = vi.fn().mockRejectedValue(error);
      wrapper = new SafeCacheWrapper(mockCache, mockFallback, mockLogger);

      // Act - mix different operations
      await wrapper.get('key1');
      await wrapper.set('key2', 'value');
      await wrapper.has('key3');
      await wrapper.delete('key4');
      await wrapper.clear();

      // Assert - should have reached permanent failure
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Cache has failed 5 times, switching to fallback permanently'
      );
    });
  });

  describe('without logger', () => {
    it('operations_whenNoLogger_thenStillFunctionCorrectly', async () => {
      // Arrange
      const error = new Error('Failure');
      mockCache.get = vi.fn().mockRejectedValue(error);
      wrapper = new SafeCacheWrapper(mockCache, mockFallback);

      // Act & Assert - should not throw even without logger
      const result = await wrapper.get('test-key');
      expect(result).toBeNull();
    });
  });
});

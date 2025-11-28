import type { ICache } from '../../interfaces/ICache.js';

/**
 * Safe cache wrapper with graceful degradation
 * Falls back to a secondary cache if the primary cache fails
 *
 * This wrapper protects against cache failures by:
 * 1. Catching all errors from the primary cache
 * 2. Falling back to a secondary cache (typically NoOpCache)
 * 3. Permanently switching to fallback after too many failures
 * 4. Logging warnings about cache failures (if logger provided)
 */
export class SafeCacheWrapper<T = unknown> implements ICache<T> {
  private failureCount = 0;
  private readonly maxFailures = 5;
  private failed = false;

  constructor(
    private cache: ICache<T>,
    private fallback: ICache<T>,
    private logger?: { warn(message: string, ...args: unknown[]): void }
  ) {}

  async get(key: string): Promise<T | null> {
    if (this.failed) {
      return this.fallback.get(key);
    }

    try {
      return await this.cache.get(key);
    } catch (error) {
      this.handleError('get', error);
      return this.fallback.get(key);
    }
  }

  async set(key: string, value: T): Promise<void> {
    if (this.failed) {
      return this.fallback.set(key, value);
    }

    try {
      await this.cache.set(key, value);
    } catch (error) {
      this.handleError('set', error);
      await this.fallback.set(key, value);
    }
  }

  async has(key: string): Promise<boolean> {
    if (this.failed) {
      return this.fallback.has(key);
    }

    try {
      return await this.cache.has(key);
    } catch (error) {
      this.handleError('has', error);
      return this.fallback.has(key);
    }
  }

  async delete(key: string): Promise<void> {
    if (this.failed) {
      return this.fallback.delete(key);
    }

    try {
      await this.cache.delete(key);
    } catch (error) {
      this.handleError('delete', error);
      await this.fallback.delete(key);
    }
  }

  async clear(): Promise<void> {
    if (this.failed) {
      return this.fallback.clear();
    }

    try {
      await this.cache.clear();
    } catch (error) {
      this.handleError('clear', error);
      await this.fallback.clear();
    }
  }

  async getStats(): Promise<{ size: number; ttl?: number; [key: string]: unknown }> {
    if (this.failed) {
      return (await this.fallback.getStats?.()) ?? { size: 0 };
    }

    try {
      return (await this.cache.getStats?.()) ?? { size: 0 };
    } catch (error) {
      this.handleError('getStats', error);
      return (await this.fallback.getStats?.()) ?? { size: 0 };
    }
  }

  async destroy(): Promise<void> {
    // Try to destroy both primary and fallback
    // Don't fail if either throws
    try {
      await this.cache.destroy?.();
    } catch (error) {
      this.logger?.warn('Primary cache destroy failed', error);
    }

    try {
      await this.fallback.destroy?.();
    } catch (error) {
      this.logger?.warn('Fallback cache destroy failed', error);
    }
  }

  /**
   * Handle cache errors and track failure count
   * Permanently switches to fallback after max failures
   */
  private handleError(method: string, error: unknown): void {
    this.failureCount++;
    this.logger?.warn(`Cache ${method} failed (${this.failureCount}/${this.maxFailures})`, error);

    if (this.failureCount >= this.maxFailures) {
      this.failed = true;
      this.logger?.warn(
        `Cache has failed ${this.maxFailures} times, switching to fallback permanently`
      );
    }
  }
}

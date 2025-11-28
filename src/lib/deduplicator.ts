/**
 * Request deduplication implementation
 * Prevents multiple concurrent identical requests
 */

import type { IRequestDeduplicator } from '../interfaces/IRequestDeduplicator.js';
import type { ILogger } from '../interfaces/ILogger.js';

/**
 * Map-based request deduplicator
 * Implements IRequestDeduplicator interface for dependency injection
 */
export class MapRequestDeduplicator implements IRequestDeduplicator {
  private pending = new Map<string, Promise<unknown>>();
  private logger?: ILogger;

  constructor(logger?: ILogger) {
    this.logger = logger;
  }

  /**
   * Deduplicate requests by key
   * If a request with the same key is already in flight, return the existing promise
   */
  async deduplicate<T>(key: string, fn: () => Promise<T>, timeoutMs = 60000): Promise<T> {
    // If request already in flight, return existing promise
    if (this.pending.has(key)) {
      this.logger?.debug(`Request deduplication: using existing request for ${key}`);
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

      // Allow garbage collection if request completes before timeout
      if (timeoutTimer.unref) {
        timeoutTimer.unref();
      }
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
    // Store promise immediately to prevent race condition with cleanup
    this.pending.set(key, Promise.race([requestPromise, timeoutPromise]));
    return this.pending.get(key) as Promise<T>;
  }

  /**
   * Get count of pending requests
   */
  getPendingCount(): number {
    return this.pending.size;
  }
}

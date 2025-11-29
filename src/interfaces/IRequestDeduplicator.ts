/**
 * Request deduplicator interface for dependency injection
 * Allows users to provide custom deduplication strategies
 *
 * Deduplication prevents multiple concurrent identical requests,
 * reducing load on the backend and improving response times.
 */
export interface IRequestDeduplicator {
  /**
   * Deduplicate requests by key
   * If a request with the same key is already in flight, return the existing promise
   *
   * @param key - Unique key for this request
   * @param fn - Function that performs the request
   * @param timeoutMs - Maximum time to wait for the request
   * @returns Promise resolving to the request result
   */
  deduplicate<T>(key: string, fn: () => Promise<T>, timeoutMs?: number): Promise<T>;

  /**
   * Get count of pending requests (optional, for monitoring)
   * @returns Number of requests currently in flight
   *
   * @example
   * ```typescript
   * const pending = deduplicator.getPendingCount?.() ?? 0;
   * if (pending > 10) {
   *   console.warn(`High pending request count: ${pending}`);
   * }
   * ```
   */
  getPendingCount?(): number;
}

/**
 * No-op deduplicator - always executes the function
 * Useful for debugging or when deduplication is not desired
 */
export class NoOpDeduplicator implements IRequestDeduplicator {
  async deduplicate<T>(_key: string, fn: () => Promise<T>): Promise<T> {
    return fn();
  }

  getPendingCount(): number {
    return 0;
  }
}

/**
 * Dependency Injection Interfaces
 *
 * This module exports all interfaces and base implementations for dependency injection.
 * Users can implement these interfaces to customize:
 * - Logging (ILogger)
 * - Caching (ICache)
 * - Request deduplication (IRequestDeduplicator)
 */

// Export type interfaces
export type { ICache } from './ICache.js';
export type { ILogger, LogLevel } from './ILogger.js';
export type { IRequestDeduplicator } from './IRequestDeduplicator.js';
export type {
  IOOREPClient,
  SearchRepertoryArgs,
  SearchMateriaMedicaArgs,
  GetRemedyInfoArgs,
  ListByLanguageArgs,
} from './IOOREPClient.js';

// Export NoOp implementations for disabling features
export { NoOpCache } from './ICache.js';
export { NoOpLogger } from './ILogger.js';
export { NoOpDeduplicator } from './IRequestDeduplicator.js';

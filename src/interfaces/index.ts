/**
 * Dependency Injection Interfaces
 *
 * This module exports all interfaces and base implementations for dependency injection.
 * Users can implement these interfaces to customize:
 * - Logging (ILogger)
 * - Caching (ICache)
 * - HTTP client (IHttpClient)
 * - Request deduplication (IRequestDeduplicator)
 * - Session management (ISessionManager)
 */

// Export type interfaces
export type { ICache } from './ICache.js';
export type { ILogger, LogLevel } from './ILogger.js';
export type { IHttpClient, HttpRequestOptions, HttpResponse } from './IHttpClient.js';
export type { IRequestDeduplicator } from './IRequestDeduplicator.js';
export type { ISessionManager } from './ISessionManager.js';

// Export NoOp implementations for disabling features
export { NoOpCache } from './ICache.js';
export { NoOpLogger } from './ILogger.js';
export { NoOpDeduplicator } from './IRequestDeduplicator.js';

// Export error classes
export { HttpError } from './IHttpClient.js';

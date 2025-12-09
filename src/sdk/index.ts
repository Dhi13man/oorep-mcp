/**
 * OOREP SDK - Main entry point
 *
 * This SDK provides programmatic access to OOREP (Open Online Repertory)
 * homeopathic data for use with any AI client SDK.
 *
 * @example
 * ```typescript
 * import { OOREPClient, createOOREPClient } from 'oorep-mcp/sdk';
 *
 * // Simple usage
 * const client = createOOREPClient();
 * const results = await client.searchRepertory({ symptom: 'headache' });
 *
 * // With custom config
 * const client = createOOREPClient({
 *   baseUrl: 'https://www.oorep.com',
 *   timeoutMs: 30000
 * });
 * ```
 */

// Re-export the main client
export { OOREPSDKClient, createOOREPClient, type OOREPSDKConfig } from './client.js';

// Re-export Resource types
export type {
  ResourceUri,
  ResourceContent,
} from './client.js';

// Re-export Prompt types
export type {
  PromptName,
  PromptMessage,
  PromptResult,
  AnalyzeSymptomsArgs,
  RemedyComparisonArgs,
} from './client.js';

// Re-export all types
export type {
  // Input types
  SearchRepertoryArgs,
  SearchMateriaMedicaArgs,
  GetRemedyInfoArgs,
  ListRepertoriesArgs,
  ListMateriaMedicasArgs,
  // Result types
  RepertorySearchResult,
  MateriaMedicaSearchResult,
  RemedyInfo,
  RepertoryMetadata,
  MateriaMedicaMetadata,
  Rubric,
  Remedy,
  MateriaMedicaResult,
  MateriaMedicaSection,
} from '../utils/schemas.js';

// Re-export validation schemas for client-side validation
export {
  SearchRepertoryArgsSchema,
  SearchMateriaMedicaArgsSchema,
  GetRemedyInfoArgsSchema,
  ListRepertoriesArgsSchema,
  ListMateriaMedicasArgsSchema,
  RepertorySearchResultSchema,
  MateriaMedicaSearchResultSchema,
  RemedyInfoSchema,
  RepertoryMetadataSchema,
  MateriaMedicaMetadataSchema,
} from '../utils/schemas.js';

// Re-export error classes
export {
  OOREPError,
  ValidationError,
  NetworkError,
  TimeoutError,
  RateLimitError,
  OOREPAPIError,
  sanitizeError,
} from '../utils/errors.js';

// Re-export DI interfaces
export type { ICache } from '../interfaces/ICache.js';
export type { ILogger, LogLevel } from '../interfaces/ILogger.js';
export type { IRequestDeduplicator } from '../interfaces/IRequestDeduplicator.js';

// Re-export implementations
export { InMemoryCache } from '../lib/cache.js';
export { MapRequestDeduplicator } from '../lib/deduplicator.js';
export { ConsoleLogger } from '../utils/logger.js';

// Re-export helper classes
export { NoOpCache } from '../interfaces/ICache.js';
export { NoOpLogger } from '../interfaces/ILogger.js';
export { NoOpDeduplicator } from '../interfaces/IRequestDeduplicator.js';

// Re-export formatting utilities
export {
  formatRepertoryResults,
  formatMateriaMedicaResults,
  generateCacheKey,
  truncate,
  formatList,
} from '../lib/data-formatter.js';

// Export tool definitions for building custom integrations
export { toolDefinitions, type OOREPToolDefinition } from './tools.js';

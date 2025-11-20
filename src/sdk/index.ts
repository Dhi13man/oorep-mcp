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

// Re-export utility classes
export { Cache, RequestDeduplicator } from '../lib/cache.js';

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

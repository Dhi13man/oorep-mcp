/**
 * Safety wrappers for user-provided dependencies
 *
 * These wrappers ensure that errors in user-provided implementations
 * don't crash the OOREP MCP application. They provide graceful
 * degradation and fallback mechanisms.
 */

export { SafeLoggerWrapper } from './SafeLoggerWrapper.js';
export { SafeCacheWrapper } from './SafeCacheWrapper.js';

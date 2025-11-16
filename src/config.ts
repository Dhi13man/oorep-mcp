/**
 * Configuration management for OOREP MCP server
 */

import { logger } from './utils/logger.js';

export interface OOREPConfig {
  baseUrl: string;
  timeoutMs: number;
  cacheTtlMs: number;
  maxResults: number;
  logLevel: string;
}

/**
 * Parse and validate configuration from environment variables and CLI args
 */
export function getConfig(): OOREPConfig {
  const config: OOREPConfig = {
    baseUrl: process.env.OOREP_MCP_BASE_URL || 'https://www.oorep.com',
    timeoutMs: parseInt(process.env.OOREP_MCP_TIMEOUT_MS || '30000', 10),
    cacheTtlMs: parseInt(process.env.OOREP_MCP_CACHE_TTL_MS || '300000', 10),
    maxResults: parseInt(process.env.OOREP_MCP_MAX_RESULTS || '100', 10),
    logLevel: process.env.OOREP_MCP_LOG_LEVEL || 'info',
  };

  // Parse CLI arguments (override env vars)
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--base-url':
        config.baseUrl = args[++i];
        break;
      case '--timeout':
        config.timeoutMs = parseInt(args[++i], 10);
        break;
      case '--cache-ttl':
        config.cacheTtlMs = parseInt(args[++i], 10);
        break;
      case '--max-results':
        config.maxResults = parseInt(args[++i], 10);
        break;
      case '--log-level':
        config.logLevel = args[++i];
        break;
    }
  }

  // Validate
  if (!config.baseUrl) {
    throw new Error('OOREP_MCP_BASE_URL is required');
  }

  if (config.timeoutMs < 1000 || config.timeoutMs > 300000) {
    throw new Error('OOREP_MCP_TIMEOUT_MS must be between 1000 and 300000');
  }

  if (config.maxResults < 1 || config.maxResults > 500) {
    throw new Error('OOREP_MCP_MAX_RESULTS must be between 1 and 500');
  }

  logger.info('Configuration loaded', {
    baseUrl: config.baseUrl,
    timeoutMs: config.timeoutMs,
    cacheTtlMs: config.cacheTtlMs,
    maxResults: config.maxResults,
    logLevel: config.logLevel,
  });

  return config;
}

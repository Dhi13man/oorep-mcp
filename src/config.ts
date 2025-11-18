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
  defaultRepertory: string;
  defaultMateriaMedica: string;
}

/**
 * Parse and validate configuration from environment variables and CLI args
 */
export function getConfig(): OOREPConfig {
  const config: OOREPConfig = {
    baseUrl: process.env.OOREP_MCP_BASE_URL ?? 'https://www.oorep.com',
    timeoutMs: parseInt(process.env.OOREP_MCP_TIMEOUT_MS ?? '30000', 10),
    cacheTtlMs: parseInt(process.env.OOREP_MCP_CACHE_TTL_MS ?? '300000', 10),
    maxResults: parseInt(process.env.OOREP_MCP_MAX_RESULTS ?? '100', 10),
    logLevel: process.env.OOREP_MCP_LOG_LEVEL ?? 'info',
    defaultRepertory: process.env.OOREP_MCP_DEFAULT_REPERTORY ?? 'publicum',
    defaultMateriaMedica: process.env.OOREP_MCP_DEFAULT_MATERIA_MEDICA ?? 'boericke',
  };

  // Parse CLI arguments (override env vars)
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--base-url':
        if (i + 1 >= args.length) throw new Error(`Missing value for ${arg}`);
        config.baseUrl = args[++i];
        break;
      case '--timeout': {
        if (i + 1 >= args.length) throw new Error(`Missing value for ${arg}`);
        const parsed = parseInt(args[++i], 10);
        if (isNaN(parsed)) throw new Error(`Invalid numeric value for ${arg}`);
        config.timeoutMs = parsed;
        break;
      }
      case '--cache-ttl': {
        if (i + 1 >= args.length) throw new Error(`Missing value for ${arg}`);
        const parsed = parseInt(args[++i], 10);
        if (isNaN(parsed)) throw new Error(`Invalid numeric value for ${arg}`);
        config.cacheTtlMs = parsed;
        break;
      }
      case '--max-results': {
        if (i + 1 >= args.length) throw new Error(`Missing value for ${arg}`);
        const parsed = parseInt(args[++i], 10);
        if (isNaN(parsed)) throw new Error(`Invalid numeric value for ${arg}`);
        config.maxResults = parsed;
        break;
      }
      case '--log-level':
        if (i + 1 >= args.length) throw new Error(`Missing value for ${arg}`);
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

  if (!['debug', 'info', 'warn', 'error'].includes(config.logLevel)) {
    throw new Error('OOREP_MCP_LOG_LEVEL must be one of: debug, info, warn, error');
  }
  if (config.cacheTtlMs < 0 || config.cacheTtlMs > 3600000) {
    throw new Error('OOREP_MCP_CACHE_TTL_MS must be between 0 and 3600000');
  }
  if (!config.defaultRepertory.trim()) {
    throw new Error('OOREP_MCP_DEFAULT_REPERTORY cannot be empty');
  }
  if (!config.defaultMateriaMedica.trim()) {
    throw new Error('OOREP_MCP_DEFAULT_MATERIA_MEDICA cannot be empty');
  }
  logger.info('Configuration loaded', {
    baseUrl: config.baseUrl,
    timeoutMs: config.timeoutMs,
    cacheTtlMs: config.cacheTtlMs,
    maxResults: config.maxResults,
    logLevel: config.logLevel,
    defaultRepertory: config.defaultRepertory,
    defaultMateriaMedica: config.defaultMateriaMedica,
  });

  return config;
}

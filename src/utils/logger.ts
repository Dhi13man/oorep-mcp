/**
 * Logging utilities for OOREP MCP server
 * All logs go to stderr to avoid interfering with stdout (MCP protocol)
 */

import type { ILogger, LogLevel } from '../interfaces/ILogger.js';

export type { LogLevel } from '../interfaces/ILogger.js';

/**
 * Console logger implementation
 * Implements ILogger interface for dependency injection
 */
export class ConsoleLogger implements ILogger {
  private level: LogLevel;
  private readonly levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(level: LogLevel = 'info') {
    this.level = level;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.level];
  }

  private formatMessage(level: LogLevel, message: string, ...args: unknown[]): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    const formattedArgs =
      args.length > 0 ? ' ' + args.map((arg) => JSON.stringify(arg)).join(' ') : '';
    return `${prefix} ${message}${formattedArgs}`;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.error(this.formatMessage('debug', message, ...args));
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.error(this.formatMessage('info', message, ...args));
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.error(this.formatMessage('warn', message, ...args));
    }
  }

  error(message: string, error?: Error | unknown, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      const errorInfo =
        error instanceof Error ? { message: error.message, stack: error.stack } : error;
      console.error(this.formatMessage('error', message, errorInfo, ...args));
    }
  }
}

/**
 * Backward compatibility: Logger class alias
 * @deprecated Use ConsoleLogger instead
 */
export const Logger = ConsoleLogger;

/**
 * Global logger instance for backward compatibility
 * @deprecated Inject ILogger instead of using global logger
 */
export const logger = new ConsoleLogger((process.env.OOREP_MCP_LOG_LEVEL as LogLevel) || 'info');

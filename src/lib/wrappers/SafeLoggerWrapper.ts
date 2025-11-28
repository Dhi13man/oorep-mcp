import type { ILogger, LogLevel } from '../../interfaces/ILogger.js';

/**
 * Safe logger wrapper that never throws
 * Protects against user-provided loggers that might fail
 *
 * This wrapper ensures that logging errors never crash the application.
 * If the wrapped logger throws, we fall back to console.error as a last resort.
 */
export class SafeLoggerWrapper implements ILogger {
  constructor(private logger: ILogger) {}

  debug(message: string, ...args: unknown[]): void {
    try {
      this.logger.debug(message, ...args);
    } catch (error) {
      // Silent fail - logging should never crash the app
      this.fallbackLog('debug', message, error);
    }
  }

  info(message: string, ...args: unknown[]): void {
    try {
      this.logger.info(message, ...args);
    } catch (error) {
      this.fallbackLog('info', message, error);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    try {
      this.logger.warn(message, ...args);
    } catch (error) {
      this.fallbackLog('warn', message, error);
    }
  }

  error(message: string, error?: Error | unknown, ...args: unknown[]): void {
    try {
      this.logger.error(message, error, ...args);
    } catch (err) {
      this.fallbackLog('error', message, err);
    }
  }

  setLevel(level: LogLevel): void {
    try {
      this.logger.setLevel?.(level);
    } catch (error) {
      this.fallbackLog('error', 'Failed to set log level', error);
    }
  }

  /**
   * Fallback logging when wrapped logger fails
   * Uses console.error as last resort
   */
  private fallbackLog(level: string, message: string, error: unknown): void {
    try {
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp}] [OOREP-${level.toUpperCase()}]`;
      console.error(`${prefix} ${message}`, error);
    } catch {
      // Last resort - do nothing if even console.error fails
      // We can't risk crashing the application
    }
  }
}

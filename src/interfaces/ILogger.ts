/**
 * Logger interface for dependency injection
 * Allows users to provide custom logging implementations
 */
export interface ILogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, error?: Error | unknown, ...args: unknown[]): void;

  /**
   * Set the minimum log level (optional)
   * Messages below this level will be suppressed
   *
   * @example
   * ```typescript
   * logger.setLevel?.('warn'); // Only warn and error messages will be logged
   * ```
   */
  setLevel?(level: LogLevel): void;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * No-op logger for when logging is disabled
 */
export class NoOpLogger implements ILogger {
  debug(_message: string, ..._args: unknown[]): void {
    // No-op
  }
  info(_message: string, ..._args: unknown[]): void {
    // No-op
  }
  warn(_message: string, ..._args: unknown[]): void {
    // No-op
  }
  error(_message: string, _error?: Error | unknown, ..._args: unknown[]): void {
    // No-op
  }
  setLevel(_level: LogLevel): void {
    // No-op
  }
}

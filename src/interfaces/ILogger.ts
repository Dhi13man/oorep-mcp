/**
 * Logger interface for dependency injection
 * Allows users to provide custom logging implementations
 */
export interface ILogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, error?: Error | unknown, ...args: unknown[]): void;
  setLevel?(level: LogLevel): void;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * No-op logger for when logging is disabled
 */
export class NoOpLogger implements ILogger {
  debug(): void {
    // No-op
  }
  info(): void {
    // No-op
  }
  warn(): void {
    // No-op
  }
  error(): void {
    // No-op
  }
  setLevel(): void {
    // No-op
  }
}

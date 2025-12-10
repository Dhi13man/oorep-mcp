/**
 * Custom error classes for OOREP MCP server
 */

/**
 * Base error class for all OOREP MCP errors
 */
export class OOREPError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'OOREPError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error for user-facing validation errors
 * These errors are safe to expose to users
 */
export class ValidationError extends OOREPError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'ValidationError';
  }
}

/**
 * Error for network/HTTP related issues
 */
export class NetworkError extends OOREPError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    cause?: Error
  ) {
    super(message, cause);
    this.name = 'NetworkError';
  }
}

/**
 * Error for timeout issues
 */
export class TimeoutError extends OOREPError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'TimeoutError';
  }
}

/**
 * Error for rate limiting
 */
export class RateLimitError extends OOREPError {
  constructor(
    message: string,
    public readonly retryAfter?: number,
    cause?: Error
  ) {
    super(message, cause);
    this.name = 'RateLimitError';
  }
}

/**
 * Error for OOREP API specific issues
 */
export class OOREPAPIError extends OOREPError {
  constructor(
    message: string,
    public readonly apiMessage?: string,
    cause?: Error
  ) {
    super(message, cause);
    this.name = 'OOREPAPIError';
  }
}

/**
 * Error for when a requested resource, tool, or prompt is not found
 */
export class NotFoundError extends OOREPError {
  constructor(
    message: string,
    public readonly resourceType: 'tool' | 'prompt' | 'resource',
    public readonly resourceName: string,
    cause?: Error
  ) {
    super(message, cause);
    this.name = 'NotFoundError';
  }
}

/**
 * Sanitizes errors before exposing to users
 * Hides internal implementation details
 */
export function sanitizeError(error: unknown): Error {
  if (error instanceof ValidationError || error instanceof RateLimitError) {
    // Safe to expose these errors to users
    return error;
  }

  if (error instanceof NotFoundError) {
    return new Error(`${error.resourceType} not found: ${error.resourceName}`);
  }

  if (error instanceof NetworkError) {
    return new Error(
      `Network error: ${error.message}${error.statusCode ? ` (HTTP ${error.statusCode})` : ''}`
    );
  }

  if (error instanceof OOREPAPIError) {
    return new Error(`OOREP API error: ${error.apiMessage || error.message}`);
  }

  if (error instanceof OOREPError) {
    return new Error(`An error occurred: ${error.message}`);
  }

  // Handle Zod validation errors
  if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
    const zodError = error as { issues?: Array<{ message: string; path: string[] }> };
    if (zodError.issues && zodError.issues.length > 0) {
      const firstIssue = zodError.issues[0];
      const field = firstIssue.path.join('.');
      return new ValidationError(
        `Validation error${field ? ` in ${field}` : ''}: ${firstIssue.message}`
      );
    }
    return new ValidationError('Validation error: Invalid input');
  }

  // Generic unknown error
  return new Error('An unexpected error occurred while processing your request');
}

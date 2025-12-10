/**
 * Unit tests for custom error classes
 */

import { describe, it, expect } from 'vitest';
import {
  OOREPError,
  ValidationError,
  NetworkError,
  TimeoutError,
  RateLimitError,
  OOREPAPIError,
  NotFoundError,
  sanitizeError,
} from './errors.js';

describe('OOREPError', () => {
  it('OOREPError when created with message then has correct properties', () => {
    const message = 'Test error message';
    const error = new OOREPError(message);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(OOREPError);
    expect(error.message).toBe(message);
    expect(error.name).toBe('OOREPError');
    expect(error.cause).toBeUndefined();
    expect(error.stack).toBeDefined();
  });

  it('OOREPError when created with cause then stores cause', () => {
    const message = 'Test error';
    const cause = new Error('Underlying error');
    const error = new OOREPError(message, cause);

    expect(error.message).toBe(message);
    expect(error.cause).toBe(cause);
  });
});

describe('ValidationError', () => {
  it('ValidationError when created then has correct name and properties', () => {
    const message = 'Invalid input';
    const error = new ValidationError(message);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(OOREPError);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toBe(message);
    expect(error.name).toBe('ValidationError');
  });

  it('ValidationError when created with cause then stores cause', () => {
    const message = 'Invalid input';
    const cause = new Error('Original error');
    const error = new ValidationError(message, cause);

    expect(error.cause).toBe(cause);
  });
});

describe('NetworkError', () => {
  it('NetworkError when created with status code then has correct properties', () => {
    const message = 'Network failure';
    const statusCode = 500;
    const error = new NetworkError(message, statusCode);

    expect(error).toBeInstanceOf(OOREPError);
    expect(error).toBeInstanceOf(NetworkError);
    expect(error.message).toBe(message);
    expect(error.name).toBe('NetworkError');
    expect(error.statusCode).toBe(statusCode);
  });

  it('NetworkError when created without status code then statusCode is undefined', () => {
    const error = new NetworkError('Network failure');

    expect(error.statusCode).toBeUndefined();
  });

  it('NetworkError when created with cause then stores cause', () => {
    const message = 'Network failure';
    const cause = new Error('Socket error');
    const error = new NetworkError(message, 503, cause);

    expect(error.cause).toBe(cause);
  });
});

describe('TimeoutError', () => {
  it('TimeoutError when created then has correct properties', () => {
    const message = 'Request timed out';
    const error = new TimeoutError(message);

    expect(error).toBeInstanceOf(OOREPError);
    expect(error).toBeInstanceOf(TimeoutError);
    expect(error.message).toBe(message);
    expect(error.name).toBe('TimeoutError');
  });

  it('TimeoutError when created with cause then stores cause', () => {
    const cause = new Error('Timeout cause');
    const error = new TimeoutError('Timeout', cause);

    expect(error.cause).toBe(cause);
  });
});

describe('RateLimitError', () => {
  it('RateLimitError when created with retryAfter then has correct properties', () => {
    const message = 'Rate limited';
    const retryAfter = 60;
    const error = new RateLimitError(message, retryAfter);

    expect(error).toBeInstanceOf(OOREPError);
    expect(error).toBeInstanceOf(RateLimitError);
    expect(error.message).toBe(message);
    expect(error.name).toBe('RateLimitError');
    expect(error.retryAfter).toBe(retryAfter);
  });

  it('RateLimitError when created without retryAfter then retryAfter is undefined', () => {
    const error = new RateLimitError('Rate limited');

    expect(error.retryAfter).toBeUndefined();
  });
});

describe('OOREPAPIError', () => {
  it('OOREPAPIError when created with apiMessage then has correct properties', () => {
    const message = 'API error';
    const apiMessage = 'Invalid query parameter';
    const error = new OOREPAPIError(message, apiMessage);

    expect(error).toBeInstanceOf(OOREPError);
    expect(error).toBeInstanceOf(OOREPAPIError);
    expect(error.message).toBe(message);
    expect(error.name).toBe('OOREPAPIError');
    expect(error.apiMessage).toBe(apiMessage);
  });

  it('OOREPAPIError when created without apiMessage then apiMessage is undefined', () => {
    const error = new OOREPAPIError('API error');

    expect(error.apiMessage).toBeUndefined();
  });
});

describe('NotFoundError', () => {
  it('NotFoundError when created for tool then has correct properties', () => {
    // Arrange
    const message = 'Tool not found';
    const resourceType = 'tool' as const;
    const resourceName = 'unknown_tool';

    // Act
    const error = new NotFoundError(message, resourceType, resourceName);

    // Assert
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(OOREPError);
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.message).toBe(message);
    expect(error.name).toBe('NotFoundError');
    expect(error.resourceType).toBe('tool');
    expect(error.resourceName).toBe('unknown_tool');
  });

  it('NotFoundError when created for prompt then has correct properties', () => {
    // Arrange
    const message = 'Prompt not found';
    const resourceType = 'prompt' as const;
    const resourceName = 'unknown_prompt';

    // Act
    const error = new NotFoundError(message, resourceType, resourceName);

    // Assert
    expect(error.resourceType).toBe('prompt');
    expect(error.resourceName).toBe('unknown_prompt');
  });

  it('NotFoundError when created for resource then has correct properties', () => {
    // Arrange
    const message = 'Resource not found';
    const resourceType = 'resource' as const;
    const resourceName = 'oorep://unknown';

    // Act
    const error = new NotFoundError(message, resourceType, resourceName);

    // Assert
    expect(error.resourceType).toBe('resource');
    expect(error.resourceName).toBe('oorep://unknown');
  });

  it('NotFoundError when created with cause then stores cause', () => {
    // Arrange
    const message = 'Not found';
    const cause = new Error('Original error');

    // Act
    const error = new NotFoundError(message, 'tool', 'test', cause);

    // Assert
    expect(error.cause).toBe(cause);
  });
});

describe('sanitizeError', () => {
  it('sanitizeError when ValidationError then returns same error', () => {
    const originalError = new ValidationError('Invalid input');
    const sanitized = sanitizeError(originalError);

    expect(sanitized).toBe(originalError);
  });

  it('sanitizeError when RateLimitError then returns same error', () => {
    const originalError = new RateLimitError('Too many requests', 120);
    const sanitized = sanitizeError(originalError);

    expect(sanitized).toBe(originalError);
  });

  it('sanitizeError when NotFoundError for tool then returns formatted error', () => {
    // Arrange
    const originalError = new NotFoundError('Tool not found', 'tool', 'unknown_tool');

    // Act
    const sanitized = sanitizeError(originalError);

    // Assert
    expect(sanitized).toBeInstanceOf(Error);
    expect(sanitized).not.toBeInstanceOf(NotFoundError);
    expect(sanitized.message).toBe('tool not found: unknown_tool');
  });

  it('sanitizeError when NotFoundError for prompt then returns formatted error', () => {
    // Arrange
    const originalError = new NotFoundError('Prompt not found', 'prompt', 'unknown_prompt');

    // Act
    const sanitized = sanitizeError(originalError);

    // Assert
    expect(sanitized.message).toBe('prompt not found: unknown_prompt');
  });

  it('sanitizeError when NotFoundError for resource then returns formatted error', () => {
    // Arrange
    const originalError = new NotFoundError('Resource not found', 'resource', 'oorep://unknown');

    // Act
    const sanitized = sanitizeError(originalError);

    // Assert
    expect(sanitized.message).toBe('resource not found: oorep://unknown');
  });

  it('sanitizeError when NetworkError with status code then returns generic error with status', () => {
    const originalError = new NetworkError('Internal server error', 500);
    const sanitized = sanitizeError(originalError);

    expect(sanitized).toBeInstanceOf(Error);
    expect(sanitized).not.toBeInstanceOf(NetworkError);
    expect(sanitized.message).toContain('Network error');
    expect(sanitized.message).toContain('500');
  });

  it('sanitizeError when NetworkError without status code then returns generic error', () => {
    const originalError = new NetworkError('Connection failed');
    const sanitized = sanitizeError(originalError);

    expect(sanitized.message).toContain('Network error');
    expect(sanitized.message).not.toContain('HTTP');
  });

  it('sanitizeError when OOREPAPIError with apiMessage then uses apiMessage', () => {
    const originalError = new OOREPAPIError('Error occurred', 'Invalid symptom format');
    const sanitized = sanitizeError(originalError);

    expect(sanitized).toBeInstanceOf(Error);
    expect(sanitized).not.toBeInstanceOf(OOREPAPIError);
    expect(sanitized.message).toContain('OOREP API error');
    expect(sanitized.message).toContain('Invalid symptom format');
  });

  it('sanitizeError when OOREPAPIError without apiMessage then uses message', () => {
    const originalError = new OOREPAPIError('Generic error');
    const sanitized = sanitizeError(originalError);

    expect(sanitized.message).toContain('OOREP API error');
    expect(sanitized.message).toContain('Generic error');
  });

  it('sanitizeError when generic OOREPError then returns generic message', () => {
    const originalError = new OOREPError('Internal error details');
    const sanitized = sanitizeError(originalError);

    expect(sanitized.message).toBe('An error occurred: Internal error details');
  });

  it('sanitizeError when ZodError with issues then returns ValidationError with field info', () => {
    const zodError = {
      name: 'ZodError',
      issues: [
        {
          message: 'Expected string, received number',
          path: ['symptom'],
        },
      ],
    };
    const sanitized = sanitizeError(zodError);

    expect(sanitized).toBeInstanceOf(ValidationError);
    expect(sanitized.message).toContain('Validation error');
    expect(sanitized.message).toContain('symptom');
    expect(sanitized.message).toContain('Expected string, received number');
  });

  it('sanitizeError when ZodError with nested path then includes full path', () => {
    const zodError = {
      name: 'ZodError',
      issues: [
        {
          message: 'Invalid value',
          path: ['config', 'timeout', 'ms'],
        },
      ],
    };
    const sanitized = sanitizeError(zodError);

    expect(sanitized).toBeInstanceOf(ValidationError);
    expect(sanitized.message).toContain('config.timeout.ms');
  });

  it('sanitizeError when ZodError without issues then returns generic ValidationError', () => {
    const zodError = {
      name: 'ZodError',
    };
    const sanitized = sanitizeError(zodError);

    expect(sanitized).toBeInstanceOf(ValidationError);
    expect(sanitized.message).toBe('Validation error: Invalid input');
  });

  it('sanitizeError when ZodError with empty issues array then returns generic ValidationError', () => {
    const zodError = {
      name: 'ZodError',
      issues: [],
    };
    const sanitized = sanitizeError(zodError);

    expect(sanitized).toBeInstanceOf(ValidationError);
    expect(sanitized.message).toBe('Validation error: Invalid input');
  });

  it('sanitizeError when ZodError with empty path then omits field prefix', () => {
    const zodError = {
      name: 'ZodError',
      issues: [
        {
          message: 'Invalid input',
          path: [],
        },
      ],
    };
    const sanitized = sanitizeError(zodError);

    expect(sanitized).toBeInstanceOf(ValidationError);
    expect(sanitized.message).toBe('Validation error: Invalid input');
  });

  it('sanitizeError when unknown error type then returns generic error', () => {
    const unknownError = new Error('Some other error');
    const sanitized = sanitizeError(unknownError);

    expect(sanitized).toBeInstanceOf(Error);
    expect(sanitized.message).toBe('An unexpected error occurred while processing your request');
  });

  it('sanitizeError when non-Error object then returns generic error', () => {
    const weirdError = { message: 'Not a real error' };
    const sanitized = sanitizeError(weirdError);

    expect(sanitized.message).toBe('An unexpected error occurred while processing your request');
  });

  it('sanitizeError when string then returns generic error', () => {
    const sanitized = sanitizeError('error string');

    expect(sanitized.message).toBe('An unexpected error occurred while processing your request');
  });

  it('sanitizeError when null then returns generic error', () => {
    const sanitized = sanitizeError(null);

    expect(sanitized.message).toBe('An unexpected error occurred while processing your request');
  });
});

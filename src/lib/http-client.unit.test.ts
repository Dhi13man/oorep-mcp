/**
 * Unit tests for FetchHttpClient
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FetchHttpClient } from './http-client.js';
import { HttpError } from '../interfaces/IHttpClient.js';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as typeof fetch;

describe('FetchHttpClient', () => {
  let client: FetchHttpClient;
  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('constructor_whenNoOptions_thenUsesDefaults', () => {
      // Arrange & Act
      const clientWithDefaults = new FetchHttpClient();

      // Assert
      expect(clientWithDefaults).toBeDefined();
    });

    it('constructor_whenCustomTimeout_thenStoresTimeout', () => {
      // Arrange
      const customTimeout = 60000;

      // Act
      client = new FetchHttpClient({ timeout: customTimeout });

      // Assert
      expect(client).toBeDefined();
    });

    it('constructor_whenLoggerProvided_thenStoresLogger', () => {
      // Arrange & Act
      client = new FetchHttpClient({ logger: mockLogger });

      // Assert
      expect(client).toBeDefined();
    });
  });

  describe('GET requests', () => {
    beforeEach(() => {
      client = new FetchHttpClient({ logger: mockLogger, timeout: 5000 });
    });

    it('get_whenSuccessful_thenReturnsData', async () => {
      // Arrange
      const url = 'https://api.test.com/data';
      const responseData = { id: 1, name: 'Test' };
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        text: vi.fn().mockResolvedValue(JSON.stringify(responseData)),
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      const result = await client.get(url);

      // Assert
      expect(result.status).toBe(200);
      expect(result.data).toEqual(responseData);
      expect(result.ok).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith('HTTP GET https://api.test.com/data');
    });

    it('get_whenEmptyResponse_thenReturnsNull', async () => {
      // Arrange
      const url = 'https://api.test.com/empty';
      const mockResponse = {
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: new Headers(),
        text: vi.fn().mockResolvedValue(''),
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      const result = await client.get(url);

      // Assert
      expect(result.data).toBeNull();
      expect(result.status).toBe(204);
    });

    it('get_whenNonJsonResponse_thenReturnsText', async () => {
      // Arrange
      const url = 'https://api.test.com/text';
      const textResponse = 'Plain text response';
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        text: vi.fn().mockResolvedValue(textResponse),
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      const result = await client.get(url);

      // Assert
      expect(result.data).toBe(textResponse);
    });

    it('get_when404Error_thenThrowsHttpError', async () => {
      // Arrange
      const url = 'https://api.test.com/notfound';
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
        text: vi.fn().mockResolvedValue(''),
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(client.get(url)).rejects.toThrow(HttpError);
      await expect(client.get(url)).rejects.toMatchObject({
        status: 404,
      });
    });

    it('get_when500Error_thenThrowsHttpError', async () => {
      // Arrange
      const url = 'https://api.test.com/error';
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers(),
        text: vi.fn().mockResolvedValue(''),
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(client.get(url)).rejects.toThrow(HttpError);
    });

    it('get_whenTimeout_thenThrowsTimeoutError', async () => {
      // Arrange
      const url = 'https://api.test.com/slow';
      let abortCalled = false;
      mockFetch.mockImplementation((_, options) => {
        return new Promise((_, reject) => {
          const signal = options?.signal;
          if (signal) {
            signal.addEventListener('abort', () => {
              abortCalled = true;
              const error = new Error('The operation was aborted');
              error.name = 'AbortError';
              reject(error);
            });
          }
        });
      });

      // Act & Assert
      const promise = client.get(url);
      const errorPromise = expect(promise).rejects.toThrow('Request timeout after 5000ms');

      // Fast-forward time to trigger timeout
      await vi.runAllTimersAsync();
      await errorPromise;

      expect(abortCalled).toBe(true);
    });

    it('get_whenCustomTimeout_thenUsesCustomTimeout', async () => {
      // Arrange
      const url = 'https://api.test.com/slow';
      let abortCalled = false;
      mockFetch.mockImplementation((_, options) => {
        return new Promise((_, reject) => {
          const signal = options?.signal;
          if (signal) {
            signal.addEventListener('abort', () => {
              abortCalled = true;
              const error = new Error('The operation was aborted');
              error.name = 'AbortError';
              reject(error);
            });
          }
        });
      });

      // Act & Assert
      const promise = client.get(url, { timeout: 1000 });
      const errorPromise = expect(promise).rejects.toThrow('Request timeout after 1000ms');

      // Fast-forward time to trigger timeout
      await vi.runAllTimersAsync();
      await errorPromise;

      expect(abortCalled).toBe(true);
    });

    it('get_whenCustomHeaders_thenIncludesHeaders', async () => {
      // Arrange
      const url = 'https://api.test.com/data';
      const customHeaders = { Authorization: 'Bearer token123' };
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        text: vi.fn().mockResolvedValue('{}'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      await client.get(url, { headers: customHeaders });

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        url,
        expect.objectContaining({
          headers: customHeaders,
        })
      );
    });

    it('get_whenCustomSignal_thenUsesCustomSignal', async () => {
      // Arrange
      const url = 'https://api.test.com/data';
      const abortController = new AbortController();
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        text: vi.fn().mockResolvedValue('{}'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      await client.get(url, { signal: abortController.signal });

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        url,
        expect.objectContaining({
          signal: abortController.signal,
        })
      );
    });

    it('get_whenResponseHasHeaders_thenExtractsHeaders', async () => {
      // Arrange
      const url = 'https://api.test.com/data';
      const headers = new Headers({
        'content-type': 'application/json',
        'x-custom-header': 'custom-value',
      });
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers,
        text: vi.fn().mockResolvedValue('{}'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      const result = await client.get(url);

      // Assert
      expect(result.headers.get('content-type')).toBe('application/json');
      expect(result.headers.get('x-custom-header')).toBe('custom-value');
    });
  });

  describe('POST requests', () => {
    beforeEach(() => {
      client = new FetchHttpClient({ logger: mockLogger });
    });

    it('post_whenWithBody_thenSendsJsonBody', async () => {
      // Arrange
      const url = 'https://api.test.com/create';
      const body = { name: 'New Item', value: 42 };
      const mockResponse = {
        ok: true,
        status: 201,
        statusText: 'Created',
        headers: new Headers(),
        text: vi.fn().mockResolvedValue(JSON.stringify({ id: 1, ...body })),
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      await client.post(url, body);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        url,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
        })
      );
    });

    it('post_whenNoBody_thenSendsUndefined', async () => {
      // Arrange
      const url = 'https://api.test.com/action';
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        text: vi.fn().mockResolvedValue('{}'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      await client.post(url);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        url,
        expect.objectContaining({
          method: 'POST',
          body: undefined,
        })
      );
    });
  });

  describe('PUT requests', () => {
    beforeEach(() => {
      client = new FetchHttpClient({ logger: mockLogger });
    });

    it('put_whenWithBody_thenSendsJsonBody', async () => {
      // Arrange
      const url = 'https://api.test.com/update/1';
      const body = { name: 'Updated Item' };
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        text: vi.fn().mockResolvedValue(JSON.stringify(body)),
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      await client.put(url, body);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        url,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(body),
        })
      );
    });
  });

  describe('DELETE requests', () => {
    beforeEach(() => {
      client = new FetchHttpClient({ logger: mockLogger });
    });

    it('delete_whenSuccessful_thenReturnsResponse', async () => {
      // Arrange
      const url = 'https://api.test.com/delete/1';
      const mockResponse = {
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: new Headers(),
        text: vi.fn().mockResolvedValue(''),
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      const result = await client.delete(url);

      // Assert
      expect(result.status).toBe(204);
      expect(mockFetch).toHaveBeenCalledWith(
        url,
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      client = new FetchHttpClient({ logger: mockLogger });
    });

    it('request_whenNetworkError_thenThrowsError', async () => {
      // Arrange
      const url = 'https://api.test.com/data';
      const networkError = new Error('Network failure');
      mockFetch.mockRejectedValue(networkError);

      // Act & Assert
      await expect(client.get(url)).rejects.toThrow(networkError);
    });

    it('request_whenHttpErrorWithBody_thenIncludesBodyInError', async () => {
      // Arrange
      const url = 'https://api.test.com/data';
      const errorBody = { error: 'Invalid request', code: 'ERR_001' };
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers(),
        text: vi.fn().mockResolvedValue(JSON.stringify(errorBody)),
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Act & Assert
      try {
        await client.get(url);
        expect.fail('Should have thrown HttpError');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpError);
        if (error instanceof HttpError) {
          expect(error.response.data).toEqual(errorBody);
          expect(error.status).toBe(400);
        }
      }
    });
  });
});

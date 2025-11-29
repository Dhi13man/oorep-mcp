/**
 * Unit tests for CookieSessionManager
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CookieSessionManager } from './session-manager.js';
import type { IHttpClient, HttpResponse } from '../interfaces/IHttpClient.js';

describe('CookieSessionManager', () => {
  let manager: CookieSessionManager;
  let mockHttpClient: IHttpClient;
  let mockLogger: {
    debug: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };
  const baseUrl = 'https://api.test.com';

  beforeEach(() => {
    vi.clearAllMocks();

    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
  });

  describe('ensureSession', () => {
    it('ensureSession_whenNoCookies_thenBootstrapsSession', async () => {
      // Arrange
      const mockResponse: HttpResponse<unknown> = {
        status: 200,
        statusText: 'OK',
        ok: true,
        headers: new Map([['set-cookie', 'session=abc123; Path=/']]),
        data: {},
      };
      mockHttpClient.get = vi.fn().mockResolvedValue(mockResponse);
      manager = new CookieSessionManager(mockHttpClient, baseUrl, mockLogger);

      // Act
      await manager.ensureSession();

      // Assert
      expect(mockHttpClient.get).toHaveBeenCalledWith(`${baseUrl}/api/available_remedies?limit=1`);
      expect(mockLogger.debug).toHaveBeenCalledWith('Initializing OOREP session', {
        url: `${baseUrl}/api/available_remedies?limit=1`,
      });
    });

    it('ensureSession_whenAlreadyHasCookies_thenDoesNotBootstrap', async () => {
      // Arrange
      const mockResponse: HttpResponse<unknown> = {
        status: 200,
        statusText: 'OK',
        ok: true,
        headers: new Map([['set-cookie', 'session=abc123']]),
        data: {},
      };
      mockHttpClient.get = vi.fn().mockResolvedValue(mockResponse);
      manager = new CookieSessionManager(mockHttpClient, baseUrl, mockLogger);

      // Act - first call bootstraps
      await manager.ensureSession();
      vi.clearAllMocks();

      // Act - second call should not bootstrap
      await manager.ensureSession();

      // Assert
      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });

    it('ensureSession_whenForceRefresh_thenBootstrapsAgain', async () => {
      // Arrange
      const mockResponse: HttpResponse<unknown> = {
        status: 200,
        statusText: 'OK',
        ok: true,
        headers: new Map([['set-cookie', 'session=xyz789']]),
        data: {},
      };
      mockHttpClient.get = vi.fn().mockResolvedValue(mockResponse);
      manager = new CookieSessionManager(mockHttpClient, baseUrl, mockLogger);

      // Act - first call
      await manager.ensureSession();
      expect(mockHttpClient.get).toHaveBeenCalledTimes(1);

      // Act - force refresh
      await manager.ensureSession(true);

      // Assert
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
    });

    it('ensureSession_whenConcurrentCalls_thenBootstrapsOnce', async () => {
      // Arrange
      const mockResponse: HttpResponse<unknown> = {
        status: 200,
        statusText: 'OK',
        ok: true,
        headers: new Map([['set-cookie', 'session=concurrent123']]),
        data: {},
      };
      let resolveBootstrap: ((value: HttpResponse<unknown>) => void) | null = null;
      const bootstrapPromise = new Promise<HttpResponse<unknown>>((resolve) => {
        resolveBootstrap = resolve;
      });
      mockHttpClient.get = vi.fn().mockReturnValue(bootstrapPromise);
      manager = new CookieSessionManager(mockHttpClient, baseUrl, mockLogger);

      // Act - make 3 concurrent calls
      const promises = [manager.ensureSession(), manager.ensureSession(), manager.ensureSession()];

      // Resolve the bootstrap
      resolveBootstrap!(mockResponse);
      await Promise.all(promises);

      // Assert - should only bootstrap once
      expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
    });

    it('ensureSession_whenBootstrapFails_thenThrowsError', async () => {
      // Arrange - httpClient.get() throws HttpError for non-ok responses
      const httpError = new Error('HTTP 500: Internal Server Error');
      mockHttpClient.get = vi.fn().mockRejectedValue(httpError);
      manager = new CookieSessionManager(mockHttpClient, baseUrl, mockLogger);

      // Act & Assert
      await expect(manager.ensureSession()).rejects.toThrow('HTTP 500: Internal Server Error');
    });

    it('ensureSession_whenNetworkError_thenThrowsError', async () => {
      // Arrange
      const networkError = new Error('Network failure');
      mockHttpClient.get = vi.fn().mockRejectedValue(networkError);
      manager = new CookieSessionManager(mockHttpClient, baseUrl, mockLogger);

      // Act & Assert
      await expect(manager.ensureSession()).rejects.toThrow('Network failure');
    });
  });

  describe('cookie management', () => {
    it('getAuthHeaders_whenNoCookies_thenReturnsEmpty', () => {
      // Arrange
      manager = new CookieSessionManager(mockHttpClient, baseUrl, mockLogger);

      // Act
      const headers = manager.getAuthHeaders();

      // Assert
      expect(headers).toEqual({});
    });

    it('getAuthHeaders_whenHasCookies_thenReturnsCookieHeader', async () => {
      // Arrange
      const mockResponse: HttpResponse<unknown> = {
        status: 200,
        statusText: 'OK',
        ok: true,
        headers: new Map([['set-cookie', 'session=abc123; Path=/']]),
        data: {},
      };
      mockHttpClient.get = vi.fn().mockResolvedValue(mockResponse);
      manager = new CookieSessionManager(mockHttpClient, baseUrl, mockLogger);

      // Act
      await manager.ensureSession();
      const headers = manager.getAuthHeaders();

      // Assert
      expect(headers).toEqual({
        Cookie: 'session=abc123',
      });
    });

    it('getAuthHeaders_whenMultipleCookies_thenJoinsWithSemicolon', async () => {
      // Arrange
      const mockResponse: HttpResponse<unknown> = {
        status: 200,
        statusText: 'OK',
        ok: true,
        headers: new Map([
          ['set-cookie', 'session=abc123'],
          ['Set-Cookie', 'user=john'],
        ]),
        data: {},
      };
      mockHttpClient.get = vi.fn().mockResolvedValue(mockResponse);
      manager = new CookieSessionManager(mockHttpClient, baseUrl, mockLogger);

      // Act
      await manager.ensureSession();
      const headers = manager.getAuthHeaders();

      // Assert
      expect(headers.Cookie).toContain('session=abc123');
      expect(headers.Cookie).toContain('user=john');
      expect(headers.Cookie).toContain(';');
    });

    it('handleResponse_whenSetCookieHeaders_thenStoresCookies', () => {
      // Arrange
      manager = new CookieSessionManager(mockHttpClient, baseUrl, mockLogger);
      const response: HttpResponse<unknown> = {
        status: 200,
        statusText: 'OK',
        ok: true,
        headers: new Map([['set-cookie', 'newcookie=value123']]),
        data: {},
      };

      // Act
      manager.handleResponse(response);
      const headers = manager.getAuthHeaders();

      // Assert
      expect(headers.Cookie).toBe('newcookie=value123');
    });

    it('handleResponse_whenNoSetCookieHeaders_thenDoesNothing', () => {
      // Arrange
      manager = new CookieSessionManager(mockHttpClient, baseUrl, mockLogger);
      const response: HttpResponse<unknown> = {
        status: 200,
        statusText: 'OK',
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        data: {},
      };

      // Act
      manager.handleResponse(response);
      const headers = manager.getAuthHeaders();

      // Assert
      expect(headers).toEqual({});
    });
  });

  describe('clearSession', () => {
    it('clearSession_whenCalled_thenRemovesAllCookies', async () => {
      // Arrange
      const mockResponse: HttpResponse<unknown> = {
        status: 200,
        statusText: 'OK',
        ok: true,
        headers: new Map([['set-cookie', 'session=abc123']]),
        data: {},
      };
      mockHttpClient.get = vi.fn().mockResolvedValue(mockResponse);
      manager = new CookieSessionManager(mockHttpClient, baseUrl, mockLogger);

      // Act - establish session
      await manager.ensureSession();
      expect(manager.getAuthHeaders()).not.toEqual({});

      // Act - clear session
      manager.clearSession();

      // Assert
      expect(manager.getAuthHeaders()).toEqual({});
    });
  });

  describe('cookie parsing edge cases', () => {
    it('handleResponse_whenCookieHasEqualsInValue_thenParsesCorrectly', () => {
      // Arrange
      manager = new CookieSessionManager(mockHttpClient, baseUrl, mockLogger);
      const response: HttpResponse<unknown> = {
        status: 200,
        statusText: 'OK',
        ok: true,
        headers: new Map([['set-cookie', 'data=a=b=c; Path=/']]),
        data: {},
      };

      // Act
      manager.handleResponse(response);
      const headers = manager.getAuthHeaders();

      // Assert
      expect(headers.Cookie).toBe('data=a=b=c');
    });

    it('handleResponse_whenCookieHasAttributes_thenIgnoresAttributes', () => {
      // Arrange
      manager = new CookieSessionManager(mockHttpClient, baseUrl, mockLogger);
      const response: HttpResponse<unknown> = {
        status: 200,
        statusText: 'OK',
        ok: true,
        headers: new Map([
          ['set-cookie', 'session=xyz; Path=/; HttpOnly; Secure; SameSite=Strict'],
        ]),
        data: {},
      };

      // Act
      manager.handleResponse(response);
      const headers = manager.getAuthHeaders();

      // Assert
      expect(headers.Cookie).toBe('session=xyz');
    });

    it('handleResponse_whenEmptyCookieValue_thenIgnores', () => {
      // Arrange
      manager = new CookieSessionManager(mockHttpClient, baseUrl, mockLogger);
      const response: HttpResponse<unknown> = {
        status: 200,
        statusText: 'OK',
        ok: true,
        headers: new Map([['set-cookie', 'empty=; Path=/']]),
        data: {},
      };

      // Act
      manager.handleResponse(response);
      const headers = manager.getAuthHeaders();

      // Assert
      expect(headers).toEqual({});
    });

    it('handleResponse_whenMalformedCookie_thenIgnores', () => {
      // Arrange
      manager = new CookieSessionManager(mockHttpClient, baseUrl, mockLogger);
      const response: HttpResponse<unknown> = {
        status: 200,
        statusText: 'OK',
        ok: true,
        headers: new Map([['set-cookie', 'invalid']]),
        data: {},
      };

      // Act
      manager.handleResponse(response);
      const headers = manager.getAuthHeaders();

      // Assert
      expect(headers).toEqual({});
    });

    it('handleResponse_whenCaseInsensitiveSetCookie_thenParsesCorrectly', () => {
      // Arrange
      manager = new CookieSessionManager(mockHttpClient, baseUrl, mockLogger);
      const response: HttpResponse<unknown> = {
        status: 200,
        statusText: 'OK',
        ok: true,
        headers: new Map([
          ['Set-Cookie', 'cookie1=value1'],
          ['SET-COOKIE', 'cookie2=value2'],
          ['set-cookie', 'cookie3=value3'],
        ]),
        data: {},
      };

      // Act
      manager.handleResponse(response);
      const headers = manager.getAuthHeaders();

      // Assert
      expect(headers.Cookie).toContain('cookie1=value1');
      expect(headers.Cookie).toContain('cookie2=value2');
      expect(headers.Cookie).toContain('cookie3=value3');
    });
  });
});

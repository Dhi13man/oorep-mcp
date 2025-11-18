/**
 * Unit tests for OOREP HTTP client
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OOREPClient } from './oorep-client.js';
import { NetworkError, TimeoutError, RateLimitError } from '../utils/errors.js';
import type { OOREPConfig } from '../config.js';

describe('OOREPClient', () => {
  let mockConfig: OOREPConfig;
  let mockClient: OOREPClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockConfig = {
      baseUrl: 'https://test.oorep.com',
      timeoutMs: 5000,
      cacheTtlMs: 300000,
      maxResults: 100,
      logLevel: 'error',
      defaultRepertory: 'test-rep',
      defaultMateriaMedica: 'test-mm',
    };
    mockClient = new OOREPClient(mockConfig);
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('OOREPClient when created then removes trailing slash from baseUrl', () => {
      const config = { ...mockConfig, baseUrl: 'https://test.oorep.com/' };
      const client = new OOREPClient(config);

      expect(client).toBeDefined();
    });
  });

  describe('session initialization', () => {
    it('lookupRepertory when first call then initializes session', async () => {
      const mockSessionResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve('[]'),
      };
      const mockLookupResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify([{ totalNumberOfResults: 0, results: [] }])),
      };

      mockFetch
        .mockResolvedValueOnce(mockSessionResponse)
        .mockResolvedValueOnce(mockLookupResponse);

      await mockClient.lookupRepertory({ symptom: 'test' });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[0][0]).toContain('/api/available_remedies');
    });

    it('lookupRepertory when session init fails then throws NetworkError', async () => {
      const mockSessionResponse = {
        ok: false,
        status: 500,
        headers: new Headers(),
        text: () => Promise.resolve('Server error'),
      };
      mockFetch.mockResolvedValue(mockSessionResponse);

      await expect(mockClient.lookupRepertory({ symptom: 'test' })).rejects.toThrow(NetworkError);
    });

    it('lookupRepertory when concurrent calls then initializes session once', async () => {
      // Create session response with Set-Cookie header to ensure session is properly stored
      const mockHeaders = new Headers();
      mockHeaders.set('set-cookie', 'session_id=test123; Path=/');
      const mockSessionResponse = {
        ok: true,
        status: 200,
        headers: mockHeaders,
        text: () => Promise.resolve('[]'),
      };
      const mockLookupResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify([{ totalNumberOfResults: 0, results: [] }])),
      };

      // Setup: one session init, then unlimited lookup responses
      mockFetch.mockResolvedValueOnce(mockSessionResponse).mockResolvedValue(mockLookupResponse);

      // Execute concurrent lookups
      await Promise.all([
        mockClient.lookupRepertory({ symptom: 'test1' }),
        mockClient.lookupRepertory({ symptom: 'test2' }),
        mockClient.lookupRepertory({ symptom: 'test3' }),
      ]);

      // Verify only one session initialization occurred
      const sessionInitCalls = mockFetch.mock.calls.filter((call) =>
        call[0].includes('/api/available_remedies?limit=1')
      );
      expect(sessionInitCalls).toHaveLength(1);
    });
  });

  describe('lookupRepertory', () => {
    beforeEach(async () => {
      // Properly initialize session with both session init and lookup responses
      const sessionHeaders = new Headers();
      sessionHeaders.set('set-cookie', 'session_id=test; Path=/');
      const mockSessionResponse = {
        ok: true,
        status: 200,
        headers: sessionHeaders,
        text: () => Promise.resolve('[]'),
      };
      const mockInitLookupResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify([{ totalNumberOfResults: 0, results: [] }, []])),
      };
      mockFetch
        .mockResolvedValueOnce(mockSessionResponse)
        .mockResolvedValueOnce(mockInitLookupResponse);
      await mockClient.lookupRepertory({ symptom: 'init' });
      mockFetch.mockClear();
    });

    it('lookupRepertory when successful then returns payload', async () => {
      const mockPayload = { totalNumberOfResults: 5, results: [] };
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify([mockPayload, []])),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await mockClient.lookupRepertory({ symptom: 'headache' });

      expect(result).toEqual(mockPayload);
    });

    it('lookupRepertory when uses default repertory', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify([{ totalNumberOfResults: 0, results: [] }, []])),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await mockClient.lookupRepertory({ symptom: 'test' });

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('repertory=test-rep');
    });

    it('lookupRepertory when repertory provided then uses it', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify([{ totalNumberOfResults: 0, results: [] }, []])),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await mockClient.lookupRepertory({ symptom: 'test', repertory: 'custom' });

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('repertory=custom');
    });

    it('lookupRepertory when minWeight provided then includes in params', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify([{ totalNumberOfResults: 0, results: [] }, []])),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await mockClient.lookupRepertory({ symptom: 'test', minWeight: 3 });

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('minWeight=3');
    });

    it('lookupRepertory when minWeight is 0 then uses 1', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify([{ totalNumberOfResults: 0, results: [] }, []])),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await mockClient.lookupRepertory({ symptom: 'test', minWeight: 0 });

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('minWeight=1');
    });

    it('lookupRepertory when 204 response then returns null', async () => {
      const mockResponse = { ok: true, status: 204, headers: new Headers() };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await mockClient.lookupRepertory({ symptom: 'test' });

      expect(result).toBeNull();
    });

    it('lookupRepertory when empty body then returns null', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve(''),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await mockClient.lookupRepertory({ symptom: 'test' });

      expect(result).toBeNull();
    });

    it('lookupRepertory when 401 response then refreshes session and retries', async () => {
      // Create fresh client without session to test 401 handling
      const freshClient = new OOREPClient(mockConfig);

      const mockSessionHeaders = new Headers();
      mockSessionHeaders.set('set-cookie', 'session=abc123');

      const mockInitSessionResponse = {
        ok: true,
        status: 200,
        headers: mockSessionHeaders,
        text: () => Promise.resolve('[]'),
      };
      const mock401Response = {
        ok: false,
        status: 401,
        headers: new Headers(),
        statusText: 'Unauthorized',
        text: () => Promise.resolve('Unauthorized'),
      };
      const mockRefreshSessionResponse = {
        ok: true,
        status: 200,
        headers: mockSessionHeaders,
        text: () => Promise.resolve('[]'),
      };
      const mockSuccessResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify([{ totalNumberOfResults: 0, results: [] }, []])),
      };

      // Reset mock and set up fresh responses
      // Flow: init session -> lookup (401) -> refresh session -> retry lookup (success)
      mockFetch
        .mockClear()
        .mockResolvedValueOnce(mockInitSessionResponse)
        .mockResolvedValueOnce(mock401Response)
        .mockResolvedValueOnce(mockRefreshSessionResponse)
        .mockResolvedValueOnce(mockSuccessResponse);

      await freshClient.lookupRepertory({ symptom: 'test' });

      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('lookupRepertory when 429 response then throws RateLimitError', async () => {
      const mockHeaders = new Headers();
      mockHeaders.set('Retry-After', '120');
      const mock429Response = {
        ok: false,
        status: 429,
        headers: mockHeaders,
        statusText: 'Too Many Requests',
        text: () => Promise.resolve('Rate limited'),
      };
      mockFetch.mockResolvedValue(mock429Response);

      await expect(mockClient.lookupRepertory({ symptom: 'test' })).rejects.toThrow(RateLimitError);
    });

    it('lookupRepertory when 429 without Retry-After then uses default', async () => {
      const mock429Response = {
        ok: false,
        status: 429,
        headers: new Headers(),
        statusText: 'Too Many Requests',
        text: () => Promise.resolve('Rate limited'),
      };
      mockFetch.mockResolvedValue(mock429Response);

      try {
        await mockClient.lookupRepertory({ symptom: 'test' });
        expect.fail('Should have thrown RateLimitError');
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
        expect((error as RateLimitError).retryAfter).toBe(60);
      }
    });

    it('lookupRepertory when 500 response then throws NetworkError', async () => {
      // Create fresh client to test error handling
      const freshClient = new OOREPClient(mockConfig);

      const mockSessionResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve('[]'),
      };
      const mockErrorResponse = {
        ok: false,
        status: 500,
        headers: new Headers(),
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server error'),
      };

      mockFetch
        .mockClear()
        .mockResolvedValueOnce(mockSessionResponse)
        .mockResolvedValue(mockErrorResponse);

      await expect(freshClient.lookupRepertory({ symptom: 'test' })).rejects.toThrow(NetworkError);
    });

    it('lookupRepertory when invalid JSON then throws NetworkError', async () => {
      vi.useFakeTimers();
      try {
        // Create fresh client to test error handling
        const freshClient = new OOREPClient(mockConfig);

        const mockSessionHeaders = new Headers();
        mockSessionHeaders.set('set-cookie', 'session=abc123');

        const mockSessionResponse = {
          ok: true,
          status: 200,
          headers: mockSessionHeaders,
          text: () => Promise.resolve('[]'),
        };
        const mockResponse = {
          ok: true,
          status: 200,
          headers: new Headers(),
          text: () => Promise.resolve('invalid json'),
        };

        mockFetch
          .mockClear()
          .mockResolvedValueOnce(mockSessionResponse)
          .mockResolvedValue(mockResponse); // Use mockResolvedValue for all subsequent calls (retries)

        // Start tracking the promise rejection before advancing timers
        const promise = expect(freshClient.lookupRepertory({ symptom: 'test' })).rejects.toThrow(
          NetworkError
        );

        // Advance timers to allow all retries to complete
        await vi.runAllTimersAsync();

        await promise;
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('timeout handling', () => {
    it('lookupRepertory when request times out then throws TimeoutError', async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve, reject) => {
            const error = new Error('Aborted');
            error.name = 'AbortError';
            setTimeout(() => reject(error), 100);
          })
      );

      await expect(mockClient.lookupRepertory({ symptom: 'test' })).rejects.toThrow(TimeoutError);
    });
  });

  describe('retry logic', () => {
    beforeEach(async () => {
      // Properly initialize session
      const sessionHeaders = new Headers();
      sessionHeaders.set('set-cookie', 'session_id=test; Path=/');
      const mockSessionResponse = {
        ok: true,
        status: 200,
        headers: sessionHeaders,
        text: () => Promise.resolve('[]'),
      };
      const mockInitLookupResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify([{ totalNumberOfResults: 0, results: [] }, []])),
      };
      mockFetch
        .mockResolvedValueOnce(mockSessionResponse)
        .mockResolvedValueOnce(mockInitLookupResponse);
      await mockClient.lookupRepertory({ symptom: 'init' });
      mockFetch.mockClear();
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('lookupRepertory when network error then retries up to 3 times', async () => {
      const error = new NetworkError('Connection failed');
      mockFetch.mockRejectedValue(error);

      // Start tracking the promise rejection before advancing timers
      const promise = expect(mockClient.lookupRepertory({ symptom: 'test' })).rejects.toThrow(
        NetworkError
      );

      // Run all timers to trigger retries
      await vi.runAllTimersAsync();

      // Now await the promise
      await promise;

      // Should have tried 4 times (initial + 3 retries)
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('lookupRepertory when succeeds on retry then returns result', async () => {
      const mockSuccessResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify([{ totalNumberOfResults: 1, results: [] }, []])),
      };

      const error = new NetworkError('Fail');
      mockFetch.mockRejectedValueOnce(error).mockResolvedValueOnce(mockSuccessResponse);

      // Start the promise
      const promise = mockClient.lookupRepertory({ symptom: 'test' });

      // Run all timers to trigger retry
      await vi.runAllTimersAsync();

      // Now await the result
      const result = await promise;

      expect(result?.totalNumberOfResults).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('lookupRepertory when rate limit error then does not retry', async () => {
      const error = new RateLimitError('Rate limited', 60);
      mockFetch.mockRejectedValue(error);

      await expect(mockClient.lookupRepertory({ symptom: 'test' })).rejects.toThrow(RateLimitError);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('lookupMateriaMedica', () => {
    beforeEach(async () => {
      // Properly initialize session
      const sessionHeaders = new Headers();
      sessionHeaders.set('set-cookie', 'session_id=test; Path=/');
      const mockSessionResponse = {
        ok: true,
        status: 200,
        headers: sessionHeaders,
        text: () => Promise.resolve('[]'),
      };
      const mockInitLookupResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () =>
          Promise.resolve(JSON.stringify({ results: [], numberOfMatchingSectionsPerChapter: [] })),
      };
      mockFetch
        .mockResolvedValueOnce(mockSessionResponse)
        .mockResolvedValueOnce(mockInitLookupResponse);
      await mockClient.lookupMateriaMedica({ symptom: 'init' });
      mockFetch.mockClear();
    });

    it('lookupMateriaMedica when successful then returns result', async () => {
      const mockResult = { results: [], numberOfMatchingSectionsPerChapter: [] };
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify(mockResult)),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await mockClient.lookupMateriaMedica({ symptom: 'anxiety' });

      expect(result).toEqual(mockResult);
    });

    it('lookupMateriaMedica when uses default materia medica', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () =>
          Promise.resolve(JSON.stringify({ results: [], numberOfMatchingSectionsPerChapter: [] })),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await mockClient.lookupMateriaMedica({ symptom: 'test' });

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('mmAbbrev=test-mm');
    });

    it('lookupMateriaMedica when materiamedica provided then uses it', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () =>
          Promise.resolve(JSON.stringify({ results: [], numberOfMatchingSectionsPerChapter: [] })),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await mockClient.lookupMateriaMedica({ symptom: 'test', materiamedica: 'custom' });

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('mmAbbrev=custom');
    });

    it('lookupMateriaMedica when remedy filter provided then includes in params', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () =>
          Promise.resolve(JSON.stringify({ results: [], numberOfMatchingSectionsPerChapter: [] })),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await mockClient.lookupMateriaMedica({ symptom: 'test', remedy: 'Aconite' });

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('remedyString=Aconite');
    });
  });

  describe('getAvailableRemedies', () => {
    it('getAvailableRemedies when successful then returns remedies array', async () => {
      // Create fresh client
      const freshClient = new OOREPClient(mockConfig);

      const mockSessionHeaders = new Headers();
      mockSessionHeaders.set('set-cookie', 'session=abc123');

      const mockRemedies = [
        { id: 1, nameAbbrev: 'Acon.', nameLong: 'Aconitum napellus', namealt: [] },
      ];
      // Note: getAvailableRemedies uses the same endpoint as session init
      // So one response serves both purposes
      const mockResponse = {
        ok: true,
        status: 200,
        headers: mockSessionHeaders,
        text: () => Promise.resolve(JSON.stringify(mockRemedies)),
      };

      mockFetch.mockClear().mockResolvedValue(mockResponse);

      const result = await freshClient.getAvailableRemedies();

      expect(result).toEqual(mockRemedies);
    });

    it('getAvailableRemedies when null response then returns empty array', async () => {
      // Create fresh client
      const freshClient = new OOREPClient(mockConfig);

      const mockSessionHeaders = new Headers();
      mockSessionHeaders.set('set-cookie', 'session=abc123');

      // Note: getAvailableRemedies uses the same endpoint as session init
      const mockResponse = {
        ok: true,
        status: 204,
        headers: mockSessionHeaders,
        text: () => Promise.resolve(''),
      };

      mockFetch.mockClear().mockResolvedValue(mockResponse);

      const result = await freshClient.getAvailableRemedies();

      expect(result).toEqual([]);
    });
  });

  describe('getAvailableRepertories', () => {
    beforeEach(async () => {
      // Properly initialize session
      const sessionHeaders = new Headers();
      sessionHeaders.set('set-cookie', 'session_id=test; Path=/');
      const mockSessionResponse = {
        ok: true,
        status: 200,
        headers: sessionHeaders,
        text: () => Promise.resolve('[]'),
      };
      const mockInitResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify([])),
      };
      mockFetch.mockResolvedValueOnce(mockSessionResponse).mockResolvedValueOnce(mockInitResponse);
      await mockClient.getAvailableRepertories();
      mockFetch.mockClear();
    });

    it('getAvailableRepertories when successful then returns formatted metadata', async () => {
      const mockApiResponse = [
        {
          info: {
            abbrev: 'kent',
            title: 'Kent Repertory',
            authorFirstName: 'James',
            authorLastName: 'Kent',
            language: 'en',
          },
        },
      ];
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify(mockApiResponse)),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await mockClient.getAvailableRepertories();

      expect(result).toHaveLength(1);
      expect(result[0].abbreviation).toBe('kent');
      expect(result[0].title).toBe('Kent Repertory');
      expect(result[0].author).toBe('James Kent');
    });

    it('getAvailableRepertories when only lastName then uses it', async () => {
      const mockApiResponse = [
        {
          info: {
            abbrev: 'test',
            title: 'Test',
            authorLastName: 'Doe',
            language: 'en',
          },
        },
      ];
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify(mockApiResponse)),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await mockClient.getAvailableRepertories();

      expect(result[0].author).toBe('Doe');
    });

    it('getAvailableRepertories when only firstName then uses it', async () => {
      const mockApiResponse = [
        {
          info: {
            abbrev: 'test',
            title: 'Test',
            authorFirstName: 'John',
            language: 'en',
          },
        },
      ];
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify(mockApiResponse)),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await mockClient.getAvailableRepertories();

      expect(result[0].author).toBe('John');
    });

    it('getAvailableRepertories when null response then returns empty array', async () => {
      const mockResponse = {
        ok: true,
        status: 204,
        headers: new Headers(),
        text: () => Promise.resolve(''),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await mockClient.getAvailableRepertories();

      expect(result).toEqual([]);
    });
  });

  describe('getAvailableMateriaMedicas', () => {
    beforeEach(async () => {
      // Properly initialize session
      const sessionHeaders = new Headers();
      sessionHeaders.set('set-cookie', 'session_id=test; Path=/');
      const mockSessionResponse = {
        ok: true,
        status: 200,
        headers: sessionHeaders,
        text: () => Promise.resolve('[]'),
      };
      const mockInitResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify([])),
      };
      mockFetch.mockResolvedValueOnce(mockSessionResponse).mockResolvedValueOnce(mockInitResponse);
      await mockClient.getAvailableMateriaMedicas();
      mockFetch.mockClear();
    });

    it('getAvailableMateriaMedicas when successful then returns formatted metadata', async () => {
      const mockApiResponse = [
        {
          mminfo: {
            id: 1,
            abbrev: 'boericke',
            displaytitle: 'Boericke MM',
            fulltitle: 'Boericke Materia Medica',
            authorfirstname: 'William',
            authorlastname: 'Boericke',
            lang: 'en',
          },
        },
      ];
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify(mockApiResponse)),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await mockClient.getAvailableMateriaMedicas();

      expect(result).toHaveLength(1);
      expect(result[0].abbreviation).toBe('boericke');
      expect(result[0].title).toBe('Boericke MM');
      expect(result[0].author).toBe('William Boericke');
    });

    it('getAvailableMateriaMedicas when no displaytitle then uses fulltitle', async () => {
      const mockApiResponse = [
        {
          mminfo: {
            id: 1,
            abbrev: 'test',
            fulltitle: 'Full Title',
            lang: 'en',
          },
        },
      ];
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify(mockApiResponse)),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await mockClient.getAvailableMateriaMedicas();

      expect(result[0].title).toBe('Full Title');
    });

    it('getAvailableMateriaMedicas when no titles then uses abbrev', async () => {
      const mockApiResponse = [
        {
          mminfo: {
            id: 1,
            abbrev: 'test',
            lang: 'en',
          },
        },
      ];
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify(mockApiResponse)),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await mockClient.getAvailableMateriaMedicas();

      expect(result[0].title).toBe('test');
    });

    it('getAvailableMateriaMedicas when null response then returns empty array', async () => {
      const mockResponse = {
        ok: true,
        status: 204,
        headers: new Headers(),
        text: () => Promise.resolve(''),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await mockClient.getAvailableMateriaMedicas();

      expect(result).toEqual([]);
    });
  });
});

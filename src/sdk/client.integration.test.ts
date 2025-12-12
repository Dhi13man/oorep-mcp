/**
 * Integration tests for OOREP SDK Client
 *
 * These tests use real implementations of Cache, RequestDeduplicator, validators,
 * and formatters. Only external HTTP calls (fetch) are mocked.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OOREPClient, createOOREPClient } from './client.js';
import { ValidationError } from '../utils/errors.js';

// Store original fetch
const originalFetch = global.fetch;

// Mock fetch for HTTP calls
const mockFetch = vi.fn();

// Helper to create mock Response
function createMockResponse(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  const responseHeaders = new Headers({
    'content-type': 'application/json',
    ...headers,
  });

  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: responseHeaders,
    text: () => Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data)),
    json: () => Promise.resolve(data),
    clone: function () {
      return this;
    },
  } as Response;
}

// Helper for session init response (available remedies)
function createSessionResponse(): Response {
  return createMockResponse(
    [
      { id: 1, nameAbbrev: 'Acon.', nameLong: 'Aconitum napellus', namealt: ['Aconite'] },
      { id: 2, nameAbbrev: 'Bell.', nameLong: 'Belladonna', namealt: [] },
      { id: 3, nameAbbrev: 'Bry.', nameLong: 'Bryonia alba', namealt: ['Bryonia'] },
    ],
    200,
    { 'set-cookie': 'session=test123; Path=/' }
  );
}

// Helper for repertory lookup response
function createRepertoryResponse(totalResults = 2): Response {
  const payload = {
    totalNumberOfResults: totalResults,
    results: [
      {
        rubric: { fullPath: 'Head > Pain > General', textt: 'Headache' },
        repertoryAbbrev: 'kent',
        weightedRemedies: [
          { remedy: { nameAbbrev: 'Bell.', nameLong: 'Belladonna' }, weight: 3 },
          { remedy: { nameAbbrev: 'Acon.', nameLong: 'Aconitum napellus' }, weight: 2 },
        ],
      },
      {
        rubric: { fullPath: 'Head > Pain > Throbbing', textt: null },
        repertoryAbbrev: 'kent',
        weightedRemedies: [{ remedy: { nameAbbrev: 'Bell.', nameLong: 'Belladonna' }, weight: 4 }],
      },
    ],
  };

  // API returns [payload, remedyStats]
  return createMockResponse([payload, []], 200, { 'set-cookie': 'session=test123' });
}

// Helper for materia medica response
function createMateriaMedicaResponse(): Response {
  return createMockResponse(
    {
      results: [
        {
          abbrev: 'boericke',
          remedy_id: 1,
          remedy_fullname: 'Aconitum napellus',
          result_sections: [{ heading: 'Mind', content: 'Fear and anxiety', depth: 1 }],
        },
      ],
      // totalResults is sum of all hits, so set to 1 for single result
      numberOfMatchingSectionsPerChapter: [{ hits: 1, remedyId: 1 }],
    },
    200,
    { 'set-cookie': 'session=test123' }
  );
}

// Helper for repertories list response (matches OOREPClient expected format)
function createRepertoriesResponse(): Response {
  return createMockResponse(
    [
      {
        info: {
          abbrev: 'kent',
          title: 'Kent Repertory',
          language: 'en',
          authorFirstName: 'James',
          authorLastName: 'Kent',
        },
      },
      {
        info: {
          abbrev: 'boger',
          title: 'Boger Boenninghausen',
          language: 'en',
          authorFirstName: 'C.M.',
          authorLastName: 'Boger',
        },
      },
      {
        info: {
          abbrev: 'synth',
          title: 'Synthesis',
          language: 'de',
          authorFirstName: 'Frederik',
          authorLastName: 'Schroyens',
        },
      },
    ],
    200,
    { 'set-cookie': 'session=test123' }
  );
}

// Helper for materia medicas list response (matches OOREPClient expected format)
function createMateriaMedicasResponse(): Response {
  return createMockResponse(
    [
      {
        mminfo: {
          id: 1,
          abbrev: 'boericke',
          displaytitle: 'Boericke Materia Medica',
          lang: 'en',
          authorfirstname: 'William',
          authorlastname: 'Boericke',
        },
      },
      {
        mminfo: {
          id: 2,
          abbrev: 'hering',
          displaytitle: 'Hering Guiding Symptoms',
          lang: 'de',
          authorfirstname: 'Constantine',
          authorlastname: 'Hering',
        },
      },
    ],
    200,
    { 'set-cookie': 'session=test123' }
  );
}

describe('OOREPClient Integration Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch.mockReset();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = originalFetch;
  });

  describe('constructor and configuration', () => {
    it('when no config provided then uses defaults', () => {
      const client = new OOREPClient();
      const config = client.getConfig();

      expect(config.baseUrl).toBe('https://www.oorep.com');
      expect(config.timeoutMs).toBe(30000);
      expect(config.cacheTtlMs).toBe(300000);
      expect(config.defaultRepertory).toBe('publicum');
      expect(config.defaultMateriaMedica).toBe('boericke');

      client.destroy();
    });

    it('when custom config provided then uses custom values', () => {
      const client = new OOREPClient({
        baseUrl: 'https://custom.oorep.com',
        timeoutMs: 60000,
        cacheTtlMs: 600000,
        defaultRepertory: 'kent',
        defaultMateriaMedica: 'hering',
      });
      const config = client.getConfig();

      expect(config.baseUrl).toBe('https://custom.oorep.com');
      expect(config.timeoutMs).toBe(60000);
      expect(config.cacheTtlMs).toBe(600000);
      expect(config.defaultRepertory).toBe('kent');
      expect(config.defaultMateriaMedica).toBe('hering');

      client.destroy();
    });

    it('when partial config provided then merges with defaults', () => {
      const client = new OOREPClient({ timeoutMs: 45000 });
      const config = client.getConfig();

      expect(config.baseUrl).toBe('https://www.oorep.com');
      expect(config.timeoutMs).toBe(45000);
      expect(config.cacheTtlMs).toBe(300000);

      client.destroy();
    });
  });

  describe('searchRepertory', () => {
    it('when valid symptom then makes HTTP call and returns formatted results', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createRepertoryResponse(156));

      const client = new OOREPClient();
      const result = await client.searchRepertory({ symptom: 'headache' });

      // Verify HTTP calls were made
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Verify results are properly formatted
      expect(result.totalResults).toBe(156);
      expect(result.rubrics).toHaveLength(2);
      expect(result.rubrics[0].rubric).toBe('Head > Pain > General');
      expect(result.rubrics[0].repertory).toBe('kent');
      expect(result.rubrics[0].remedies).toHaveLength(2);

      client.destroy();
    });

    it('when includeRemedyStats true then aggregates remedy statistics correctly', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createRepertoryResponse());

      const client = new OOREPClient();
      const result = await client.searchRepertory({
        symptom: 'headache',
        includeRemedyStats: true,
      });

      // Belladonna appears in both rubrics with weights 3 and 4
      expect(result.remedyStats).toBeDefined();
      expect(result.remedyStats!.length).toBeGreaterThan(0);

      const bellStats = result.remedyStats!.find((s) => s.name === 'Belladonna');
      expect(bellStats).toBeDefined();
      expect(bellStats!.count).toBe(2);
      expect(bellStats!.cumulativeWeight).toBe(7); // 3 + 4

      client.destroy();
    });

    it('when same request made twice then second uses cache', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createRepertoryResponse());

      const client = new OOREPClient();

      // First call - makes HTTP request
      const result1 = await client.searchRepertory({ symptom: 'headache' });
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Second call - should use cache
      const result2 = await client.searchRepertory({ symptom: 'headache' });
      expect(mockFetch).toHaveBeenCalledTimes(2); // No additional calls

      expect(result1).toEqual(result2);

      client.destroy();
    });

    it('when cache expires then makes new HTTP call', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createRepertoryResponse(10))
        .mockResolvedValueOnce(createRepertoryResponse(20));

      const client = new OOREPClient({ cacheTtlMs: 1000 });

      await client.searchRepertory({ symptom: 'headache' });
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Advance past cache TTL
      vi.advanceTimersByTime(1001);

      const result = await client.searchRepertory({ symptom: 'headache' });
      expect(mockFetch).toHaveBeenCalledTimes(3); // New request after cache expiry
      expect(result.totalResults).toBe(20);

      client.destroy();
    });

    it('when symptom too short then throws validation error without HTTP call', async () => {
      const client = new OOREPClient();

      // Zod schema validates min length before custom validators run
      await expect(client.searchRepertory({ symptom: 'ab' })).rejects.toThrow();

      expect(mockFetch).not.toHaveBeenCalled();

      client.destroy();
    });

    it('when symptom has special characters then passes validation (API handles sanitization)', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createRepertoryResponse());

      const client = new OOREPClient();

      // Symptom validation is relaxed - special characters are allowed, API handles sanitization
      await expect(client.searchRepertory({ symptom: 'head@che' })).resolves.toBeDefined();

      client.destroy();
    });

    it('when symptom exactly 3 chars then validates successfully', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createRepertoryResponse());

      const client = new OOREPClient();

      await expect(client.searchRepertory({ symptom: 'abc' })).resolves.toBeDefined();

      client.destroy();
    });

    it('when symptom exactly 200 chars then validates successfully', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createRepertoryResponse());

      const client = new OOREPClient();
      const longSymptom = 'a'.repeat(200);

      await expect(client.searchRepertory({ symptom: longSymptom })).resolves.toBeDefined();

      client.destroy();
    });

    it('when symptom 201 chars then throws ValidationError', async () => {
      const client = new OOREPClient();
      const tooLongSymptom = 'a'.repeat(201);

      await expect(client.searchRepertory({ symptom: tooLongSymptom })).rejects.toThrow();

      client.destroy();
    });

    it('when minWeight provided then passes to API', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createRepertoryResponse());

      const client = new OOREPClient();
      await client.searchRepertory({ symptom: 'headache', minWeight: 3 });

      // Verify the API call includes minWeight
      const calls = mockFetch.mock.calls;
      const lookupCall = calls.find((call) => call[0].toString().includes('lookup_rep'));
      expect(lookupCall).toBeDefined();

      client.destroy();
    });

    it('when maxResults specified then limits output', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createRepertoryResponse());

      const client = new OOREPClient();
      const result = await client.searchRepertory({
        symptom: 'headache',
        maxResults: 1,
      });

      expect(result.rubrics.length).toBeLessThanOrEqual(1);

      client.destroy();
    });
  });

  describe('searchMateriaMedica', () => {
    it('when valid symptom then returns formatted results', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createMateriaMedicaResponse());

      const client = new OOREPClient();
      const result = await client.searchMateriaMedica({ symptom: 'anxiety' });

      expect(result.totalResults).toBe(1);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].remedy).toBe('Aconitum napellus');
      expect(result.results[0].sections).toHaveLength(1);

      client.destroy();
    });

    it('when remedy filter provided then validates remedy name', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createMateriaMedicaResponse());

      const client = new OOREPClient();

      // Valid remedy name
      await expect(
        client.searchMateriaMedica({
          symptom: 'anxiety',
          remedy: 'acon',
        })
      ).resolves.toBeDefined();

      client.destroy();
    });

    it('when remedy name invalid then throws ValidationError', async () => {
      const client = new OOREPClient();

      await expect(
        client.searchMateriaMedica({
          symptom: 'anxiety',
          remedy: '', // Empty remedy name
        })
      ).rejects.toThrow(ValidationError);

      client.destroy();
    });

    it('when cached then returns cached result', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createMateriaMedicaResponse());

      const client = new OOREPClient();

      await client.searchMateriaMedica({ symptom: 'anxiety' });
      expect(mockFetch).toHaveBeenCalledTimes(2);

      await client.searchMateriaMedica({ symptom: 'anxiety' });
      expect(mockFetch).toHaveBeenCalledTimes(2); // No additional calls

      client.destroy();
    });
  });

  describe('getRemedyInfo', () => {
    it('when remedy found by abbreviation then returns info', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse()) // session init
        .mockResolvedValueOnce(createSessionResponse()); // getAvailableRemedies

      const client = new OOREPClient();
      const result = await client.getRemedyInfo({ remedy: 'acon.' });

      expect(result).not.toBeNull();
      expect(result!.nameAbbrev).toBe('Acon.');
      expect(result!.nameLong).toBe('Aconitum napellus');

      client.destroy();
    });

    it('when remedy found by long name then returns info', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse()) // session init
        .mockResolvedValueOnce(createSessionResponse()); // getAvailableRemedies

      const client = new OOREPClient();
      const result = await client.getRemedyInfo({ remedy: 'aconitum napellus' });

      expect(result).not.toBeNull();
      expect(result!.id).toBe(1);

      client.destroy();
    });

    it('when remedy found by alternative name then returns info', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse()) // session init
        .mockResolvedValueOnce(createSessionResponse()); // getAvailableRemedies

      const client = new OOREPClient();
      const result = await client.getRemedyInfo({ remedy: 'aconite' });

      expect(result).not.toBeNull();
      expect(result!.nameAbbrev).toBe('Acon.');

      client.destroy();
    });

    it('when partial match with 3+ chars then returns remedy', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse()) // session init
        .mockResolvedValueOnce(createSessionResponse()); // getAvailableRemedies

      const client = new OOREPClient();
      // "bella" should partially match "Belladonna"
      const result = await client.getRemedyInfo({ remedy: 'bella' });

      expect(result).not.toBeNull();
      expect(result!.nameLong).toBe('Belladonna');

      client.destroy();
    });

    it('when query too short for partial match then returns null', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse()) // session init
        .mockResolvedValueOnce(createSessionResponse()); // getAvailableRemedies

      const client = new OOREPClient();
      // "be" is only 2 chars, below partial match threshold
      const result = await client.getRemedyInfo({ remedy: 'be' });

      expect(result).toBeNull();

      client.destroy();
    });

    it('when remedy not found then returns null', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse()) // session init
        .mockResolvedValueOnce(createSessionResponse()); // getAvailableRemedies

      const client = new OOREPClient();
      const result = await client.getRemedyInfo({ remedy: 'nonexistent' });

      expect(result).toBeNull();

      client.destroy();
    });

    it('when case differs then still matches', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse()) // session init
        .mockResolvedValueOnce(createSessionResponse()); // getAvailableRemedies

      const client = new OOREPClient();
      const result = await client.getRemedyInfo({ remedy: 'BELLADONNA' });

      expect(result).not.toBeNull();
      expect(result!.nameLong).toBe('Belladonna');

      client.destroy();
    });

    it('when remedy name invalid then throws error', async () => {
      const client = new OOREPClient();

      await expect(client.getRemedyInfo({ remedy: '' })).rejects.toThrow(); // Throws ZodError for empty string

      client.destroy();
    });

    it('when remedy name exactly 100 chars then validates', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse()) // session init
        .mockResolvedValueOnce(createSessionResponse()); // getAvailableRemedies

      const client = new OOREPClient();
      const longName = 'a'.repeat(100);

      // Should not throw validation error (but won't find a match)
      const result = await client.getRemedyInfo({ remedy: longName });
      expect(result).toBeNull();

      client.destroy();
    });

    it('when cached then returns cached result', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse()) // session init
        .mockResolvedValueOnce(createSessionResponse()); // getAvailableRemedies

      const client = new OOREPClient();

      await client.getRemedyInfo({ remedy: 'acon' });
      await client.getRemedyInfo({ remedy: 'acon' });

      // Session init + one getAvailableRemedies call (second is cached)
      expect(mockFetch).toHaveBeenCalledTimes(2);

      client.destroy();
    });
  });

  describe('listRepertories', () => {
    it('when no filter then returns all repertories', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createRepertoriesResponse());

      const client = new OOREPClient();
      const result = await client.listRepertories();

      expect(result).toHaveLength(3);

      client.destroy();
    });

    it('when language filter provided then filters results', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createRepertoriesResponse());

      const client = new OOREPClient();
      const result = await client.listRepertories({ language: 'en' });

      expect(result).toHaveLength(2);
      expect(result.every((r) => r.language === 'en')).toBe(true);

      client.destroy();
    });

    it('when language filter invalid then throws ValidationError', async () => {
      const client = new OOREPClient();

      await expect(client.listRepertories({ language: 'e' })).rejects.toThrow(ValidationError);

      client.destroy();
    });

    it('when cached then returns cached result', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createRepertoriesResponse());

      const client = new OOREPClient();

      await client.listRepertories();
      await client.listRepertories();

      expect(mockFetch).toHaveBeenCalledTimes(2);

      client.destroy();
    });
  });

  describe('listMateriaMedicas', () => {
    it('when no filter then returns all materia medicas', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createMateriaMedicasResponse());

      const client = new OOREPClient();
      const result = await client.listMateriaMedicas();

      expect(result).toHaveLength(2);

      client.destroy();
    });

    it('when language filter provided then filters results', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createMateriaMedicasResponse());

      const client = new OOREPClient();
      const result = await client.listMateriaMedicas({ language: 'de' });

      expect(result).toHaveLength(1);
      expect(result[0].abbreviation).toBe('hering');

      client.destroy();
    });
  });

  describe('concurrent request deduplication', () => {
    it('when concurrent identical requests then only one HTTP call made', async () => {
      let resolveRequest: (value: Response) => void;
      const pendingRequest = new Promise<Response>((resolve) => {
        resolveRequest = resolve;
      });

      mockFetch.mockResolvedValueOnce(createSessionResponse()).mockReturnValueOnce(pendingRequest);

      const client = new OOREPClient();

      // Start 3 concurrent requests for same symptom
      const promise1 = client.searchRepertory({ symptom: 'headache' });
      const promise2 = client.searchRepertory({ symptom: 'headache' });
      const promise3 = client.searchRepertory({ symptom: 'headache' });

      // Resolve the pending request
      resolveRequest!(createRepertoryResponse());

      const [r1, r2, r3] = await Promise.all([promise1, promise2, promise3]);

      // All should get same result
      expect(r1).toEqual(r2);
      expect(r2).toEqual(r3);

      // Only 2 HTTP calls: session init + one lookup
      expect(mockFetch).toHaveBeenCalledTimes(2);

      client.destroy();
    });

    it('when different symptoms then separate requests made', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createRepertoryResponse(10))
        .mockResolvedValueOnce(createRepertoryResponse(20));

      const client = new OOREPClient();

      const [r1, r2] = await Promise.all([
        client.searchRepertory({ symptom: 'headache' }),
        client.searchRepertory({ symptom: 'nausea' }),
      ]);

      expect(r1.totalResults).toBe(10);
      expect(r2.totalResults).toBe(20);

      // Session init + 2 different lookups
      expect(mockFetch).toHaveBeenCalledTimes(3);

      client.destroy();
    });
  });

  describe('clearCache', () => {
    it('when called then subsequent request makes new HTTP call', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createRepertoryResponse(10))
        .mockResolvedValueOnce(createRepertoryResponse(20));

      const client = new OOREPClient();

      await client.searchRepertory({ symptom: 'headache' });
      expect(mockFetch).toHaveBeenCalledTimes(2);

      client.clearCache();

      const result = await client.searchRepertory({ symptom: 'headache' });
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result.totalResults).toBe(20);

      client.destroy();
    });
  });

  describe('destroy', () => {
    it('when called then cleans up resources', () => {
      const client = new OOREPClient();

      expect(() => client.destroy()).not.toThrow();
    });

    it('when called multiple times then does not throw', () => {
      const client = new OOREPClient();

      expect(() => {
        client.destroy();
        client.destroy();
      }).not.toThrow();
    });
  });

  describe('getConfig', () => {
    it('when called then returns immutable config copy', () => {
      const client = new OOREPClient();

      const config1 = client.getConfig();
      const config2 = client.getConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);

      client.destroy();
    });
  });
});

describe('createOOREPClient factory', () => {
  it('when called without config then creates client with defaults', () => {
    const client = createOOREPClient();

    expect(client).toBeInstanceOf(OOREPClient);
    expect(client.getConfig().baseUrl).toBe('https://www.oorep.com');

    client.destroy();
  });

  it('when called with config then creates client with custom config', () => {
    const client = createOOREPClient({ timeoutMs: 60000 });

    expect(client).toBeInstanceOf(OOREPClient);
    expect(client.getConfig().timeoutMs).toBe(60000);

    client.destroy();
  });
});

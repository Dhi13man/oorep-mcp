/**
 * Integration tests for Vercel AI SDK Adapter
 *
 * These tests use the real OOREPSDKClient with only external HTTP calls mocked.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OOREPSDKClient } from '../client.js';
import { createOOREPTools, getOOREPTools } from './vercel-ai.js';

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
    text: () =>
      Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data)),
    json: () => Promise.resolve(data),
    clone: function () {
      return this;
    },
  } as Response;
}

// Helper for session init response
function createSessionResponse(): Response {
  return createMockResponse(
    [
      {
        id: 1,
        nameAbbrev: 'Acon.',
        nameLong: 'Aconitum napellus',
        namealt: ['Aconite'],
      },
      { id: 2, nameAbbrev: 'Bell.', nameLong: 'Belladonna', namealt: [] },
    ],
    200,
    { 'set-cookie': 'session=test123; Path=/' }
  );
}

// Helper for repertory lookup response
function createRepertoryResponse(): Response {
  const payload = {
    totalNumberOfResults: 42,
    results: [
      {
        rubric: { fullPath: 'Head > Pain > General', textt: 'Headache' },
        repertoryAbbrev: 'kent',
        weightedRemedies: [
          {
            remedy: { nameAbbrev: 'Bell.', nameLong: 'Belladonna' },
            weight: 3,
          },
        ],
      },
    ],
  };

  return createMockResponse([payload, []], 200, {
    'set-cookie': 'session=test123',
  });
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
          result_sections: [
            { heading: 'Mind', content: 'Fear and anxiety', depth: 1 },
          ],
        },
      ],
      numberOfMatchingSectionsPerChapter: [{ hits: 1, remedyId: 1 }],
    },
    200,
    { 'set-cookie': 'session=test123' }
  );
}

// Helper for repertories list response
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
    ],
    200,
    { 'set-cookie': 'session=test123' }
  );
}

// Helper for materia medicas list response
function createMateriaMedicasResponse(): Response {
  return createMockResponse(
    [
      {
        mminfo: {
          id: 1,
          abbrev: 'boericke',
          displaytitle: 'Boericke MM',
          lang: 'en',
          authorfirstname: 'William',
          authorlastname: 'Boericke',
        },
      },
    ],
    200,
    { 'set-cookie': 'session=test123' }
  );
}

describe('Vercel AI Adapter Integration Tests', () => {
  let client: OOREPSDKClient;

  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch.mockReset();
    global.fetch = mockFetch;
    client = new OOREPSDKClient();
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = originalFetch;
    client.destroy();
  });

  describe('createOOREPTools - integration', () => {
    it('when search_repertory executed then returns real formatted results', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createRepertoryResponse());

      const tools = createOOREPTools(client);
      const result = await tools.search_repertory.execute({
        symptom: 'headache',
        minWeight: 2,
        maxResults: 20,
        includeRemedyStats: true,
      });

      expect(result.totalResults).toBe(42);
      expect(result.rubrics).toHaveLength(1);
      expect(result.rubrics[0].rubric).toBe('Head > Pain > General');
    });

    it('when search_materia_medica executed then returns results', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createMateriaMedicaResponse());

      const tools = createOOREPTools(client);
      const result = await tools.search_materia_medica.execute({
        symptom: 'anxiety',
        maxResults: 10,
      });

      expect(result.totalResults).toBe(1);
      expect(result.results[0].remedy).toBe('Aconitum napellus');
    });

    it('when get_remedy_info executed then returns remedy data', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createSessionResponse());

      const tools = createOOREPTools(client);
      const result = await tools.get_remedy_info.execute({
        remedy: 'aconite',
      });

      expect(result).not.toBeNull();
      expect(result!.nameLong).toBe('Aconitum napellus');
    });

    it('when list_available_repertories executed then returns filtered list', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createRepertoriesResponse());

      const tools = createOOREPTools(client);
      const result = await tools.list_available_repertories.execute({
        language: 'en',
      });

      expect(result).toHaveLength(1);
      expect(result[0].abbreviation).toBe('kent');
    });

    it('when list_available_materia_medicas executed then returns list', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createMateriaMedicasResponse());

      const tools = createOOREPTools(client);
      const result = await tools.list_available_materia_medicas.execute({});

      expect(result).toHaveLength(1);
      expect(result[0].abbreviation).toBe('boericke');
    });

    it('when validation fails then propagates error', async () => {
      const tools = createOOREPTools(client);

      await expect(
        tools.search_repertory.execute({
          symptom: 'ab', // Too short
          maxResults: 20,
          includeRemedyStats: true,
        })
      ).rejects.toThrow();

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('when network error then propagates error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      const tools = createOOREPTools(client);

      await expect(
        tools.search_repertory.execute({
          symptom: 'headache',
          maxResults: 20,
          includeRemedyStats: true,
        })
      ).rejects.toThrow('Network failure');
    });

    it('when caching enabled then subsequent calls use cache', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createRepertoryResponse());

      const tools = createOOREPTools(client);

      // First call
      await tools.search_repertory.execute({
        symptom: 'headache',
        maxResults: 20,
        includeRemedyStats: true,
      });
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Second call - should use cache
      const result = await tools.search_repertory.execute({
        symptom: 'headache',
        maxResults: 20,
        includeRemedyStats: true,
      });
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.totalResults).toBe(42);
    });
  });

  describe('getOOREPTools - integration', () => {
    it('when specific tools requested then returns only those tools', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createRepertoryResponse());

      const tools = getOOREPTools(client, [
        'search_repertory',
        'get_remedy_info',
      ]);

      expect(Object.keys(tools)).toHaveLength(2);
      expect(tools.search_repertory).toBeDefined();
      expect(tools.get_remedy_info).toBeDefined();

      // Execute to verify it works
      const result = await tools.search_repertory.execute({
        symptom: 'headache',
        maxResults: 20,
        includeRemedyStats: true,
      });
      expect(result.totalResults).toBe(42);
    });
  });
});

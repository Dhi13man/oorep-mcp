/**
 * Integration tests for LangChain Adapter
 *
 * These tests use the real OOREPClient with only external HTTP calls mocked.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OOREPClient } from '../client.js';
import { createLangChainTools, getLangChainTools, createLangGraphTools } from './langchain.js';

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
    totalNumberOfResults: 100,
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
          result_sections: [{ heading: 'Mind', content: 'Fear and anxiety', depth: 1 }],
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

describe('LangChain Adapter Integration Tests', () => {
  let client: OOREPClient;

  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch.mockReset();
    global.fetch = mockFetch;
    client = new OOREPClient();
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = originalFetch;
    client.destroy();
  });

  describe('createLangChainTools - integration', () => {
    it('when search_repertory func called then returns JSON string', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createRepertoryResponse());

      const tools = createLangChainTools(client);
      const searchTool = tools.find((t) => t.name === 'search_repertory')!;

      const result = await searchTool.func({ symptom: 'headache', minWeight: 2 });

      // LangChain tools return JSON strings
      const parsed = JSON.parse(result);
      expect(parsed.totalResults).toBe(100);
      expect(parsed.rubrics).toHaveLength(1);
      expect(parsed.rubrics[0].rubric).toBe('Head > Pain > General');
    });

    it('when search_materia_medica func called then returns JSON string', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createMateriaMedicaResponse());

      const tools = createLangChainTools(client);
      const searchTool = tools.find((t) => t.name === 'search_materia_medica')!;

      const result = await searchTool.func({ symptom: 'anxiety' });

      const parsed = JSON.parse(result);
      expect(parsed.totalResults).toBe(1);
      expect(parsed.results[0].remedy).toBe('Aconitum napellus');
    });

    it('when get_remedy_info func called then returns JSON string', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createSessionResponse());

      const tools = createLangChainTools(client);
      const infoTool = tools.find((t) => t.name === 'get_remedy_info')!;

      const result = await infoTool.func({ remedy: 'aconite' });

      const parsed = JSON.parse(result);
      expect(parsed.nameLong).toBe('Aconitum napellus');
    });

    it('when list_available_repertories func called then returns JSON string', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createRepertoriesResponse());

      const tools = createLangChainTools(client);
      const listTool = tools.find((t) => t.name === 'list_available_repertories')!;

      const result = await listTool.func({ language: 'en' });

      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].abbreviation).toBe('kent');
    });

    it('when list_available_materia_medicas func called then returns JSON string', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createMateriaMedicasResponse());

      const tools = createLangChainTools(client);
      const listTool = tools.find((t) => t.name === 'list_available_materia_medicas')!;

      const result = await listTool.func({});

      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].abbreviation).toBe('boericke');
    });

    it('when validation fails then propagates error', async () => {
      const tools = createLangChainTools(client);
      const searchTool = tools.find((t) => t.name === 'search_repertory')!;

      await expect(searchTool.func({ symptom: 'ab' })).rejects.toThrow();

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('when network error then propagates error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      const tools = createLangChainTools(client);
      const searchTool = tools.find((t) => t.name === 'search_repertory')!;

      await expect(searchTool.func({ symptom: 'headache' })).rejects.toThrow('Network failure');
    });

    it('when caching enabled then subsequent calls use cache', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createRepertoryResponse());

      const tools = createLangChainTools(client);
      const searchTool = tools.find((t) => t.name === 'search_repertory')!;

      // First call
      await searchTool.func({ symptom: 'headache' });
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Second call - should use cache
      const result = await searchTool.func({ symptom: 'headache' });
      expect(mockFetch).toHaveBeenCalledTimes(2);

      const parsed = JSON.parse(result);
      expect(parsed.totalResults).toBe(100);
    });
  });

  describe('getLangChainTools - integration', () => {
    it('when specific tools requested then returns only those tools', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createRepertoryResponse());

      const tools = getLangChainTools(client, ['search_repertory', 'get_remedy_info']);

      expect(tools).toHaveLength(2);
      expect(tools.map((t) => t.name)).toContain('search_repertory');
      expect(tools.map((t) => t.name)).toContain('get_remedy_info');

      // Execute to verify it works
      const searchTool = tools.find((t) => t.name === 'search_repertory')!;
      const result = await searchTool.func({ symptom: 'headache' });
      const parsed = JSON.parse(result);
      expect(parsed.totalResults).toBe(100);
    });
  });

  describe('createLangGraphTools - integration', () => {
    it('when called then returns tools and toolsByName', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createRepertoryResponse());

      const { tools, toolsByName } = createLangGraphTools(client);

      expect(tools).toHaveLength(5);
      expect(toolsByName.search_repertory).toBeDefined();

      // Execute to verify it works
      const result = await toolsByName.search_repertory.func({
        symptom: 'headache',
      });
      const parsed = JSON.parse(result);
      expect(parsed.totalResults).toBe(100);
    });
  });
});

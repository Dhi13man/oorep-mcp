/**
 * Integration tests for OpenAI Adapter
 *
 * These tests use the real OOREPSDKClient with only external HTTP calls mocked.
 * They verify the full flow through the adapter -> SDK client -> OOREPClient.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OOREPSDKClient } from '../client.js';
import {
  executeOpenAITool,
  executeOOREPTool,
  processToolCalls,
} from './openai.js';

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
      {
        id: 3,
        nameAbbrev: 'Bry.',
        nameLong: 'Bryonia alba',
        namealt: ['Bryonia'],
      },
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
      {
        info: {
          abbrev: 'boger',
          title: 'Boger Boenninghausen',
          language: 'en',
          authorFirstName: 'C.M.',
          authorLastName: 'Boger',
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
          displaytitle: 'Boericke Materia Medica',
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

describe('OpenAI Adapter Integration Tests', () => {
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

  describe('executeOOREPTool - integration', () => {
    it('when search_repertory then returns real formatted results', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createRepertoryResponse(156));

      const result = await executeOOREPTool(client, 'search_repertory', {
        symptom: 'headache',
        minWeight: 2,
      });

      const typedResult = result as {
        totalResults: number;
        rubrics: Array<{ rubric: string; remedies: unknown[] }>;
      };
      expect(typedResult.totalResults).toBe(156);
      expect(typedResult.rubrics).toHaveLength(1);
      expect(typedResult.rubrics[0].rubric).toBe('Head > Pain > General');
    });

    it('when search_materia_medica then returns real formatted results', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createMateriaMedicaResponse());

      const result = await executeOOREPTool(client, 'search_materia_medica', {
        symptom: 'anxiety',
      });

      const typedResult = result as {
        totalResults: number;
        results: Array<{ remedy: string }>;
      };
      expect(typedResult.totalResults).toBe(1);
      expect(typedResult.results[0].remedy).toBe('Aconitum napellus');
    });

    it('when get_remedy_info then returns real remedy data', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createSessionResponse());

      const result = await executeOOREPTool(client, 'get_remedy_info', {
        remedy: 'aconite',
      });

      const typedResult = result as {
        nameAbbrev: string;
        nameLong: string;
      } | null;
      expect(typedResult).not.toBeNull();
      expect(typedResult!.nameLong).toBe('Aconitum napellus');
    });

    it('when list_available_repertories then returns filtered list', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createRepertoriesResponse());

      const result = await executeOOREPTool(
        client,
        'list_available_repertories',
        {
          language: 'en',
        }
      );

      const typedResult = result as Array<{ abbreviation: string }>;
      expect(typedResult).toHaveLength(2);
      expect(typedResult[0].abbreviation).toBe('kent');
    });

    it('when list_available_materia_medicas then returns list', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createMateriaMedicasResponse());

      const result = await executeOOREPTool(
        client,
        'list_available_materia_medicas',
        {}
      );

      const typedResult = result as Array<{ abbreviation: string }>;
      expect(typedResult).toHaveLength(1);
      expect(typedResult[0].abbreviation).toBe('boericke');
    });

    it('when validation fails then propagates error', async () => {
      await expect(
        executeOOREPTool(client, 'search_repertory', { symptom: 'ab' })
      ).rejects.toThrow();

      // No HTTP calls should be made
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('when network error then propagates error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      await expect(
        executeOOREPTool(client, 'search_repertory', { symptom: 'headache' })
      ).rejects.toThrow('Network failure');
    });
  });

  describe('executeOpenAITool - integration', () => {
    it('when JSON arguments then executes full flow', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createRepertoryResponse());

      const result = await executeOpenAITool(
        client,
        'search_repertory',
        '{"symptom": "headache", "minWeight": 2}'
      );

      const typedResult = result as {
        totalResults: number;
        rubrics: unknown[];
      };
      expect(typedResult.totalResults).toBe(2);
    });

    it('when invalid JSON then throws parse error', async () => {
      await expect(
        executeOpenAITool(client, 'search_repertory', 'not json')
      ).rejects.toThrow();
    });
  });

  describe('processToolCalls - integration', () => {
    it('when multiple tool calls then processes all with real client', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createRepertoryResponse())
        .mockResolvedValueOnce(createSessionResponse());

      const toolCalls = [
        {
          id: 'call_1',
          function: {
            name: 'search_repertory',
            arguments: '{"symptom": "headache"}',
          },
        },
        {
          id: 'call_2',
          function: { name: 'get_remedy_info', arguments: '{"remedy": "acon"}' },
        },
      ];

      const results = await processToolCalls(client, toolCalls);

      expect(results).toHaveLength(2);
      expect(results[0].tool_call_id).toBe('call_1');
      expect(results[1].tool_call_id).toBe('call_2');

      // Verify actual data in results
      const searchResult = JSON.parse(results[0].content);
      expect(searchResult.totalResults).toBeDefined();

      const remedyResult = JSON.parse(results[1].content);
      expect(remedyResult.nameLong).toBeDefined();
    });

    it('when tool execution fails then returns error in content', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Service unavailable'));

      const toolCalls = [
        {
          id: 'call_error',
          function: {
            name: 'search_repertory',
            arguments: '{"symptom": "headache"}',
          },
        },
      ];

      const results = await processToolCalls(client, toolCalls);

      expect(results).toHaveLength(1);
      const content = JSON.parse(results[0].content);
      expect(content.error).toContain('Service unavailable');
    });

    it('when validation error then returns error in content', async () => {
      const toolCalls = [
        {
          id: 'call_invalid',
          function: {
            name: 'search_repertory',
            arguments: '{"symptom": "a"}', // Too short
          },
        },
      ];

      const results = await processToolCalls(client, toolCalls);

      expect(results).toHaveLength(1);
      const content = JSON.parse(results[0].content);
      expect(content.error).toBeDefined();
    });

    it('when caching enabled then subsequent calls use cache', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createRepertoryResponse());

      const toolCalls = [
        {
          id: 'call_1',
          function: {
            name: 'search_repertory',
            arguments: '{"symptom": "headache"}',
          },
        },
      ];

      // First call
      await processToolCalls(client, toolCalls);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Second call - should use cache
      const results = await processToolCalls(client, toolCalls);
      expect(mockFetch).toHaveBeenCalledTimes(2); // No additional calls

      const content = JSON.parse(results[0].content);
      expect(content.totalResults).toBeDefined();
    });
  });
});

/**
 * Integration tests for Google Gemini (@google/genai) Adapter
 *
 * These tests use the real OOREPSDKClient with only external HTTP calls mocked.
 * They verify the full flow through the adapter -> SDK client -> OOREPClient.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OOREPSDKClient } from '../client.js';
import {
  createGeminiToolExecutors,
  executeGeminiFunctionCall,
  geminiFormatResourceAsSystemInstruction,
  geminiFormatResourcesAsContext,
  convertPromptToGemini,
  geminiConvertPromptWithContext,
  geminiCreateChatHistory,
  type GeminiToolExecutors,
} from './google-genai.js';
import { TOOL_NAMES } from '../constants.js';

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
          result_sections: [{ heading: 'Mind', content: 'Fear and anxiety', depth: 1 }],
        },
      ],
      numberOfMatchingSectionsPerChapter: [{ hits: 1, remedyId: 1 }],
    },
    200,
    { 'set-cookie': 'session=test123' }
  );
}

// Helper for repertories list response (matches /api/available_rems_and_reps format)
function createRepertoriesResponse(): Response {
  return createMockResponse(
    [
      { info: { abbrev: 'kent', title: 'Kent Repertory', language: 'en' } },
      { info: { abbrev: 'publicum', title: 'Repertorium Publicum', language: 'en' } },
    ],
    200,
    { 'set-cookie': 'session=test123' }
  );
}

// Helper for materia medicas list response (matches /api/available_rems_and_mms format)
function createMateriaMedicasResponse(): Response {
  return createMockResponse(
    [
      {
        mminfo: { id: 1, abbrev: 'boericke', displaytitle: 'Boericke Materia Medica', lang: 'en' },
      },
      { mminfo: { id: 2, abbrev: 'hering', displaytitle: 'Guiding Symptoms', lang: 'en' } },
    ],
    200,
    { 'set-cookie': 'session=test123' }
  );
}

describe('Google Gemini Integration - Tool Executors', () => {
  let client: OOREPSDKClient;
  let executors: GeminiToolExecutors;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;

    // Default mock setup for session init
    mockFetch.mockResolvedValue(createSessionResponse());

    client = new OOREPSDKClient({
      baseUrl: 'https://test.oorep.com',
      timeoutMs: 5000,
      cacheTtlMs: 0, // Disable caching for tests
    });
    executors = createGeminiToolExecutors(client);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('executeGeminiFunctionCall', () => {
    it('when search_repertory called then returns results', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createRepertoryResponse());

      const result = await executeGeminiFunctionCall(executors, {
        name: TOOL_NAMES.SEARCH_REPERTORY,
        args: { symptom: 'headache' },
      });

      expect(result).toBeDefined();
      expect((result as { totalResults: number }).totalResults).toBe(42);
    });

    it('when search_materia_medica called then returns results', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createMateriaMedicaResponse());

      const result = await executeGeminiFunctionCall(executors, {
        name: TOOL_NAMES.SEARCH_MATERIA_MEDICA,
        args: { symptom: 'anxiety' },
      });

      expect(result).toBeDefined();
      expect((result as { totalResults: number }).totalResults).toBeGreaterThanOrEqual(0);
    });

    it('when get_remedy_info called then returns remedy details', async () => {
      const result = await executeGeminiFunctionCall(executors, {
        name: TOOL_NAMES.GET_REMEDY_INFO,
        args: { remedy: 'Aconite' },
      });

      expect(result).toBeDefined();
      expect((result as { nameAbbrev: string }).nameAbbrev).toBe('Acon.');
    });

    it('when list_available_repertories called then returns repertories', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createRepertoriesResponse());

      const result = await executeGeminiFunctionCall(executors, {
        name: TOOL_NAMES.LIST_REPERTORIES,
        args: {},
      });

      expect(Array.isArray(result)).toBe(true);
      expect((result as unknown[]).length).toBeGreaterThan(0);
    });

    it('when list_available_materia_medicas called then returns materia medicas', async () => {
      mockFetch
        .mockResolvedValueOnce(createSessionResponse())
        .mockResolvedValueOnce(createMateriaMedicasResponse());

      const result = await executeGeminiFunctionCall(executors, {
        name: TOOL_NAMES.LIST_MATERIA_MEDICAS,
        args: {},
      });

      expect(Array.isArray(result)).toBe(true);
      expect((result as unknown[]).length).toBeGreaterThan(0);
    });

    it('when unknown function called then throws error', async () => {
      await expect(
        executeGeminiFunctionCall(executors, {
          name: 'unknown_function',
          args: {},
        })
      ).rejects.toThrow('Unknown function: unknown_function');
    });

    it('when unknown function called then lists available functions', async () => {
      await expect(
        executeGeminiFunctionCall(executors, {
          name: 'unknown_function',
          args: {},
        })
      ).rejects.toThrow('Available functions:');
    });
  });
});

describe('Google Gemini Integration - Resource Formatting', () => {
  let client: OOREPSDKClient;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    mockFetch.mockResolvedValue(createSessionResponse());

    client = new OOREPSDKClient({
      baseUrl: 'https://test.oorep.com',
      timeoutMs: 5000,
      cacheTtlMs: 0,
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('geminiFormatResourceAsSystemInstruction', () => {
    it('when called with search syntax help then returns text content', async () => {
      const resource = await client.getResource('oorep://help/search-syntax');

      const instruction = geminiFormatResourceAsSystemInstruction(resource);

      expect(typeof instruction).toBe('string');
      expect(instruction).toContain('OOREP Search Syntax');
      expect(instruction.length).toBeGreaterThan(100);
    });
  });

  describe('geminiFormatResourcesAsContext', () => {
    it('when called with multiple resources then combines with headers', async () => {
      const resource1 = await client.getResource('oorep://help/search-syntax');
      const resource2 = {
        uri: 'oorep://test/resource' as const,
        mimeType: 'text/plain',
        text: 'Test content',
      };

      const context = geminiFormatResourcesAsContext([resource1, resource2 as never]);

      expect(context).toContain('## Resource: oorep://help/search-syntax');
      expect(context).toContain('## Resource: oorep://test/resource');
      expect(context).toContain('---');
    });
  });
});

describe('Google Gemini Integration - Prompt Conversion', () => {
  let client: OOREPSDKClient;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    mockFetch.mockResolvedValue(createSessionResponse());

    client = new OOREPSDKClient({
      baseUrl: 'https://test.oorep.com',
      timeoutMs: 5000,
      cacheTtlMs: 0,
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('convertPromptToGemini', () => {
    it('when called with analyze-symptoms then converts to Gemini format', async () => {
      const prompt = await client.getPrompt('analyze-symptoms');

      const geminiContents = convertPromptToGemini(prompt);

      expect(Array.isArray(geminiContents)).toBe(true);
      expect(geminiContents.length).toBe(1);
      expect(geminiContents[0].role).toBe('user');
      expect(geminiContents[0].parts[0].text).toContain('search_repertory');
    });

    it('when called with repertorization-workflow then converts to Gemini format', async () => {
      const prompt = await client.getPrompt('repertorization-workflow');

      const geminiContents = convertPromptToGemini(prompt);

      expect(geminiContents[0].role).toBe('user');
      expect(geminiContents[0].parts[0].text).toContain('STEP 1');
    });

    it('when prompt has assistant role then converts to model', async () => {
      // Create a mock prompt with assistant role
      const mockPrompt = {
        name: 'test' as const,
        description: 'Test prompt',
        messages: [
          { role: 'assistant' as const, content: { type: 'text' as const, text: 'Hello!' } },
        ],
      };

      const geminiContents = convertPromptToGemini(mockPrompt);

      expect(geminiContents[0].role).toBe('model');
    });
  });

  describe('geminiConvertPromptWithContext', () => {
    it('when called then returns systemInstruction and contents', async () => {
      const resource = await client.getResource('oorep://help/search-syntax');
      const prompt = await client.getPrompt('analyze-symptoms');

      const result = geminiConvertPromptWithContext(resource, prompt);

      expect(result.systemInstruction).toBeTruthy();
      expect(result.systemInstruction).toContain('OOREP');
      expect(Array.isArray(result.contents)).toBe(true);
      expect(result.contents.length).toBe(1);
    });
  });

  describe('geminiCreateChatHistory', () => {
    it('when called then returns Gemini Content array', async () => {
      const prompt = await client.getPrompt('repertorization-workflow');

      const history = geminiCreateChatHistory(prompt);

      expect(Array.isArray(history)).toBe(true);
      expect(history[0].role).toBe('user');
      expect(history[0].parts[0].text).toBeTruthy();
    });
  });
});

describe('Google Gemini Integration - Full Flow', () => {
  let client: OOREPSDKClient;
  let executors: GeminiToolExecutors;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    mockFetch.mockResolvedValue(createSessionResponse());

    client = new OOREPSDKClient({
      baseUrl: 'https://test.oorep.com',
      timeoutMs: 5000,
      cacheTtlMs: 0,
    });
    executors = createGeminiToolExecutors(client);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('when simulating Gemini workflow then all components work together', async () => {
    // 1. Get system instruction from resource
    const searchSyntax = await client.getResource('oorep://help/search-syntax');
    const systemInstruction = geminiFormatResourceAsSystemInstruction(searchSyntax);
    expect(systemInstruction).toContain('Wildcard');

    // 2. Get prompt and convert to Gemini format
    const workflow = await client.getPrompt('analyze-symptoms', {
      symptom_description: 'headache',
    });
    const contents = convertPromptToGemini(workflow);
    expect(contents[0].parts[0].text).toContain('headache');

    // 3. Simulate function call from Gemini
    mockFetch
      .mockResolvedValueOnce(createSessionResponse())
      .mockResolvedValueOnce(createRepertoryResponse());

    const searchResult = await executeGeminiFunctionCall(executors, {
      name: TOOL_NAMES.SEARCH_REPERTORY,
      args: { symptom: 'headache' },
    });
    expect(searchResult).toBeDefined();

    // 4. Get remedy info
    const remedyInfo = await executeGeminiFunctionCall(executors, {
      name: TOOL_NAMES.GET_REMEDY_INFO,
      args: { remedy: 'Belladonna' },
    });
    expect(remedyInfo).toBeDefined();
  });
});

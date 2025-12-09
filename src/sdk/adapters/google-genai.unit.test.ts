/**
 * Unit tests for Google Gemini (@google/genai) Adapter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  geminiFunctionDeclarations,
  geminiTools,
  createGeminiToolExecutors,
  executeGeminiFunctionCall,
  GEMINI_TOOL_NAMES,
  type GeminiFunctionDeclaration,
  type GeminiToolExecutors,
} from './google-genai.js';
import type { OOREPSDKClient } from '../client.js';

describe('geminiFunctionDeclarations', () => {
  it('when accessed then contains all five tools', () => {
    expect(geminiFunctionDeclarations).toHaveLength(5);
  });

  it('when accessed then schemas do not contain unsupported Gemini fields', () => {
    const unsupportedFields = ['default', 'exclusiveMinimum', 'exclusiveMaximum'];

    geminiFunctionDeclarations.forEach((tool) => {
      Object.values(tool.parametersJsonSchema.properties).forEach((prop) => {
        const propObj = prop as Record<string, unknown>;
        unsupportedFields.forEach((field) => {
          expect(propObj[field]).toBeUndefined();
        });
      });
    });
  });

  it.each([
    'search_repertory',
    'search_materia_medica',
    'get_remedy_info',
    'list_available_repertories',
    'list_available_materia_medicas',
  ])('when accessed then contains tool %s', (toolName) => {
    const tool = geminiFunctionDeclarations.find((t) => t.name === toolName);
    expect(tool).toBeDefined();
  });

  describe('tool structure', () => {
    it.each(geminiFunctionDeclarations.map((t) => [t.name, t]))(
      'when tool %s then has Gemini FunctionDeclaration format',
      (_name, tool) => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.parametersJsonSchema).toBeDefined();
        expect(tool.parametersJsonSchema.type).toBe('object');
        expect(tool.parametersJsonSchema.properties).toBeDefined();
        expect(Array.isArray(tool.parametersJsonSchema.required)).toBe(true);
      }
    );
  });
});

describe('geminiTools', () => {
  it('when accessed then is array with one element', () => {
    expect(geminiTools).toHaveLength(1);
  });

  it('when accessed then element contains functionDeclarations', () => {
    expect(geminiTools[0].functionDeclarations).toBeDefined();
    expect(Array.isArray(geminiTools[0].functionDeclarations)).toBe(true);
  });

  it('when accessed then functionDeclarations contains all five tools', () => {
    expect(geminiTools[0].functionDeclarations).toHaveLength(5);
  });
});

describe('GEMINI_TOOL_NAMES', () => {
  it('when accessed then contains all tool names', () => {
    expect(GEMINI_TOOL_NAMES.SEARCH_REPERTORY).toBe('search_repertory');
    expect(GEMINI_TOOL_NAMES.SEARCH_MATERIA_MEDICA).toBe('search_materia_medica');
    expect(GEMINI_TOOL_NAMES.GET_REMEDY_INFO).toBe('get_remedy_info');
    expect(GEMINI_TOOL_NAMES.LIST_AVAILABLE_REPERTORIES).toBe('list_available_repertories');
    expect(GEMINI_TOOL_NAMES.LIST_AVAILABLE_MATERIA_MEDICAS).toBe('list_available_materia_medicas');
  });
});

describe('createGeminiToolExecutors', () => {
  let mockClient: OOREPSDKClient;
  let executors: GeminiToolExecutors;

  beforeEach(() => {
    mockClient = {
      searchRepertory: vi.fn().mockResolvedValue({ totalResults: 1, rubrics: [] }),
      searchMateriaMedica: vi.fn().mockResolvedValue({ totalResults: 1, results: [] }),
      getRemedyInfo: vi.fn().mockResolvedValue({ id: 1, nameAbbrev: 'Acon.' }),
      listRepertories: vi.fn().mockResolvedValue([{ abbreviation: 'kent' }]),
      listMateriaMedicas: vi.fn().mockResolvedValue([{ abbreviation: 'boericke' }]),
    } as unknown as OOREPSDKClient;
    executors = createGeminiToolExecutors(mockClient);
  });

  it('when called then returns executors for all five tools', () => {
    expect(executors.search_repertory).toBeDefined();
    expect(executors.search_materia_medica).toBeDefined();
    expect(executors.get_remedy_info).toBeDefined();
    expect(executors.list_available_repertories).toBeDefined();
    expect(executors.list_available_materia_medicas).toBeDefined();
  });

  it('when search_repertory executor called then calls client method', async () => {
    const args = { symptom: 'headache' };
    await executors.search_repertory(args);
    expect(mockClient.searchRepertory).toHaveBeenCalledWith(args);
  });

  it('when search_materia_medica executor called then calls client method', async () => {
    const args = { symptom: 'anxiety' };
    await executors.search_materia_medica(args);
    expect(mockClient.searchMateriaMedica).toHaveBeenCalledWith(args);
  });

  it('when get_remedy_info executor called then calls client method', async () => {
    const args = { remedy: 'belladonna' };
    await executors.get_remedy_info(args);
    expect(mockClient.getRemedyInfo).toHaveBeenCalledWith(args);
  });

  it('when list_available_repertories executor called then calls client method', async () => {
    const args = { language: 'en' };
    await executors.list_available_repertories(args);
    expect(mockClient.listRepertories).toHaveBeenCalledWith(args);
  });

  it('when list_available_materia_medicas executor called then calls client method', async () => {
    const args = { language: 'de' };
    await executors.list_available_materia_medicas(args);
    expect(mockClient.listMateriaMedicas).toHaveBeenCalledWith(args);
  });
});

describe('executeGeminiFunctionCall', () => {
  let mockClient: OOREPSDKClient;
  let executors: GeminiToolExecutors;

  beforeEach(() => {
    mockClient = {
      searchRepertory: vi.fn().mockResolvedValue({ totalResults: 5, rubrics: [] }),
      searchMateriaMedica: vi.fn().mockResolvedValue({ totalResults: 3, results: [] }),
      getRemedyInfo: vi.fn().mockResolvedValue({ id: 1, nameAbbrev: 'Acon.' }),
      listRepertories: vi.fn().mockResolvedValue([{ abbreviation: 'kent' }]),
      listMateriaMedicas: vi.fn().mockResolvedValue([{ abbreviation: 'boericke' }]),
    } as unknown as OOREPSDKClient;
    executors = createGeminiToolExecutors(mockClient);
  });

  it('when valid function call then executes and returns result', async () => {
    const functionCall = {
      name: 'search_repertory',
      args: { symptom: 'headache' },
    };

    const result = await executeGeminiFunctionCall(executors, functionCall);

    expect(result).toEqual({ totalResults: 5, rubrics: [] });
    expect(mockClient.searchRepertory).toHaveBeenCalledWith({ symptom: 'headache' });
  });

  it('when unknown function then throws error', async () => {
    const functionCall = {
      name: 'unknown_function',
      args: {},
    };

    await expect(executeGeminiFunctionCall(executors, functionCall)).rejects.toThrow(
      'Unknown function: unknown_function'
    );
  });

  it('when unknown function then error includes available functions', async () => {
    const functionCall = {
      name: 'unknown_function',
      args: {},
    };

    await expect(executeGeminiFunctionCall(executors, functionCall)).rejects.toThrow(
      'Available functions:'
    );
  });

  it.each([
    ['search_repertory', { symptom: 'fever' }],
    ['search_materia_medica', { symptom: 'anxiety' }],
    ['get_remedy_info', { remedy: 'nux-v' }],
    ['list_available_repertories', { language: 'en' }],
    ['list_available_materia_medicas', {}],
  ])('when function %s called then dispatches to correct executor', async (name, args) => {
    const functionCall = { name, args };

    await executeGeminiFunctionCall(executors, functionCall);

    // Verify the correct client method was called
    const methodName = {
      search_repertory: 'searchRepertory',
      search_materia_medica: 'searchMateriaMedica',
      get_remedy_info: 'getRemedyInfo',
      list_available_repertories: 'listRepertories',
      list_available_materia_medicas: 'listMateriaMedicas',
    }[name] as keyof OOREPSDKClient;

    expect(mockClient[methodName]).toHaveBeenCalled();
  });
});

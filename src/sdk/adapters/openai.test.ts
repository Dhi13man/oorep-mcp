/**
 * Unit tests for OpenAI Adapter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  openAITools,
  getOpenAITools,
  executeOpenAITool,
  executeOOREPTool,
  createToolExecutor,
  formatToolResult,
  processToolCalls,
  type OpenAITool,
} from './openai.js';
import type { OOREPSDKClient } from '../client.js';

describe('openAITools', () => {
  it('when accessed then contains all five tools', () => {
    // Assert
    expect(openAITools).toHaveLength(5);
  });

  it('when accessed then all tools have correct type', () => {
    // Assert
    openAITools.forEach((tool) => {
      expect(tool.type).toBe('function');
    });
  });

  it.each([
    'search_repertory',
    'search_materia_medica',
    'get_remedy_info',
    'list_available_repertories',
    'list_available_materia_medicas',
  ])('when accessed then contains tool %s', (toolName) => {
    // Act
    const tool = openAITools.find((t) => t.function.name === toolName);

    // Assert
    expect(tool).toBeDefined();
  });

  describe('tool structure', () => {
    it.each(openAITools.map((t) => [t.function.name, t]))(
      'when tool %s then has OpenAI format',
      (_name, tool) => {
        // Assert
        expect(tool.type).toBe('function');
        expect(tool.function).toBeDefined();
        expect(tool.function.name).toBeDefined();
        expect(tool.function.description).toBeDefined();
        expect(tool.function.parameters).toBeDefined();
        expect(tool.function.parameters.type).toBe('object');
        expect(tool.function.parameters.properties).toBeDefined();
        expect(Array.isArray(tool.function.parameters.required)).toBe(true);
      }
    );
  });
});

describe('getOpenAITools', () => {
  it('when no filter then returns all tools', () => {
    // Act
    const tools = getOpenAITools();

    // Assert
    expect(tools).toHaveLength(5);
  });

  it('when empty array filter then returns all tools', () => {
    // Act
    const tools = getOpenAITools([]);

    // Assert
    expect(tools).toHaveLength(5);
  });

  it('when specific tools requested then returns only those tools', () => {
    // Act
    const tools = getOpenAITools(['search_repertory', 'get_remedy_info']);

    // Assert
    expect(tools).toHaveLength(2);
    expect(tools.map((t) => t.function.name)).toContain('search_repertory');
    expect(tools.map((t) => t.function.name)).toContain('get_remedy_info');
  });

  it('when nonexistent tool requested then returns empty array', () => {
    // Act
    const tools = getOpenAITools(['nonexistent']);

    // Assert
    expect(tools).toHaveLength(0);
  });

  it('when mix of valid and invalid names then returns only valid', () => {
    // Act
    const tools = getOpenAITools(['search_repertory', 'nonexistent']);

    // Assert
    expect(tools).toHaveLength(1);
    expect(tools[0].function.name).toBe('search_repertory');
  });
});

describe('executeOOREPTool', () => {
  let mockClient: OOREPSDKClient;

  beforeEach(() => {
    mockClient = {
      searchRepertory: vi.fn().mockResolvedValue({ totalResults: 1, rubrics: [] }),
      searchMateriaMedica: vi.fn().mockResolvedValue({ totalResults: 1, results: [] }),
      getRemedyInfo: vi.fn().mockResolvedValue({ id: 1, nameAbbrev: 'Acon.' }),
      listRepertories: vi.fn().mockResolvedValue([{ abbreviation: 'kent' }]),
      listMateriaMedicas: vi.fn().mockResolvedValue([{ abbreviation: 'boericke' }]),
    } as unknown as OOREPSDKClient;
  });

  it('when search_repertory then calls client.searchRepertory', async () => {
    // Arrange
    const args = { symptom: 'headache', minWeight: 2 };

    // Act
    await executeOOREPTool(mockClient, 'search_repertory', args);

    // Assert
    expect(mockClient.searchRepertory).toHaveBeenCalledWith({
      symptom: 'headache',
      repertory: undefined,
      minWeight: 2,
      maxResults: undefined,
      includeRemedyStats: undefined,
    });
  });

  it('when search_materia_medica then calls client.searchMateriaMedica', async () => {
    // Arrange
    const args = { symptom: 'anxiety', remedy: 'acon' };

    // Act
    await executeOOREPTool(mockClient, 'search_materia_medica', args);

    // Assert
    expect(mockClient.searchMateriaMedica).toHaveBeenCalledWith({
      symptom: 'anxiety',
      materiamedica: undefined,
      remedy: 'acon',
      maxResults: undefined,
    });
  });

  it('when get_remedy_info then calls client.getRemedyInfo', async () => {
    // Arrange
    const args = { remedy: 'belladonna' };

    // Act
    await executeOOREPTool(mockClient, 'get_remedy_info', args);

    // Assert
    expect(mockClient.getRemedyInfo).toHaveBeenCalledWith({
      remedy: 'belladonna',
    });
  });

  it('when list_available_repertories then calls client.listRepertories', async () => {
    // Arrange
    const args = { language: 'en' };

    // Act
    await executeOOREPTool(mockClient, 'list_available_repertories', args);

    // Assert
    expect(mockClient.listRepertories).toHaveBeenCalledWith({
      language: 'en',
    });
  });

  it('when list_available_materia_medicas then calls client.listMateriaMedicas', async () => {
    // Arrange
    const args = { language: 'de' };

    // Act
    await executeOOREPTool(mockClient, 'list_available_materia_medicas', args);

    // Assert
    expect(mockClient.listMateriaMedicas).toHaveBeenCalledWith({
      language: 'de',
    });
  });

  it('when unknown tool then throws error', async () => {
    // Act & Assert
    await expect(
      executeOOREPTool(mockClient, 'unknown_tool', {})
    ).rejects.toThrow('Unknown tool: unknown_tool');
  });
});

describe('executeOpenAITool', () => {
  let mockClient: OOREPSDKClient;

  beforeEach(() => {
    mockClient = {
      searchRepertory: vi.fn().mockResolvedValue({ totalResults: 1 }),
    } as unknown as OOREPSDKClient;
  });

  it('when valid JSON then parses and executes', async () => {
    // Arrange
    const argumentsJson = '{"symptom": "headache"}';

    // Act
    await executeOpenAITool(mockClient, 'search_repertory', argumentsJson);

    // Assert
    expect(mockClient.searchRepertory).toHaveBeenCalledWith(
      expect.objectContaining({ symptom: 'headache' })
    );
  });

  it('when invalid JSON then throws error', async () => {
    // Arrange
    const argumentsJson = 'invalid json';

    // Act & Assert
    await expect(
      executeOpenAITool(mockClient, 'search_repertory', argumentsJson)
    ).rejects.toThrow();
  });
});

describe('createToolExecutor', () => {
  it('when called then returns function that executes tools', async () => {
    // Arrange
    const mockClient = {
      searchRepertory: vi.fn().mockResolvedValue({ totalResults: 5 }),
    } as unknown as OOREPSDKClient;

    // Act
    const executor = createToolExecutor(mockClient);
    const result = await executor('search_repertory', '{"symptom": "fever"}');

    // Assert
    expect(result).toEqual({ totalResults: 5 });
    expect(mockClient.searchRepertory).toHaveBeenCalled();
  });
});

describe('formatToolResult', () => {
  it('when object then returns formatted JSON string', () => {
    // Arrange
    const result = { totalResults: 5, rubrics: [] };

    // Act
    const formatted = formatToolResult(result);

    // Assert
    expect(formatted).toContain('"totalResults": 5');
    expect(formatted).toContain('"rubrics": []');
  });

  it('when null then returns null string', () => {
    // Act
    const formatted = formatToolResult(null);

    // Assert
    expect(formatted).toBe('null');
  });

  it('when array then returns formatted array', () => {
    // Arrange
    const result = [1, 2, 3];

    // Act
    const formatted = formatToolResult(result);

    // Assert
    expect(JSON.parse(formatted)).toEqual([1, 2, 3]);
  });
});

describe('processToolCalls', () => {
  let mockClient: OOREPSDKClient;

  beforeEach(() => {
    mockClient = {
      searchRepertory: vi.fn().mockResolvedValue({ totalResults: 1 }),
      getRemedyInfo: vi.fn().mockResolvedValue({ id: 1, nameAbbrev: 'Acon.' }),
    } as unknown as OOREPSDKClient;
  });

  it('when undefined then returns empty array', async () => {
    // Act
    const result = await processToolCalls(mockClient, undefined);

    // Assert
    expect(result).toEqual([]);
  });

  it('when empty array then returns empty array', async () => {
    // Act
    const result = await processToolCalls(mockClient, []);

    // Assert
    expect(result).toEqual([]);
  });

  it('when single tool call then processes and returns result', async () => {
    // Arrange
    const toolCalls = [
      {
        id: 'call_123',
        function: {
          name: 'search_repertory',
          arguments: '{"symptom": "headache"}',
        },
      },
    ];

    // Act
    const results = await processToolCalls(mockClient, toolCalls);

    // Assert
    expect(results).toHaveLength(1);
    expect(results[0].tool_call_id).toBe('call_123');
    expect(results[0].role).toBe('tool');
    expect(results[0].content).toContain('totalResults');
  });

  it('when multiple tool calls then processes all in parallel', async () => {
    // Arrange
    const toolCalls = [
      {
        id: 'call_1',
        function: { name: 'search_repertory', arguments: '{"symptom": "headache"}' },
      },
      {
        id: 'call_2',
        function: { name: 'get_remedy_info', arguments: '{"remedy": "acon"}' },
      },
    ];

    // Act
    const results = await processToolCalls(mockClient, toolCalls);

    // Assert
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.tool_call_id).sort()).toEqual(['call_1', 'call_2']);
  });

  it('when tool execution fails then returns error in content', async () => {
    // Arrange
    const errorMessage = 'API connection failed';
    mockClient.searchRepertory = vi.fn().mockRejectedValue(new Error(errorMessage));
    const toolCalls = [
      {
        id: 'call_error',
        function: { name: 'search_repertory', arguments: '{"symptom": "test"}' },
      },
    ];

    // Act
    const results = await processToolCalls(mockClient, toolCalls);

    // Assert
    expect(results).toHaveLength(1);
    expect(results[0].tool_call_id).toBe('call_error');
    expect(results[0].role).toBe('tool');
    const content = JSON.parse(results[0].content);
    expect(content.error).toBe(errorMessage);
  });

  it('when non-Error thrown then returns unknown error', async () => {
    // Arrange
    mockClient.searchRepertory = vi.fn().mockRejectedValue('string error');
    const toolCalls = [
      {
        id: 'call_1',
        function: { name: 'search_repertory', arguments: '{"symptom": "test"}' },
      },
    ];

    // Act
    const results = await processToolCalls(mockClient, toolCalls);

    // Assert
    const content = JSON.parse(results[0].content);
    expect(content.error).toBe('Unknown error');
  });
});

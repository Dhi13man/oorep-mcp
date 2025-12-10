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
  openAIFormatResourceAsSystemMessage,
  openAIFormatResourcesAsContext,
  convertPromptToOpenAI,
  openAIConvertPromptWithContext,
  type OpenAITool,
} from './openai.js';
import type { OOREPSDKClient, ResourceContent, PromptResult } from '../client.js';
import { NotFoundError } from '../../utils/errors.js';

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

  it('when unknown tool then throws NotFoundError', async () => {
    // Act & Assert
    await expect(executeOOREPTool(mockClient, 'unknown_tool', {})).rejects.toThrow(NotFoundError);
  });

  it('when unknown tool then error has correct properties', async () => {
    // Act & Assert
    try {
      await executeOOREPTool(mockClient, 'unknown_tool', {});
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundError);
      const notFoundError = error as NotFoundError;
      expect(notFoundError.resourceType).toBe('tool');
      expect(notFoundError.resourceName).toBe('unknown_tool');
    }
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

describe('openAIFormatResourceAsSystemMessage', () => {
  it('when valid resource then returns system message with role and content', () => {
    // Arrange
    const mockResource: ResourceContent = {
      uri: 'oorep://help/search-syntax',
      mimeType: 'text/markdown',
      text: 'Search syntax help content',
    };

    // Act
    const result = openAIFormatResourceAsSystemMessage(mockResource);

    // Assert
    expect(result.role).toBe('system');
    expect(result.content).toBe('Search syntax help content');
  });

  it('when resource has empty text then returns empty content', () => {
    // Arrange
    const mockResource: ResourceContent = {
      uri: 'oorep://help/empty',
      mimeType: 'text/plain',
      text: '',
    };

    // Act
    const result = openAIFormatResourceAsSystemMessage(mockResource);

    // Assert
    expect(result.role).toBe('system');
    expect(result.content).toBe('');
  });

  it('when resource has multiline text then preserves formatting', () => {
    // Arrange
    const multilineText = 'Line 1\nLine 2\nLine 3';
    const mockResource: ResourceContent = {
      uri: 'oorep://help/multiline',
      mimeType: 'text/markdown',
      text: multilineText,
    };

    // Act
    const result = openAIFormatResourceAsSystemMessage(mockResource);

    // Assert
    expect(result.content).toBe(multilineText);
  });
});

describe('openAIFormatResourcesAsContext', () => {
  it('when single resource then returns formatted string with header', () => {
    // Arrange
    const mockResource: ResourceContent = {
      uri: 'oorep://help/syntax',
      mimeType: 'text/markdown',
      text: 'Help content here',
    };

    // Act
    const result = openAIFormatResourcesAsContext([mockResource]);

    // Assert
    expect(result).toContain('## Resource: oorep://help/syntax');
    expect(result).toContain('Help content here');
  });

  it('when multiple resources then joins with separator', () => {
    // Arrange
    const resource1: ResourceContent = {
      uri: 'oorep://resource1',
      mimeType: 'text/plain',
      text: 'Content A',
    };
    const resource2: ResourceContent = {
      uri: 'oorep://resource2',
      mimeType: 'text/plain',
      text: 'Content B',
    };

    // Act
    const result = openAIFormatResourcesAsContext([resource1, resource2]);

    // Assert
    expect(result).toContain('## Resource: oorep://resource1');
    expect(result).toContain('Content A');
    expect(result).toContain('---');
    expect(result).toContain('## Resource: oorep://resource2');
    expect(result).toContain('Content B');
  });

  it('when empty array then returns empty string', () => {
    // Act
    const result = openAIFormatResourcesAsContext([]);

    // Assert
    expect(result).toBe('');
  });
});

describe('convertPromptToOpenAI', () => {
  it('when user message then converts with user role', () => {
    // Arrange
    const mockPrompt: PromptResult = {
      name: 'analyze-symptoms',
      description: 'Test prompt',
      messages: [
        {
          role: 'user',
          content: { type: 'text', text: 'User question here' },
        },
      ],
    };

    // Act
    const result = convertPromptToOpenAI(mockPrompt);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('user');
    expect(result[0].content).toBe('User question here');
  });

  it('when assistant message then converts with assistant role', () => {
    // Arrange
    const mockPrompt: PromptResult = {
      name: 'test-prompt',
      description: 'Test prompt',
      messages: [
        {
          role: 'assistant',
          content: { type: 'text', text: 'Assistant response here' },
        },
      ],
    };

    // Act
    const result = convertPromptToOpenAI(mockPrompt);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('assistant');
    expect(result[0].content).toBe('Assistant response here');
  });

  it('when mixed messages then converts all correctly', () => {
    // Arrange
    const mockPrompt: PromptResult = {
      name: 'conversation',
      description: 'Multi-turn conversation',
      messages: [
        { role: 'user', content: { type: 'text', text: 'Question 1' } },
        { role: 'assistant', content: { type: 'text', text: 'Answer 1' } },
        { role: 'user', content: { type: 'text', text: 'Question 2' } },
        { role: 'assistant', content: { type: 'text', text: 'Answer 2' } },
      ],
    };

    // Act
    const result = convertPromptToOpenAI(mockPrompt);

    // Assert
    expect(result).toHaveLength(4);
    expect(result[0].role).toBe('user');
    expect(result[0].content).toBe('Question 1');
    expect(result[1].role).toBe('assistant');
    expect(result[1].content).toBe('Answer 1');
    expect(result[2].role).toBe('user');
    expect(result[2].content).toBe('Question 2');
    expect(result[3].role).toBe('assistant');
    expect(result[3].content).toBe('Answer 2');
  });

  it('when empty messages then returns empty array', () => {
    // Arrange
    const mockPrompt: PromptResult = {
      name: 'empty',
      description: 'Empty prompt',
      messages: [],
    };

    // Act
    const result = convertPromptToOpenAI(mockPrompt);

    // Assert
    expect(result).toHaveLength(0);
  });
});

describe('openAIConvertPromptWithContext', () => {
  it('when resource and prompt provided then combines with system message first', () => {
    // Arrange
    const mockResource: ResourceContent = {
      uri: 'oorep://help/syntax',
      mimeType: 'text/markdown',
      text: 'System context here',
    };
    const mockPrompt: PromptResult = {
      name: 'test',
      description: 'Test',
      messages: [{ role: 'user', content: { type: 'text', text: 'User message' } }],
    };

    // Act
    const result = openAIConvertPromptWithContext(mockResource, mockPrompt);

    // Assert
    expect(result).toHaveLength(2);
    expect(result[0].role).toBe('system');
    expect(result[0].content).toBe('System context here');
    expect(result[1].role).toBe('user');
    expect(result[1].content).toBe('User message');
  });

  it('when prompt has multiple messages then preserves order after system', () => {
    // Arrange
    const mockResource: ResourceContent = {
      uri: 'oorep://context',
      mimeType: 'text/plain',
      text: 'Context',
    };
    const mockPrompt: PromptResult = {
      name: 'multi',
      description: 'Multi-message prompt',
      messages: [
        { role: 'user', content: { type: 'text', text: 'Q1' } },
        { role: 'assistant', content: { type: 'text', text: 'A1' } },
        { role: 'user', content: { type: 'text', text: 'Q2' } },
      ],
    };

    // Act
    const result = openAIConvertPromptWithContext(mockResource, mockPrompt);

    // Assert
    expect(result).toHaveLength(4);
    expect(result[0].role).toBe('system');
    expect(result[1].role).toBe('user');
    expect(result[2].role).toBe('assistant');
    expect(result[3].role).toBe('user');
  });

  it('when prompt has no messages then returns only system message', () => {
    // Arrange
    const mockResource: ResourceContent = {
      uri: 'oorep://only-context',
      mimeType: 'text/plain',
      text: 'Only context, no prompt',
    };
    const mockPrompt: PromptResult = {
      name: 'empty',
      description: 'Empty',
      messages: [],
    };

    // Act
    const result = openAIConvertPromptWithContext(mockResource, mockPrompt);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('system');
    expect(result[0].content).toBe('Only context, no prompt');
  });
});

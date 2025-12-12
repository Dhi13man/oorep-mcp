/**
 * Unit tests for LangChain Adapter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from '../../utils/schemas.js';
import {
  createLangChainTools,
  getLangChainTools,
  createLangGraphTools,
  isLangChainToolDefinition,
  langChainFormatResourceAsSystemMessage,
  langChainFormatResourceAsDocument,
  langChainFormatResourcesAsDocuments,
  langChainFormatResourcesAsContext,
  convertPromptToLangChain,
  langChainConvertPromptWithContext,
  type LangChainToolDefinition,
} from './langchain.js';
import type { OOREPClient, ResourceContent, PromptResult } from '../client.js';

describe('createLangChainTools', () => {
  let mockClient: OOREPClient;

  beforeEach(() => {
    mockClient = {
      searchRepertory: vi.fn().mockResolvedValue({ totalResults: 1, rubrics: [] }),
      searchMateriaMedica: vi.fn().mockResolvedValue({ totalResults: 1, results: [] }),
      getRemedyInfo: vi.fn().mockResolvedValue({ id: 1, nameAbbrev: 'Acon.' }),
      listRepertories: vi.fn().mockResolvedValue([{ abbreviation: 'kent' }]),
      listMateriaMedicas: vi.fn().mockResolvedValue([{ abbreviation: 'boericke' }]),
    } as unknown as OOREPClient;
  });

  it('when called then returns array with all five tools', () => {
    // Act
    const tools = createLangChainTools(mockClient);

    // Assert
    expect(tools).toHaveLength(5);
  });

  it.each([
    'search_repertory',
    'search_materia_medica',
    'get_remedy_info',
    'list_available_repertories',
    'list_available_materia_medicas',
  ])('when called then contains tool %s', (toolName) => {
    // Act
    const tools = createLangChainTools(mockClient);
    const tool = tools.find((t) => t.name === toolName);

    // Assert
    expect(tool).toBeDefined();
  });

  describe('tool structure', () => {
    it('when tool accessed then has name', () => {
      // Act
      const tools = createLangChainTools(mockClient);

      // Assert
      tools.forEach((tool) => {
        expect(tool.name).toBeDefined();
        expect(typeof tool.name).toBe('string');
      });
    });

    it('when tool accessed then has description', () => {
      // Act
      const tools = createLangChainTools(mockClient);

      // Assert
      tools.forEach((tool) => {
        expect(tool.description).toBeDefined();
        expect(typeof tool.description).toBe('string');
      });
    });

    it('when tool accessed then has Zod schema', () => {
      // Act
      const tools = createLangChainTools(mockClient);

      // Assert
      tools.forEach((tool) => {
        expect(tool.schema).toBeDefined();
        expect(tool.schema instanceof z.ZodObject).toBe(true);
      });
    });

    it('when tool accessed then has func that returns Promise<string>', async () => {
      // Act
      const tools = createLangChainTools(mockClient);
      const searchTool = tools.find((t) => t.name === 'search_repertory')!;

      // Assert
      expect(typeof searchTool.func).toBe('function');
      const result = await searchTool.func({ symptom: 'test' });
      expect(typeof result).toBe('string');
    });
  });

  describe('search_repertory tool', () => {
    it('when executed then returns JSON string', async () => {
      // Arrange
      const tools = createLangChainTools(mockClient);
      const tool = tools.find((t) => t.name === 'search_repertory')!;

      // Act
      const result = await tool.func({ symptom: 'headache' });

      // Assert
      expect(typeof result).toBe('string');
      const parsed = JSON.parse(result);
      expect(parsed.totalResults).toBeDefined();
    });

    it('when executed then calls client.searchRepertory', async () => {
      // Arrange
      const tools = createLangChainTools(mockClient);
      const tool = tools.find((t) => t.name === 'search_repertory')!;

      // Act
      await tool.func({
        symptom: 'headache',
        repertory: 'kent',
        minWeight: 2,
        maxResults: 10,
        includeRemedyStats: true,
      });

      // Assert
      expect(mockClient.searchRepertory).toHaveBeenCalledWith({
        symptom: 'headache',
        repertory: 'kent',
        minWeight: 2,
        maxResults: 10,
        includeRemedyStats: true,
      });
    });
  });

  describe('search_materia_medica tool', () => {
    it('when executed then returns JSON string', async () => {
      // Arrange
      const tools = createLangChainTools(mockClient);
      const tool = tools.find((t) => t.name === 'search_materia_medica')!;

      // Act
      const result = await tool.func({ symptom: 'anxiety' });

      // Assert
      const parsed = JSON.parse(result);
      expect(parsed.totalResults).toBeDefined();
    });

    it('when executed then calls client.searchMateriaMedica', async () => {
      // Arrange
      const tools = createLangChainTools(mockClient);
      const tool = tools.find((t) => t.name === 'search_materia_medica')!;

      // Act
      await tool.func({ symptom: 'anxiety', remedy: 'acon' });

      // Assert
      expect(mockClient.searchMateriaMedica).toHaveBeenCalledWith({
        symptom: 'anxiety',
        materiamedica: undefined,
        remedy: 'acon',
        maxResults: undefined,
      });
    });
  });

  describe('get_remedy_info tool', () => {
    it('when executed then returns JSON string', async () => {
      // Arrange
      const tools = createLangChainTools(mockClient);
      const tool = tools.find((t) => t.name === 'get_remedy_info')!;

      // Act
      const result = await tool.func({ remedy: 'acon' });

      // Assert
      const parsed = JSON.parse(result);
      expect(parsed.id).toBeDefined();
    });

    it('when executed then calls client.getRemedyInfo', async () => {
      // Arrange
      const tools = createLangChainTools(mockClient);
      const tool = tools.find((t) => t.name === 'get_remedy_info')!;

      // Act
      await tool.func({ remedy: 'belladonna' });

      // Assert
      expect(mockClient.getRemedyInfo).toHaveBeenCalledWith({
        remedy: 'belladonna',
      });
    });
  });

  describe('list_available_repertories tool', () => {
    it('when executed then returns JSON string', async () => {
      // Arrange
      const tools = createLangChainTools(mockClient);
      const tool = tools.find((t) => t.name === 'list_available_repertories')!;

      // Act
      const result = await tool.func({});

      // Assert
      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
    });

    it('when executed with language then calls client.listRepertories', async () => {
      // Arrange
      const tools = createLangChainTools(mockClient);
      const tool = tools.find((t) => t.name === 'list_available_repertories')!;

      // Act
      await tool.func({ language: 'en' });

      // Assert
      expect(mockClient.listRepertories).toHaveBeenCalledWith({
        language: 'en',
      });
    });
  });

  describe('list_available_materia_medicas tool', () => {
    it('when executed then returns JSON string', async () => {
      // Arrange
      const tools = createLangChainTools(mockClient);
      const tool = tools.find((t) => t.name === 'list_available_materia_medicas')!;

      // Act
      const result = await tool.func({});

      // Assert
      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
    });

    it('when executed with language then calls client.listMateriaMedicas', async () => {
      // Arrange
      const tools = createLangChainTools(mockClient);
      const tool = tools.find((t) => t.name === 'list_available_materia_medicas')!;

      // Act
      await tool.func({ language: 'de' });

      // Assert
      expect(mockClient.listMateriaMedicas).toHaveBeenCalledWith({
        language: 'de',
      });
    });
  });
});

describe('getLangChainTools', () => {
  let mockClient: OOREPClient;

  beforeEach(() => {
    mockClient = {
      searchRepertory: vi.fn(),
      searchMateriaMedica: vi.fn(),
      getRemedyInfo: vi.fn(),
      listRepertories: vi.fn(),
      listMateriaMedicas: vi.fn(),
    } as unknown as OOREPClient;
  });

  it('when specific tools requested then returns only those', () => {
    // Act
    const tools = getLangChainTools(mockClient, ['search_repertory', 'get_remedy_info']);

    // Assert
    expect(tools).toHaveLength(2);
    expect(tools.map((t) => t.name)).toContain('search_repertory');
    expect(tools.map((t) => t.name)).toContain('get_remedy_info');
  });

  it('when nonexistent tool requested then filters it out', () => {
    // Act
    const tools = getLangChainTools(mockClient, ['search_repertory', 'nonexistent']);

    // Assert
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('search_repertory');
  });

  it('when empty array then returns empty array', () => {
    // Act
    const tools = getLangChainTools(mockClient, []);

    // Assert
    expect(tools).toHaveLength(0);
  });

  it('when all tools requested then returns all five', () => {
    // Act
    const tools = getLangChainTools(mockClient, [
      'search_repertory',
      'search_materia_medica',
      'get_remedy_info',
      'list_available_repertories',
      'list_available_materia_medicas',
    ]);

    // Assert
    expect(tools).toHaveLength(5);
  });
});

describe('createLangGraphTools', () => {
  let mockClient: OOREPClient;

  beforeEach(() => {
    mockClient = {
      searchRepertory: vi.fn(),
      searchMateriaMedica: vi.fn(),
      getRemedyInfo: vi.fn(),
      listRepertories: vi.fn(),
      listMateriaMedicas: vi.fn(),
    } as unknown as OOREPClient;
  });

  it('when called then returns object with tools array', () => {
    // Act
    const result = createLangGraphTools(mockClient);

    // Assert
    expect(result.tools).toBeDefined();
    expect(Array.isArray(result.tools)).toBe(true);
    expect(result.tools).toHaveLength(5);
  });

  it('when called then returns object with toolsByName', () => {
    // Act
    const result = createLangGraphTools(mockClient);

    // Assert
    expect(result.toolsByName).toBeDefined();
    expect(typeof result.toolsByName).toBe('object');
  });

  it('when toolsByName accessed then contains all tools', () => {
    // Act
    const result = createLangGraphTools(mockClient);

    // Assert
    expect(result.toolsByName.search_repertory).toBeDefined();
    expect(result.toolsByName.search_materia_medica).toBeDefined();
    expect(result.toolsByName.get_remedy_info).toBeDefined();
    expect(result.toolsByName.list_available_repertories).toBeDefined();
    expect(result.toolsByName.list_available_materia_medicas).toBeDefined();
  });

  it('when toolsByName accessed then tools have correct structure', () => {
    // Act
    const result = createLangGraphTools(mockClient);
    const tool = result.toolsByName.search_repertory;

    // Assert
    expect(tool.name).toBe('search_repertory');
    expect(tool.description).toBeDefined();
    expect(tool.schema).toBeDefined();
    expect(tool.func).toBeDefined();
  });
});

describe('isLangChainToolDefinition', () => {
  it('when valid tool definition then returns true', () => {
    // Arrange
    const validTool: LangChainToolDefinition = {
      name: 'test',
      description: 'Test tool',
      schema: z.object({ input: z.string() }),
      func: async () => 'result',
    };

    // Act & Assert
    expect(isLangChainToolDefinition(validTool)).toBe(true);
  });

  it('when missing name then returns false', () => {
    // Arrange
    const invalidTool = {
      description: 'Test',
      schema: z.object({}),
      func: async () => 'result',
    };

    // Act & Assert
    expect(isLangChainToolDefinition(invalidTool)).toBe(false);
  });

  it('when missing description then returns false', () => {
    // Arrange
    const invalidTool = {
      name: 'test',
      schema: z.object({}),
      func: async () => 'result',
    };

    // Act & Assert
    expect(isLangChainToolDefinition(invalidTool)).toBe(false);
  });

  it('when missing schema then returns false', () => {
    // Arrange
    const invalidTool = {
      name: 'test',
      description: 'Test',
      func: async () => 'result',
    };

    // Act & Assert
    expect(isLangChainToolDefinition(invalidTool)).toBe(false);
  });

  it('when missing func then returns false', () => {
    // Arrange
    const invalidTool = {
      name: 'test',
      description: 'Test',
      schema: z.object({}),
    };

    // Act & Assert
    expect(isLangChainToolDefinition(invalidTool)).toBe(false);
  });

  it('when null then returns false', () => {
    // Act & Assert
    expect(isLangChainToolDefinition(null)).toBe(false);
  });

  it('when undefined then returns false', () => {
    // Act & Assert
    expect(isLangChainToolDefinition(undefined)).toBe(false);
  });

  it('when primitive then returns false', () => {
    // Act & Assert
    expect(isLangChainToolDefinition('string')).toBe(false);
    expect(isLangChainToolDefinition(123)).toBe(false);
    expect(isLangChainToolDefinition(true)).toBe(false);
  });
});

describe('langChainFormatResourceAsSystemMessage', () => {
  it('when valid resource then returns system message with type and content', () => {
    // Arrange
    const mockResource: ResourceContent = {
      uri: 'oorep://help/search-syntax',
      mimeType: 'text/markdown',
      text: 'Search syntax help content',
    };

    // Act
    const result = langChainFormatResourceAsSystemMessage(mockResource);

    // Assert
    expect(result.type).toBe('system');
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
    const result = langChainFormatResourceAsSystemMessage(mockResource);

    // Assert
    expect(result.type).toBe('system');
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
    const result = langChainFormatResourceAsSystemMessage(mockResource);

    // Assert
    expect(result.content).toBe(multilineText);
  });
});

describe('langChainFormatResourceAsDocument', () => {
  it('when valid resource then returns document with pageContent and metadata', () => {
    // Arrange
    const mockResource: ResourceContent = {
      uri: 'oorep://remedies/list',
      mimeType: 'application/json',
      text: '{"remedies": []}',
    };

    // Act
    const result = langChainFormatResourceAsDocument(mockResource);

    // Assert
    expect(result.pageContent).toBe('{"remedies": []}');
    expect(result.metadata.uri).toBe('oorep://remedies/list');
    expect(result.metadata.mimeType).toBe('application/json');
    expect(result.metadata.source).toBe('oorep-mcp');
  });

  it('when resource has markdown content then preserves it', () => {
    // Arrange
    const markdownContent = '# Title\n\n## Section\n\nContent here';
    const mockResource: ResourceContent = {
      uri: 'oorep://help/syntax',
      mimeType: 'text/markdown',
      text: markdownContent,
    };

    // Act
    const result = langChainFormatResourceAsDocument(mockResource);

    // Assert
    expect(result.pageContent).toBe(markdownContent);
    expect(result.metadata.mimeType).toBe('text/markdown');
  });
});

describe('langChainFormatResourcesAsDocuments', () => {
  it('when single resource then returns array with one document', () => {
    // Arrange
    const mockResource: ResourceContent = {
      uri: 'oorep://test',
      mimeType: 'text/plain',
      text: 'Test content',
    };

    // Act
    const result = langChainFormatResourcesAsDocuments([mockResource]);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].pageContent).toBe('Test content');
  });

  it('when multiple resources then returns array with all documents', () => {
    // Arrange
    const resource1: ResourceContent = {
      uri: 'oorep://resource1',
      mimeType: 'text/plain',
      text: 'Content 1',
    };
    const resource2: ResourceContent = {
      uri: 'oorep://resource2',
      mimeType: 'text/markdown',
      text: 'Content 2',
    };
    const resource3: ResourceContent = {
      uri: 'oorep://resource3',
      mimeType: 'application/json',
      text: '{"key": "value"}',
    };

    // Act
    const result = langChainFormatResourcesAsDocuments([resource1, resource2, resource3]);

    // Assert
    expect(result).toHaveLength(3);
    expect(result[0].pageContent).toBe('Content 1');
    expect(result[1].pageContent).toBe('Content 2');
    expect(result[2].pageContent).toBe('{"key": "value"}');
    expect(result[0].metadata.uri).toBe('oorep://resource1');
    expect(result[1].metadata.uri).toBe('oorep://resource2');
    expect(result[2].metadata.uri).toBe('oorep://resource3');
  });

  it('when empty array then returns empty array', () => {
    // Act
    const result = langChainFormatResourcesAsDocuments([]);

    // Assert
    expect(result).toHaveLength(0);
  });
});

describe('langChainFormatResourcesAsContext', () => {
  it('when single resource then returns formatted string with header', () => {
    // Arrange
    const mockResource: ResourceContent = {
      uri: 'oorep://help/syntax',
      mimeType: 'text/markdown',
      text: 'Help content here',
    };

    // Act
    const result = langChainFormatResourcesAsContext([mockResource]);

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
    const result = langChainFormatResourcesAsContext([resource1, resource2]);

    // Assert
    expect(result).toContain('## Resource: oorep://resource1');
    expect(result).toContain('Content A');
    expect(result).toContain('---');
    expect(result).toContain('## Resource: oorep://resource2');
    expect(result).toContain('Content B');
  });

  it('when empty array then returns empty string', () => {
    // Act
    const result = langChainFormatResourcesAsContext([]);

    // Assert
    expect(result).toBe('');
  });
});

describe('convertPromptToLangChain', () => {
  it('when user message then converts to human message type', () => {
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
    const result = convertPromptToLangChain(mockPrompt);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('human');
    expect(result[0].content).toBe('User question here');
  });

  it('when assistant message then converts to ai message type', () => {
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
    const result = convertPromptToLangChain(mockPrompt);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('ai');
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
    const result = convertPromptToLangChain(mockPrompt);

    // Assert
    expect(result).toHaveLength(4);
    expect(result[0].type).toBe('human');
    expect(result[0].content).toBe('Question 1');
    expect(result[1].type).toBe('ai');
    expect(result[1].content).toBe('Answer 1');
    expect(result[2].type).toBe('human');
    expect(result[2].content).toBe('Question 2');
    expect(result[3].type).toBe('ai');
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
    const result = convertPromptToLangChain(mockPrompt);

    // Assert
    expect(result).toHaveLength(0);
  });
});

describe('langChainConvertPromptWithContext', () => {
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
    const result = langChainConvertPromptWithContext(mockResource, mockPrompt);

    // Assert
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('system');
    expect(result[0].content).toBe('System context here');
    expect(result[1].type).toBe('human');
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
    const result = langChainConvertPromptWithContext(mockResource, mockPrompt);

    // Assert
    expect(result).toHaveLength(4);
    expect(result[0].type).toBe('system');
    expect(result[1].type).toBe('human');
    expect(result[2].type).toBe('ai');
    expect(result[3].type).toBe('human');
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
    const result = langChainConvertPromptWithContext(mockResource, mockPrompt);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('system');
    expect(result[0].content).toBe('Only context, no prompt');
  });
});

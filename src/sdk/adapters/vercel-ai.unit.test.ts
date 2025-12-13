/**
 * Unit tests for Vercel AI SDK Adapter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from '../../utils/schemas.js';
import {
  createOOREPTools,
  getOOREPTools,
  createSearchRepertoryTool,
  createSearchMateriaMedicaTool,
  createGetRemedyInfoTool,
  createListRepertoriesTool,
  createListMateriaMedicasTool,
  vercelAIFormatResourceAsSystemMessage,
  vercelAIFormatResourcesAsContext,
  convertPromptToVercelAI,
  vercelAIGetSystemInstruction,
  vercelAICombinePromptWithContext,
  type OOREPTools,
} from './vercel-ai.js';
import type { OOREPClient, ResourceContent, PromptResult } from '../client.js';

describe('createOOREPTools', () => {
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

  it('when called then returns object with all five tools', () => {
    // Act
    const tools = createOOREPTools(mockClient);

    // Assert
    expect(Object.keys(tools)).toHaveLength(5);
    expect(tools.search_repertory).toBeDefined();
    expect(tools.search_materia_medica).toBeDefined();
    expect(tools.get_remedy_info).toBeDefined();
    expect(tools.list_available_repertories).toBeDefined();
    expect(tools.list_available_materia_medicas).toBeDefined();
  });

  describe('tool structure', () => {
    it('when tool accessed then has description', () => {
      // Act
      const tools = createOOREPTools(mockClient);

      // Assert
      expect(tools.search_repertory.description).toBeDefined();
      expect(typeof tools.search_repertory.description).toBe('string');
    });

    it('when tool accessed then has Zod parameters schema', () => {
      // Act
      const tools = createOOREPTools(mockClient);

      // Assert
      expect(tools.search_repertory.parameters).toBeDefined();
      expect(tools.search_repertory.parameters instanceof z.ZodType).toBe(true);
    });

    it('when tool accessed then has execute function', () => {
      // Act
      const tools = createOOREPTools(mockClient);

      // Assert
      expect(tools.search_repertory.execute).toBeDefined();
      expect(typeof tools.search_repertory.execute).toBe('function');
    });
  });

  describe('search_repertory tool', () => {
    it('when executed then calls client.searchRepertory', async () => {
      // Arrange
      const tools = createOOREPTools(mockClient);
      const args = { symptom: 'headache', minWeight: 2, maxResults: 10, includeRemedyStats: true };

      // Act
      await tools.search_repertory.execute(args);

      // Assert
      expect(mockClient.searchRepertory).toHaveBeenCalledWith(args);
    });

    it('when executed with minimal args then works', async () => {
      // Arrange
      const tools = createOOREPTools(mockClient);

      // Act
      await tools.search_repertory.execute({ symptom: 'fever' });

      // Assert
      expect(mockClient.searchRepertory).toHaveBeenCalledWith({ symptom: 'fever' });
    });

    it('when parameters validated then accepts valid input', () => {
      // Arrange
      const tools = createOOREPTools(mockClient);
      const input = { symptom: 'headache', minWeight: 2, maxResults: 50 };

      // Act
      const result = tools.search_repertory.parameters.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
    });

    it('when minWeight out of range then validation fails', () => {
      // Arrange
      const tools = createOOREPTools(mockClient);
      const input = { symptom: 'headache', minWeight: 5 };

      // Act
      const result = tools.search_repertory.parameters.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('search_materia_medica tool', () => {
    it('when executed then calls client.searchMateriaMedica', async () => {
      // Arrange
      const tools = createOOREPTools(mockClient);
      const args = { symptom: 'anxiety', remedy: 'acon' };

      // Act
      await tools.search_materia_medica.execute(args);

      // Assert
      expect(mockClient.searchMateriaMedica).toHaveBeenCalledWith(args);
    });
  });

  describe('get_remedy_info tool', () => {
    it('when executed then calls client.getRemedyInfo', async () => {
      // Arrange
      const tools = createOOREPTools(mockClient);
      const args = { remedy: 'belladonna' };

      // Act
      await tools.get_remedy_info.execute(args);

      // Assert
      expect(mockClient.getRemedyInfo).toHaveBeenCalledWith(args);
    });
  });

  describe('list_available_repertories tool', () => {
    it('when executed then calls client.listRepertories', async () => {
      // Arrange
      const tools = createOOREPTools(mockClient);
      const args = { language: 'en' };

      // Act
      await tools.list_available_repertories.execute(args);

      // Assert
      expect(mockClient.listRepertories).toHaveBeenCalledWith(args);
    });

    it('when executed without args then works', async () => {
      // Arrange
      const tools = createOOREPTools(mockClient);

      // Act
      await tools.list_available_repertories.execute({});

      // Assert
      expect(mockClient.listRepertories).toHaveBeenCalledWith({});
    });
  });

  describe('list_available_materia_medicas tool', () => {
    it('when executed then calls client.listMateriaMedicas', async () => {
      // Arrange
      const tools = createOOREPTools(mockClient);
      const args = { language: 'de' };

      // Act
      await tools.list_available_materia_medicas.execute(args);

      // Assert
      expect(mockClient.listMateriaMedicas).toHaveBeenCalledWith(args);
    });
  });
});

describe('getOOREPTools', () => {
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

  it('when single tool requested then returns only that tool', () => {
    // Act
    const tools = getOOREPTools(mockClient, ['search_repertory']);

    // Assert
    expect(Object.keys(tools)).toHaveLength(1);
    expect(tools.search_repertory).toBeDefined();
  });

  it('when multiple tools requested then returns those tools', () => {
    // Act
    const tools = getOOREPTools(mockClient, ['search_repertory', 'get_remedy_info']);

    // Assert
    expect(Object.keys(tools)).toHaveLength(2);
    expect(tools.search_repertory).toBeDefined();
    expect(tools.get_remedy_info).toBeDefined();
  });

  it('when all tools requested then returns all', () => {
    // Act
    const tools = getOOREPTools(mockClient, [
      'search_repertory',
      'search_materia_medica',
      'get_remedy_info',
      'list_available_repertories',
      'list_available_materia_medicas',
    ]);

    // Assert
    expect(Object.keys(tools)).toHaveLength(5);
  });
});

describe('individual tool creators', () => {
  let mockClient: OOREPClient;

  beforeEach(() => {
    mockClient = {
      searchRepertory: vi.fn().mockResolvedValue({ totalResults: 1 }),
      searchMateriaMedica: vi.fn().mockResolvedValue({ totalResults: 1 }),
      getRemedyInfo: vi.fn().mockResolvedValue({ id: 1 }),
      listRepertories: vi.fn().mockResolvedValue([]),
      listMateriaMedicas: vi.fn().mockResolvedValue([]),
    } as unknown as OOREPClient;
  });

  describe('createSearchRepertoryTool', () => {
    it('when called then returns search_repertory tool', () => {
      // Act
      const tool = createSearchRepertoryTool(mockClient);

      // Assert
      expect(tool.description).toContain('repertor');
      expect(tool.parameters).toBeDefined();
      expect(tool.execute).toBeDefined();
    });

    it('when executed then calls client', async () => {
      // Arrange
      const tool = createSearchRepertoryTool(mockClient);

      // Act
      await tool.execute({ symptom: 'test' });

      // Assert
      expect(mockClient.searchRepertory).toHaveBeenCalled();
    });
  });

  describe('createSearchMateriaMedicaTool', () => {
    it('when called then returns search_materia_medica tool', () => {
      // Act
      const tool = createSearchMateriaMedicaTool(mockClient);

      // Assert
      expect(tool.description).toContain('materia medica');
      expect(tool.execute).toBeDefined();
    });

    it('when executed then calls client', async () => {
      // Arrange
      const tool = createSearchMateriaMedicaTool(mockClient);

      // Act
      await tool.execute({ symptom: 'test' });

      // Assert
      expect(mockClient.searchMateriaMedica).toHaveBeenCalled();
    });
  });

  describe('createGetRemedyInfoTool', () => {
    it('when called then returns get_remedy_info tool', () => {
      // Act
      const tool = createGetRemedyInfoTool(mockClient);

      // Assert
      expect(tool.description).toContain('remedy');
      expect(tool.execute).toBeDefined();
    });

    it('when executed then calls client', async () => {
      // Arrange
      const tool = createGetRemedyInfoTool(mockClient);

      // Act
      await tool.execute({ remedy: 'acon' });

      // Assert
      expect(mockClient.getRemedyInfo).toHaveBeenCalled();
    });
  });

  describe('createListRepertoriesTool', () => {
    it('when called then returns list_available_repertories tool', () => {
      // Act
      const tool = createListRepertoriesTool(mockClient);

      // Assert
      expect(tool.description).toContain('repertor');
      expect(tool.execute).toBeDefined();
    });

    it('when executed then calls client', async () => {
      // Arrange
      const tool = createListRepertoriesTool(mockClient);

      // Act
      await tool.execute({});

      // Assert
      expect(mockClient.listRepertories).toHaveBeenCalled();
    });
  });

  describe('createListMateriaMedicasTool', () => {
    it('when called then returns list_available_materia_medicas tool', () => {
      // Act
      const tool = createListMateriaMedicasTool(mockClient);

      // Assert
      expect(tool.description).toContain('materia medica');
      expect(tool.execute).toBeDefined();
    });

    it('when executed then calls client', async () => {
      // Arrange
      const tool = createListMateriaMedicasTool(mockClient);

      // Act
      await tool.execute({});

      // Assert
      expect(mockClient.listMateriaMedicas).toHaveBeenCalled();
    });
  });
});

describe('vercelAIFormatResourceAsSystemMessage', () => {
  it('when valid resource then returns system message with role and content', () => {
    // Arrange
    const mockResource: ResourceContent = {
      uri: 'oorep://help/search-syntax',
      mimeType: 'text/markdown',
      text: 'Search syntax help content',
    };

    // Act
    const result = vercelAIFormatResourceAsSystemMessage(mockResource);

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
    const result = vercelAIFormatResourceAsSystemMessage(mockResource);

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
    const result = vercelAIFormatResourceAsSystemMessage(mockResource);

    // Assert
    expect(result.content).toBe(multilineText);
  });
});

describe('vercelAIFormatResourcesAsContext', () => {
  it('when single resource then returns formatted string with header', () => {
    // Arrange
    const mockResource: ResourceContent = {
      uri: 'oorep://help/syntax',
      mimeType: 'text/markdown',
      text: 'Help content here',
    };

    // Act
    const result = vercelAIFormatResourcesAsContext([mockResource]);

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
    const result = vercelAIFormatResourcesAsContext([resource1, resource2]);

    // Assert
    expect(result).toContain('## Resource: oorep://resource1');
    expect(result).toContain('Content A');
    expect(result).toContain('---');
    expect(result).toContain('## Resource: oorep://resource2');
    expect(result).toContain('Content B');
  });

  it('when empty array then returns empty string', () => {
    // Act
    const result = vercelAIFormatResourcesAsContext([]);

    // Assert
    expect(result).toBe('');
  });
});

describe('convertPromptToVercelAI', () => {
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
    const result = convertPromptToVercelAI(mockPrompt);

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
    const result = convertPromptToVercelAI(mockPrompt);

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
    const result = convertPromptToVercelAI(mockPrompt);

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
    const result = convertPromptToVercelAI(mockPrompt);

    // Assert
    expect(result).toHaveLength(0);
  });
});

describe('vercelAIGetSystemInstruction', () => {
  it('when valid resource then returns plain text content', () => {
    // Arrange
    const mockResource: ResourceContent = {
      uri: 'oorep://help/syntax',
      mimeType: 'text/markdown',
      text: 'System instruction text',
    };

    // Act
    const result = vercelAIGetSystemInstruction(mockResource);

    // Assert
    expect(result).toBe('System instruction text');
  });

  it('when empty text then returns empty string', () => {
    // Arrange
    const mockResource: ResourceContent = {
      uri: 'oorep://empty',
      mimeType: 'text/plain',
      text: '',
    };

    // Act
    const result = vercelAIGetSystemInstruction(mockResource);

    // Assert
    expect(result).toBe('');
  });

  it('when multiline text then preserves formatting', () => {
    // Arrange
    const multilineText = 'Line 1\nLine 2\nLine 3';
    const mockResource: ResourceContent = {
      uri: 'oorep://multiline',
      mimeType: 'text/markdown',
      text: multilineText,
    };

    // Act
    const result = vercelAIGetSystemInstruction(mockResource);

    // Assert
    expect(result).toBe(multilineText);
  });
});

describe('vercelAICombinePromptWithContext', () => {
  it('when resource and prompt provided then returns object with system and messages', () => {
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
    const result = vercelAICombinePromptWithContext(mockResource, mockPrompt);

    // Assert
    expect(result.system).toBe('System context here');
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[0].content).toBe('User message');
  });

  it('when prompt has multiple messages then preserves all in messages array', () => {
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
    const result = vercelAICombinePromptWithContext(mockResource, mockPrompt);

    // Assert
    expect(result.system).toBe('Context');
    expect(result.messages).toHaveLength(3);
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[1].role).toBe('assistant');
    expect(result.messages[2].role).toBe('user');
  });

  it('when prompt has no messages then returns system and empty messages array', () => {
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
    const result = vercelAICombinePromptWithContext(mockResource, mockPrompt);

    // Assert
    expect(result.system).toBe('Only context, no prompt');
    expect(result.messages).toHaveLength(0);
  });
});

/**
 * Unit tests for LangChain Adapter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  createLangChainTools,
  getLangChainTools,
  createLangGraphTools,
  isLangChainToolDefinition,
  type LangChainToolDefinition,
} from './langchain.js';
import type { OOREPSDKClient } from '../client.js';

describe('createLangChainTools', () => {
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
  let mockClient: OOREPSDKClient;

  beforeEach(() => {
    mockClient = {
      searchRepertory: vi.fn(),
      searchMateriaMedica: vi.fn(),
      getRemedyInfo: vi.fn(),
      listRepertories: vi.fn(),
      listMateriaMedicas: vi.fn(),
    } as unknown as OOREPSDKClient;
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
  let mockClient: OOREPSDKClient;

  beforeEach(() => {
    mockClient = {
      searchRepertory: vi.fn(),
      searchMateriaMedica: vi.fn(),
      getRemedyInfo: vi.fn(),
      listRepertories: vi.fn(),
      listMateriaMedicas: vi.fn(),
    } as unknown as OOREPSDKClient;
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

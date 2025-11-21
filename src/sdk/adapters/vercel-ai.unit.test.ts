/**
 * Unit tests for Vercel AI SDK Adapter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  createOOREPTools,
  getOOREPTools,
  createSearchRepertoryTool,
  createSearchMateriaMedicaTool,
  createGetRemedyInfoTool,
  createListRepertoriesTool,
  createListMateriaMedicasTool,
  type OOREPTools,
} from './vercel-ai.js';
import type { OOREPSDKClient } from '../client.js';

describe('createOOREPTools', () => {
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
  let mockClient: OOREPSDKClient;

  beforeEach(() => {
    mockClient = {
      searchRepertory: vi.fn().mockResolvedValue({ totalResults: 1 }),
      searchMateriaMedica: vi.fn().mockResolvedValue({ totalResults: 1 }),
      getRemedyInfo: vi.fn().mockResolvedValue({ id: 1 }),
      listRepertories: vi.fn().mockResolvedValue([]),
      listMateriaMedicas: vi.fn().mockResolvedValue([]),
    } as unknown as OOREPSDKClient;
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

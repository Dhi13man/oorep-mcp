/**
 * Unit tests for tool registry
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ToolRegistry } from './index.js';
import type { OOREPConfig } from '../config.js';

describe('ToolRegistry', () => {
  let mockRegistry: ToolRegistry;
  let mockConfig: OOREPConfig;

  beforeEach(() => {
    mockConfig = {
      baseUrl: 'https://test.oorep.com',
      timeoutMs: 5000,
      cacheTtlMs: 300000,
      maxResults: 100,
      logLevel: 'error',
      defaultRepertory: 'test-rep',
      defaultMateriaMedica: 'test-mm',
    };

    mockRegistry = new ToolRegistry(mockConfig);
  });

  describe('constructor', () => {
    it('ToolRegistry when created then registers all tools', () => {
      const definitions = mockRegistry.getDefinitions();

      expect(definitions.length).toBeGreaterThan(0);
    });

    it('ToolRegistry when created then includes search_repertory', () => {
      const definitions = mockRegistry.getDefinitions();
      const searchRepTool = definitions.find((d) => d.name === 'search_repertory');

      expect(searchRepTool).toBeDefined();
    });

    it('ToolRegistry when created then includes search_materia_medica', () => {
      const definitions = mockRegistry.getDefinitions();
      const searchMMTool = definitions.find((d) => d.name === 'search_materia_medica');

      expect(searchMMTool).toBeDefined();
    });

    it('ToolRegistry when created then includes get_remedy_info', () => {
      const definitions = mockRegistry.getDefinitions();
      const remedyInfoTool = definitions.find((d) => d.name === 'get_remedy_info');

      expect(remedyInfoTool).toBeDefined();
    });

    it('ToolRegistry when created then includes list_available_repertories', () => {
      const definitions = mockRegistry.getDefinitions();
      const listRepTool = definitions.find((d) => d.name === 'list_available_repertories');

      expect(listRepTool).toBeDefined();
    });

    it('ToolRegistry when created then includes list_available_materia_medicas', () => {
      const definitions = mockRegistry.getDefinitions();
      const listMMTool = definitions.find((d) => d.name === 'list_available_materia_medicas');

      expect(listMMTool).toBeDefined();
    });
  });

  describe('getDefinitions', () => {
    it('getDefinitions when called then returns array of tool definitions', () => {
      const definitions = mockRegistry.getDefinitions();

      expect(Array.isArray(definitions)).toBe(true);
      expect(definitions.length).toBe(5);
    });

    it('getDefinitions when called then each definition has required properties', () => {
      const definitions = mockRegistry.getDefinitions();

      definitions.forEach((def) => {
        expect(def).toHaveProperty('name');
        expect(def).toHaveProperty('description');
        expect(def).toHaveProperty('inputSchema');
        expect(def.inputSchema).toHaveProperty('type');
        expect(def.inputSchema).toHaveProperty('properties');
      });
    });
  });

  describe('getTool', () => {
    it('getTool when tool exists then returns handler', () => {
      const tool = mockRegistry.getTool('search_repertory');

      expect(tool).toBeDefined();
      expect(tool).toHaveProperty('execute');
    });

    it('getTool when tool does not exist then returns undefined', () => {
      const tool = mockRegistry.getTool('nonexistent_tool');

      expect(tool).toBeUndefined();
    });

    it.each([
      'search_repertory',
      'search_materia_medica',
      'get_remedy_info',
      'list_available_repertories',
      'list_available_materia_medicas',
    ])('getTool when %s requested then returns handler', (toolName: string) => {
      const tool = mockRegistry.getTool(toolName);

      expect(tool).toBeDefined();
    });
  });

  describe('executeTool', () => {
    it('executeTool when tool not found then throws error', async () => {
      await expect(mockRegistry.executeTool('nonexistent', {})).rejects.toThrow();
    });

    it('executeTool when tool not found then error mentions tool name', async () => {
      try {
        await mockRegistry.executeTool('nonexistent_tool', {});
      } catch (error) {
        expect((error as Error).message).toContain('nonexistent_tool');
      }
    });

    it('executeTool when valid tool then delegates to tool execute', async () => {
      const mockTool = mockRegistry.getTool('search_repertory');
      if (!mockTool) throw new Error('Tool not found');

      const mockExecute = vi.spyOn(mockTool, 'execute').mockResolvedValue({
        totalResults: 0,
        rubrics: [],
      });

      await mockRegistry.executeTool('search_repertory', { symptom: 'test' });

      expect(mockExecute).toHaveBeenCalledWith({ symptom: 'test' });
    });

    it('executeTool when tool execution fails then propagates error', async () => {
      const mockTool = mockRegistry.getTool('search_repertory');
      if (!mockTool) throw new Error('Tool not found');

      const mockError = new Error('Tool execution failed');
      vi.spyOn(mockTool, 'execute').mockRejectedValue(mockError);

      await expect(mockRegistry.executeTool('search_repertory', { symptom: 'test' })).rejects.toThrow(
        mockError
      );
    });
  });

  describe('tool definitions structure', () => {
    it('search_repertory when definition then has correct structure', () => {
      const definitions = mockRegistry.getDefinitions();
      const tool = definitions.find((d) => d.name === 'search_repertory');

      expect(tool?.inputSchema.properties).toHaveProperty('symptom');
      expect(tool?.inputSchema.required).toContain('symptom');
    });

    it('search_materia_medica when definition then has correct structure', () => {
      const definitions = mockRegistry.getDefinitions();
      const tool = definitions.find((d) => d.name === 'search_materia_medica');

      expect(tool?.inputSchema.properties).toHaveProperty('symptom');
      expect(tool?.inputSchema.required).toContain('symptom');
    });

    it('get_remedy_info when definition then has correct structure', () => {
      const definitions = mockRegistry.getDefinitions();
      const tool = definitions.find((d) => d.name === 'get_remedy_info');

      expect(tool?.inputSchema.properties).toHaveProperty('remedy');
      expect(tool?.inputSchema.required).toContain('remedy');
    });

    it('list_available_repertories when definition then has correct structure', () => {
      const definitions = mockRegistry.getDefinitions();
      const tool = definitions.find((d) => d.name === 'list_available_repertories');

      expect(tool?.inputSchema.properties).toHaveProperty('language');
      expect(tool?.inputSchema.required).toBeUndefined();
    });

    it('list_available_materia_medicas when definition then has correct structure', () => {
      const definitions = mockRegistry.getDefinitions();
      const tool = definitions.find((d) => d.name === 'list_available_materia_medicas');

      expect(tool?.inputSchema.properties).toHaveProperty('language');
      expect(tool?.inputSchema.required).toBeUndefined();
    });
  });
});

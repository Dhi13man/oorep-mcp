/**
 * Unit tests for resource registry
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResourceRegistry } from './index.js';
import type { OOREPConfig } from '../config.js';

describe('ResourceRegistry', () => {
  let mockRegistry: ResourceRegistry;
  let mockConfig: OOREPConfig;
  let mockClientGetRemedies: ReturnType<typeof vi.fn>;
  let mockClientGetRepertories: ReturnType<typeof vi.fn>;
  let mockClientGetMMs: ReturnType<typeof vi.fn>;

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

    mockRegistry = new ResourceRegistry(mockConfig);

    mockClientGetRemedies = vi.fn();
    mockClientGetRepertories = vi.fn();
    mockClientGetMMs = vi.fn();

    (mockRegistry as any).client.getAvailableRemedies = mockClientGetRemedies;
    (mockRegistry as any).client.getAvailableRepertories = mockClientGetRepertories;
    (mockRegistry as any).client.getAvailableMateriaMedicas = mockClientGetMMs;
  });

  describe('getDefinitions', () => {
    it('getDefinitions when called then returns array of resource definitions', () => {
      const definitions = mockRegistry.getDefinitions();

      expect(Array.isArray(definitions)).toBe(true);
      expect(definitions.length).toBe(4);
    });

    it('getDefinitions when called then includes remedies list', () => {
      const definitions = mockRegistry.getDefinitions();
      const remediesResource = definitions.find((d) => d.uri === 'oorep://remedies/list');

      expect(remediesResource).toBeDefined();
      expect(remediesResource?.name).toBe('Available Remedies List');
      expect(remediesResource?.mimeType).toBe('application/json');
    });

    it('getDefinitions when called then includes repertories list', () => {
      const definitions = mockRegistry.getDefinitions();
      const repertoriesResource = definitions.find((d) => d.uri === 'oorep://repertories/list');

      expect(repertoriesResource).toBeDefined();
      expect(repertoriesResource?.name).toBe('Available Repertories List');
    });

    it('getDefinitions when called then includes materia medicas list', () => {
      const definitions = mockRegistry.getDefinitions();
      const mmsResource = definitions.find((d) => d.uri === 'oorep://materia-medicas/list');

      expect(mmsResource).toBeDefined();
      expect(mmsResource?.name).toBe('Available Materia Medicas List');
    });

    it('getDefinitions when called then includes search syntax help', () => {
      const definitions = mockRegistry.getDefinitions();
      const helpResource = definitions.find((d) => d.uri === 'oorep://help/search-syntax');

      expect(helpResource).toBeDefined();
      expect(helpResource?.name).toBe('OOREP Search Syntax Help');
      expect(helpResource?.mimeType).toBe('text/markdown');
    });
  });

  describe('getResource - remedies list', () => {
    it('getResource when oorep://remedies/list then returns remedies', async () => {
      const mockRemedies = [
        { id: 1, nameAbbrev: 'Acon.', nameLong: 'Aconitum napellus', namealt: [] },
      ];
      mockClientGetRemedies.mockResolvedValue(mockRemedies);

      const result = await mockRegistry.getResource('oorep://remedies/list');

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('oorep://remedies/list');
      expect(result.contents[0].mimeType).toBe('application/json');
      expect(JSON.parse(result.contents[0].text)).toEqual(mockRemedies);
    });

    it('getResource when remedies cached then returns from cache', async () => {
      const mockRemedies = [{ id: 1, nameAbbrev: 'Test', nameLong: 'Test', namealt: [] }];
      mockClientGetRemedies.mockResolvedValue(mockRemedies);

      await mockRegistry.getResource('oorep://remedies/list');
      mockClientGetRemedies.mockClear();
      await mockRegistry.getResource('oorep://remedies/list');

      expect(mockClientGetRemedies).not.toHaveBeenCalled();
    });
  });

  describe('getResource - repertories list', () => {
    it('getResource when oorep://repertories/list then returns repertories', async () => {
      const mockRepertories = [{ abbreviation: 'kent', title: 'Kent Repertory' }];
      mockClientGetRepertories.mockResolvedValue(mockRepertories);

      const result = await mockRegistry.getResource('oorep://repertories/list');

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('oorep://repertories/list');
      expect(result.contents[0].mimeType).toBe('application/json');
      expect(JSON.parse(result.contents[0].text)).toEqual(mockRepertories);
    });

    it('getResource when repertories cached then returns from cache', async () => {
      const mockRepertories = [{ abbreviation: 'test', title: 'Test' }];
      mockClientGetRepertories.mockResolvedValue(mockRepertories);

      await mockRegistry.getResource('oorep://repertories/list');
      mockClientGetRepertories.mockClear();
      await mockRegistry.getResource('oorep://repertories/list');

      expect(mockClientGetRepertories).not.toHaveBeenCalled();
    });
  });

  describe('getResource - materia medicas list', () => {
    it('getResource when oorep://materia-medicas/list then returns materia medicas', async () => {
      const mockMMs = [{ abbreviation: 'boericke', title: 'Boericke MM' }];
      mockClientGetMMs.mockResolvedValue(mockMMs);

      const result = await mockRegistry.getResource('oorep://materia-medicas/list');

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('oorep://materia-medicas/list');
      expect(result.contents[0].mimeType).toBe('application/json');
      expect(JSON.parse(result.contents[0].text)).toEqual(mockMMs);
    });

    it('getResource when materia medicas cached then returns from cache', async () => {
      const mockMMs = [{ abbreviation: 'test', title: 'Test' }];
      mockClientGetMMs.mockResolvedValue(mockMMs);

      await mockRegistry.getResource('oorep://materia-medicas/list');
      mockClientGetMMs.mockClear();
      await mockRegistry.getResource('oorep://materia-medicas/list');

      expect(mockClientGetMMs).not.toHaveBeenCalled();
    });
  });

  describe('getResource - search syntax help', () => {
    it('getResource when oorep://help/search-syntax then returns help text', async () => {
      const result = await mockRegistry.getResource('oorep://help/search-syntax');

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('oorep://help/search-syntax');
      expect(result.contents[0].mimeType).toBe('text/markdown');
      expect(result.contents[0].text).toContain('# OOREP Search Syntax Guide');
    });

    it('getResource when search syntax help then includes wildcard section', async () => {
      const result = await mockRegistry.getResource('oorep://help/search-syntax');

      expect(result.contents[0].text).toContain('## Wildcards');
      expect(result.contents[0].text).toContain('asterisk');
    });

    it('getResource when search syntax help then includes exclusion section', async () => {
      const result = await mockRegistry.getResource('oorep://help/search-syntax');

      expect(result.contents[0].text).toContain('## Exclusions');
      expect(result.contents[0].text).toContain('minus sign');
    });

    it('getResource when search syntax help then includes exact phrase section', async () => {
      const result = await mockRegistry.getResource('oorep://help/search-syntax');

      expect(result.contents[0].text).toContain('## Exact Phrases');
      expect(result.contents[0].text).toContain('quotation marks');
    });

    it('getResource when search syntax help then includes examples', async () => {
      const result = await mockRegistry.getResource('oorep://help/search-syntax');

      expect(result.contents[0].text).toContain('## Examples');
    });
  });

  describe('getResource - error handling', () => {
    it('getResource when unknown URI then throws error', async () => {
      await expect(mockRegistry.getResource('oorep://unknown/resource')).rejects.toThrow();
    });

    it('getResource when unknown URI then error mentions resource', async () => {
      try {
        await mockRegistry.getResource('oorep://unknown/resource');
      } catch (error) {
        expect((error as Error).message).toContain('oorep://unknown/resource');
      }
    });

    it('getResource when API error then sanitizes error', async () => {
      mockClientGetRemedies.mockRejectedValue(new Error('API Error'));

      await expect(mockRegistry.getResource('oorep://remedies/list')).rejects.toThrow();
    });
  });

  describe('JSON formatting', () => {
    it('getResource when JSON resource then formats with indentation', async () => {
      const mockRemedies = [{ id: 1, nameAbbrev: 'Test', nameLong: 'Test', namealt: [] }];
      mockClientGetRemedies.mockResolvedValue(mockRemedies);

      const result = await mockRegistry.getResource('oorep://remedies/list');
      const text = result.contents[0].text;

      expect(text).toContain('\n');
      expect(text).toContain('  ');
    });
  });
});

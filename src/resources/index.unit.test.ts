/**
 * Unit tests for resource registry
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResourceRegistry } from './index.js';
import type { OOREPConfig } from '../config.js';

// Use vi.hoisted to create mock functions that can be accessed inside vi.mock
const { mockGetAvailableRemedies, mockGetAvailableRepertories, mockGetAvailableMateriaMedicas } =
  vi.hoisted(() => ({
    mockGetAvailableRemedies: vi.fn(),
    mockGetAvailableRepertories: vi.fn(),
    mockGetAvailableMateriaMedicas: vi.fn(),
  }));

// Mock the OOREPClient from lib
vi.mock('../lib/oorep-client.js', () => {
  return {
    OOREPClient: class MockOOREPClient {
      getAvailableRemedies = mockGetAvailableRemedies;
      getAvailableRepertories = mockGetAvailableRepertories;
      getAvailableMateriaMedicas = mockGetAvailableMateriaMedicas;
    },
  };
});

describe('ResourceRegistry', () => {
  let registry: ResourceRegistry;
  let mockConfig: OOREPConfig;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Set up default mock implementations
    mockGetAvailableRemedies.mockResolvedValue([
      { id: 1, nameAbbrev: 'Acon.', nameLong: 'Aconitum napellus', namealt: [] },
    ]);
    mockGetAvailableRepertories.mockResolvedValue([
      { abbreviation: 'kent', title: 'Kent Repertory' },
    ]);
    mockGetAvailableMateriaMedicas.mockResolvedValue([
      { abbreviation: 'boericke', title: 'Boericke MM' },
    ]);

    mockConfig = {
      baseUrl: 'https://test.oorep.com',
      timeoutMs: 5000,
      cacheTtlMs: 300000,
      maxResults: 100,
      logLevel: 'error',
      defaultRepertory: 'test-rep',
      defaultMateriaMedica: 'test-mm',
    };

    registry = new ResourceRegistry(mockConfig);
  });

  describe('getDefinitions', () => {
    it('getDefinitions when called then returns array of resource definitions', () => {
      const definitions = registry.getDefinitions();

      expect(Array.isArray(definitions)).toBe(true);
      expect(definitions.length).toBe(4);
    });

    it('getDefinitions when called then includes remedies list', () => {
      const definitions = registry.getDefinitions();
      const remediesResource = definitions.find((d) => d.uri === 'oorep://remedies/list');

      expect(remediesResource).toBeDefined();
      expect(remediesResource?.name).toBe('Available Remedies List');
      expect(remediesResource?.mimeType).toBe('application/json');
    });

    it('getDefinitions when called then includes repertories list', () => {
      const definitions = registry.getDefinitions();
      const repertoriesResource = definitions.find((d) => d.uri === 'oorep://repertories/list');

      expect(repertoriesResource).toBeDefined();
      expect(repertoriesResource?.name).toBe('Available Repertories List');
    });

    it('getDefinitions when called then includes materia medicas list', () => {
      const definitions = registry.getDefinitions();
      const mmsResource = definitions.find((d) => d.uri === 'oorep://materia-medicas/list');

      expect(mmsResource).toBeDefined();
      expect(mmsResource?.name).toBe('Available Materia Medicas List');
    });

    it('getDefinitions when called then includes search syntax help', () => {
      const definitions = registry.getDefinitions();
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
      mockGetAvailableRemedies.mockResolvedValue(mockRemedies);

      const result = await registry.getResource('oorep://remedies/list');

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('oorep://remedies/list');
      expect(result.contents[0].mimeType).toBe('application/json');
      expect(JSON.parse(result.contents[0].text)).toEqual(mockRemedies);
    });

    it('getResource when remedies cached then uses cache', async () => {
      const mockRemedies = [{ id: 1, nameAbbrev: 'Test', nameLong: 'Test', namealt: [] }];
      mockGetAvailableRemedies.mockResolvedValue(mockRemedies);

      await registry.getResource('oorep://remedies/list');
      await registry.getResource('oorep://remedies/list');

      // Registry caches results - should only call API once
      expect(mockGetAvailableRemedies).toHaveBeenCalledTimes(1);
    });
  });

  describe('getResource - repertories list', () => {
    it('getResource when oorep://repertories/list then returns repertories', async () => {
      const mockRepertories = [{ abbreviation: 'kent', title: 'Kent Repertory' }];
      mockGetAvailableRepertories.mockResolvedValue(mockRepertories);

      const result = await registry.getResource('oorep://repertories/list');

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('oorep://repertories/list');
      expect(result.contents[0].mimeType).toBe('application/json');
      expect(JSON.parse(result.contents[0].text)).toEqual(mockRepertories);
    });

    it('getResource when repertories cached then uses cache', async () => {
      const mockRepertories = [{ abbreviation: 'test', title: 'Test' }];
      mockGetAvailableRepertories.mockResolvedValue(mockRepertories);

      await registry.getResource('oorep://repertories/list');
      await registry.getResource('oorep://repertories/list');

      // Registry caches results - should only call API once
      expect(mockGetAvailableRepertories).toHaveBeenCalledTimes(1);
    });
  });

  describe('getResource - materia medicas list', () => {
    it('getResource when oorep://materia-medicas/list then returns materia medicas', async () => {
      const mockMMs = [{ abbreviation: 'boericke', title: 'Boericke MM' }];
      mockGetAvailableMateriaMedicas.mockResolvedValue(mockMMs);

      const result = await registry.getResource('oorep://materia-medicas/list');

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('oorep://materia-medicas/list');
      expect(result.contents[0].mimeType).toBe('application/json');
      expect(JSON.parse(result.contents[0].text)).toEqual(mockMMs);
    });

    it('getResource when materia medicas cached then uses cache', async () => {
      const mockMMs = [{ abbreviation: 'test', title: 'Test' }];
      mockGetAvailableMateriaMedicas.mockResolvedValue(mockMMs);

      await registry.getResource('oorep://materia-medicas/list');
      await registry.getResource('oorep://materia-medicas/list');

      // Registry caches results - should only call API once
      expect(mockGetAvailableMateriaMedicas).toHaveBeenCalledTimes(1);
    });
  });

  describe('getResource - search syntax help', () => {
    it('getResource when oorep://help/search-syntax then returns help text', async () => {
      const result = await registry.getResource('oorep://help/search-syntax');

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('oorep://help/search-syntax');
      expect(result.contents[0].mimeType).toBe('text/markdown');
      expect(result.contents[0].text).toContain('# OOREP Search Syntax Guide');
    });

    it('getResource when search syntax help then includes wildcard section', async () => {
      const result = await registry.getResource('oorep://help/search-syntax');

      expect(result.contents[0].text).toContain('Wildcard');
    });

    it('getResource when search syntax help then includes exclusion section', async () => {
      const result = await registry.getResource('oorep://help/search-syntax');

      expect(result.contents[0].text).toContain('Exclusion');
    });

    it('getResource when search syntax help then includes exact phrase section', async () => {
      const result = await registry.getResource('oorep://help/search-syntax');

      expect(result.contents[0].text).toContain('Exact');
    });

    it('getResource when search syntax help then includes examples', async () => {
      const result = await registry.getResource('oorep://help/search-syntax');

      expect(result.contents[0].text).toContain('Example');
    });
  });

  describe('getResource - error handling', () => {
    it('getResource when unknown URI then throws error', async () => {
      await expect(registry.getResource('oorep://unknown/resource')).rejects.toThrow();
    });

    it('getResource when API error then sanitizes error', async () => {
      mockGetAvailableRemedies.mockRejectedValue(new Error('API Error'));

      await expect(registry.getResource('oorep://remedies/list')).rejects.toThrow();
    });
  });

  describe('JSON formatting', () => {
    it('getResource when JSON resource then formats with indentation', async () => {
      const mockRemedies = [{ id: 1, nameAbbrev: 'Test', nameLong: 'Test', namealt: [] }];
      mockGetAvailableRemedies.mockResolvedValue(mockRemedies);

      const result = await registry.getResource('oorep://remedies/list');
      const text = result.contents[0].text;

      expect(text).toContain('\n');
      expect(text).toContain('  ');
    });
  });
});

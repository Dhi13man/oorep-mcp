/**
 * Unit tests for resource registry
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { ResourceRegistry } from './index.js';
import type { OOREPConfig } from '../config.js';

// Use vi.hoisted to create mock functions that can be accessed inside vi.mock
const { mockListResources, mockGetResource, mockDestroy } = vi.hoisted(() => ({
  mockListResources: vi.fn(),
  mockGetResource: vi.fn(),
  mockDestroy: vi.fn(),
}));

// Mock the SDK client module using a class
vi.mock('../sdk/client.js', () => {
  return {
    OOREPSDKClient: class MockOOREPSDKClient {
      listResources = mockListResources;
      getResource = mockGetResource;
      destroy = mockDestroy;
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
    mockListResources.mockReturnValue([
      {
        uri: 'oorep://remedies/list',
        name: 'Available Remedies List',
        description: 'Complete list of all available homeopathic remedies',
        mimeType: 'application/json',
      },
      {
        uri: 'oorep://repertories/list',
        name: 'Available Repertories List',
        description: 'List of all accessible repertories',
        mimeType: 'application/json',
      },
      {
        uri: 'oorep://materia-medicas/list',
        name: 'Available Materia Medicas List',
        description: 'List of all accessible materia medicas',
        mimeType: 'application/json',
      },
      {
        uri: 'oorep://help/search-syntax',
        name: 'OOREP Search Syntax Help',
        description: 'Guide to OOREP search syntax',
        mimeType: 'text/markdown',
      },
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
      mockGetResource.mockResolvedValue({
        uri: 'oorep://remedies/list',
        mimeType: 'application/json',
        text: JSON.stringify(mockRemedies, null, 2),
      });

      const result = await registry.getResource('oorep://remedies/list');

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('oorep://remedies/list');
      expect(result.contents[0].mimeType).toBe('application/json');
      expect(JSON.parse(result.contents[0].text)).toEqual(mockRemedies);
    });

    it('getResource when remedies cached then SDK handles caching', async () => {
      const mockRemedies = [{ id: 1, nameAbbrev: 'Test', nameLong: 'Test', namealt: [] }];
      mockGetResource.mockResolvedValue({
        uri: 'oorep://remedies/list',
        mimeType: 'application/json',
        text: JSON.stringify(mockRemedies, null, 2),
      });

      await registry.getResource('oorep://remedies/list');
      await registry.getResource('oorep://remedies/list');

      // SDK handles caching - registry always delegates
      expect(mockGetResource).toHaveBeenCalledTimes(2);
    });
  });

  describe('getResource - repertories list', () => {
    it('getResource when oorep://repertories/list then returns repertories', async () => {
      const mockRepertories = [{ abbreviation: 'kent', title: 'Kent Repertory' }];
      mockGetResource.mockResolvedValue({
        uri: 'oorep://repertories/list',
        mimeType: 'application/json',
        text: JSON.stringify(mockRepertories, null, 2),
      });

      const result = await registry.getResource('oorep://repertories/list');

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('oorep://repertories/list');
      expect(result.contents[0].mimeType).toBe('application/json');
      expect(JSON.parse(result.contents[0].text)).toEqual(mockRepertories);
    });

    it('getResource when repertories cached then SDK handles caching', async () => {
      const mockRepertories = [{ abbreviation: 'test', title: 'Test' }];
      mockGetResource.mockResolvedValue({
        uri: 'oorep://repertories/list',
        mimeType: 'application/json',
        text: JSON.stringify(mockRepertories, null, 2),
      });

      await registry.getResource('oorep://repertories/list');
      await registry.getResource('oorep://repertories/list');

      // SDK handles caching - registry always delegates
      expect(mockGetResource).toHaveBeenCalledTimes(2);
    });
  });

  describe('getResource - materia medicas list', () => {
    it('getResource when oorep://materia-medicas/list then returns materia medicas', async () => {
      const mockMMs = [{ abbreviation: 'boericke', title: 'Boericke MM' }];
      mockGetResource.mockResolvedValue({
        uri: 'oorep://materia-medicas/list',
        mimeType: 'application/json',
        text: JSON.stringify(mockMMs, null, 2),
      });

      const result = await registry.getResource('oorep://materia-medicas/list');

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('oorep://materia-medicas/list');
      expect(result.contents[0].mimeType).toBe('application/json');
      expect(JSON.parse(result.contents[0].text)).toEqual(mockMMs);
    });

    it('getResource when materia medicas cached then SDK handles caching', async () => {
      const mockMMs = [{ abbreviation: 'test', title: 'Test' }];
      mockGetResource.mockResolvedValue({
        uri: 'oorep://materia-medicas/list',
        mimeType: 'application/json',
        text: JSON.stringify(mockMMs, null, 2),
      });

      await registry.getResource('oorep://materia-medicas/list');
      await registry.getResource('oorep://materia-medicas/list');

      // SDK handles caching - registry always delegates
      expect(mockGetResource).toHaveBeenCalledTimes(2);
    });
  });

  describe('getResource - search syntax help', () => {
    const helpText = `# OOREP Search Syntax Guide

## Basic Search

Simple text searches match symptoms and rubrics.

## Wildcards

Use asterisk (*) to match any characters.

## Exclusions

Use minus sign (-) to exclude terms.

## Exact Phrases

Use quotation marks for exact phrase matching.

## Examples

Some examples here.
`;

    it('getResource when oorep://help/search-syntax then returns help text', async () => {
      mockGetResource.mockResolvedValue({
        uri: 'oorep://help/search-syntax',
        mimeType: 'text/markdown',
        text: helpText,
      });

      const result = await registry.getResource('oorep://help/search-syntax');

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('oorep://help/search-syntax');
      expect(result.contents[0].mimeType).toBe('text/markdown');
      expect(result.contents[0].text).toContain('# OOREP Search Syntax Guide');
    });

    it('getResource when search syntax help then includes wildcard section', async () => {
      mockGetResource.mockResolvedValue({
        uri: 'oorep://help/search-syntax',
        mimeType: 'text/markdown',
        text: helpText,
      });

      const result = await registry.getResource('oorep://help/search-syntax');

      expect(result.contents[0].text).toContain('## Wildcards');
      expect(result.contents[0].text).toContain('asterisk');
    });

    it('getResource when search syntax help then includes exclusion section', async () => {
      mockGetResource.mockResolvedValue({
        uri: 'oorep://help/search-syntax',
        mimeType: 'text/markdown',
        text: helpText,
      });

      const result = await registry.getResource('oorep://help/search-syntax');

      expect(result.contents[0].text).toContain('## Exclusions');
      expect(result.contents[0].text).toContain('minus sign');
    });

    it('getResource when search syntax help then includes exact phrase section', async () => {
      mockGetResource.mockResolvedValue({
        uri: 'oorep://help/search-syntax',
        mimeType: 'text/markdown',
        text: helpText,
      });

      const result = await registry.getResource('oorep://help/search-syntax');

      expect(result.contents[0].text).toContain('## Exact Phrases');
      expect(result.contents[0].text).toContain('quotation marks');
    });

    it('getResource when search syntax help then includes examples', async () => {
      mockGetResource.mockResolvedValue({
        uri: 'oorep://help/search-syntax',
        mimeType: 'text/markdown',
        text: helpText,
      });

      const result = await registry.getResource('oorep://help/search-syntax');

      expect(result.contents[0].text).toContain('## Examples');
    });
  });

  describe('getResource - error handling', () => {
    it('getResource when unknown URI then throws error', async () => {
      // SDK throws for unknown URIs via exhaustive switch
      mockGetResource.mockRejectedValue(
        new Error('Unknown resource URI: oorep://unknown/resource')
      );

      await expect(registry.getResource('oorep://unknown/resource')).rejects.toThrow();
    });

    it('getResource when unknown URI then propagates SDK error', async () => {
      mockGetResource.mockRejectedValue(
        new Error('Unknown resource URI: oorep://unknown/resource')
      );

      await expect(registry.getResource('oorep://unknown/resource')).rejects.toThrow();
    });

    it('getResource when API error then sanitizes error', async () => {
      mockGetResource.mockRejectedValue(new Error('API Error'));

      await expect(registry.getResource('oorep://remedies/list')).rejects.toThrow();
    });
  });

  describe('JSON formatting', () => {
    it('getResource when JSON resource then formats with indentation', async () => {
      const mockRemedies = [{ id: 1, nameAbbrev: 'Test', nameLong: 'Test', namealt: [] }];
      mockGetResource.mockResolvedValue({
        uri: 'oorep://remedies/list',
        mimeType: 'application/json',
        text: JSON.stringify(mockRemedies, null, 2),
      });

      const result = await registry.getResource('oorep://remedies/list');
      const text = result.contents[0].text;

      expect(text).toContain('\n');
      expect(text).toContain('  ');
    });
  });
});

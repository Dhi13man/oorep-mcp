/**
 * Unit tests for OOREP SDK Client
 *
 * These tests mock internal dependencies (OOREPClient, Cache, RequestDeduplicator)
 * for isolation testing of the SDK client's business logic.
 *
 * Complements the integration tests in client.test.ts which use real implementations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OOREPSDKClient, createOOREPClient } from './client.js';

// Mock the dependencies with proper class constructors
const mockOOREPClientInstance = {
  lookupRepertory: vi.fn(),
  lookupMateriaMedica: vi.fn(),
  getAvailableRemedies: vi.fn(),
  getAvailableRepertories: vi.fn(),
  getAvailableMateriaMedicas: vi.fn(),
};

const mockCacheInstance = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
  destroy: vi.fn().mockResolvedValue(undefined),
};

const mockDeduplicatorInstance = {
  deduplicate: vi.fn().mockImplementation((_key: string, fn: () => Promise<unknown>) => fn()),
};

vi.mock('../lib/oorep-client.js', () => ({
  OOREPClient: vi.fn().mockImplementation(function () {
    return mockOOREPClientInstance;
  }),
}));

vi.mock('../lib/cache.js', () => ({
  InMemoryCache: vi.fn().mockImplementation(function () {
    return mockCacheInstance;
  }),
  Cache: vi.fn().mockImplementation(function () {
    return mockCacheInstance;
  }),
}));

vi.mock('../lib/deduplicator.js', () => ({
  MapRequestDeduplicator: vi.fn().mockImplementation(function () {
    return mockDeduplicatorInstance;
  }),
}));

vi.mock('../utils/logger.js', () => ({
  ConsoleLogger: vi.fn().mockImplementation(function () {
    return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  }),
}));

import { OOREPClient } from '../lib/oorep-client.js';
import { InMemoryCache } from '../lib/cache.js';
import { MapRequestDeduplicator } from '../lib/deduplicator.js';

describe('OOREPSDKClient Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock return values
    mockCacheInstance.get.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('initializes OOREPClient with merged config', () => {
      const client = new OOREPSDKClient({ timeoutMs: 60000 });

      expect(OOREPClient).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: 'https://www.oorep.com',
          timeoutMs: 60000,
          cacheTtlMs: 300000,
        })
      );

      client.destroy();
    });

    it('initializes Cache with cacheTtlMs', () => {
      const client = new OOREPSDKClient({ cacheTtlMs: 600000 });

      expect(InMemoryCache).toHaveBeenCalledWith(600000, expect.any(Object));

      client.destroy();
    });

    it('initializes RequestDeduplicator', () => {
      const client = new OOREPSDKClient();

      expect(MapRequestDeduplicator).toHaveBeenCalledWith(expect.any(Object));

      client.destroy();
    });
  });

  describe('searchRepertory - unit logic', () => {
    it('generates correct cache key with all parameters', async () => {
      const client = new OOREPSDKClient();

      mockOOREPClientInstance.lookupRepertory.mockResolvedValue({
        totalNumberOfResults: 0,
        results: [],
      });

      await client.searchRepertory({
        symptom: 'headache',
        repertory: 'kent',
        minWeight: 2,
        maxResults: 50,
        includeRemedyStats: true,
      });

      // Verify cache key generation includes all params
      expect(mockCacheInstance.get).toHaveBeenCalledWith(expect.stringContaining('repertory:'));
      expect(mockCacheInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('symptom=headache')
      );
      expect(mockCacheInstance.get).toHaveBeenCalledWith(expect.stringContaining('repertory=kent'));

      client.destroy();
    });

    it('uses default repertory when not specified', async () => {
      const client = new OOREPSDKClient({ defaultRepertory: 'publicum' });

      mockOOREPClientInstance.lookupRepertory.mockResolvedValue({
        totalNumberOfResults: 0,
        results: [],
      });

      await client.searchRepertory({ symptom: 'headache' });

      expect(mockCacheInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('repertory=publicum')
      );

      client.destroy();
    });

    it('returns cached result without calling API', async () => {
      const client = new OOREPSDKClient();

      const cachedResult = { totalResults: 5, rubrics: [], remedyStats: [] };
      mockCacheInstance.get.mockResolvedValue(cachedResult);

      const result = await client.searchRepertory({ symptom: 'headache' });

      expect(result).toBe(cachedResult);
      expect(mockOOREPClientInstance.lookupRepertory).not.toHaveBeenCalled();

      client.destroy();
    });

    it('stores result in cache after API call', async () => {
      const client = new OOREPSDKClient();

      mockOOREPClientInstance.lookupRepertory.mockResolvedValue({
        totalNumberOfResults: 10,
        results: [],
      });

      await client.searchRepertory({ symptom: 'headache' });

      expect(mockCacheInstance.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ totalResults: 10 })
      );

      client.destroy();
    });

    it('uses deduplicator for concurrent requests', async () => {
      const client = new OOREPSDKClient();

      mockOOREPClientInstance.lookupRepertory.mockResolvedValue({
        totalNumberOfResults: 0,
        results: [],
      });

      await client.searchRepertory({ symptom: 'headache' });

      expect(mockDeduplicatorInstance.deduplicate).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function)
      );

      client.destroy();
    });
  });

  describe('searchMateriaMedica - unit logic', () => {
    it('uses default materia medica when not specified', async () => {
      const client = new OOREPSDKClient({ defaultMateriaMedica: 'boericke' });

      mockOOREPClientInstance.lookupMateriaMedica.mockResolvedValue({
        results: [],
        numberOfMatchingSectionsPerChapter: [],
      });

      await client.searchMateriaMedica({ symptom: 'anxiety' });

      expect(mockCacheInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('materiamedica=boericke')
      );

      client.destroy();
    });
  });

  describe('getRemedyInfo - unit logic', () => {
    it('performs case-insensitive matching', async () => {
      const client = new OOREPSDKClient();

      mockOOREPClientInstance.getAvailableRemedies.mockResolvedValue([
        { id: 1, nameAbbrev: 'Acon.', nameLong: 'Aconitum napellus', namealt: [] },
      ]);

      const result = await client.getRemedyInfo({ remedy: 'ACONITUM NAPELLUS' });

      expect(result).not.toBeNull();
      expect(result!.nameAbbrev).toBe('Acon.');

      client.destroy();
    });

    it('matches by abbreviation', async () => {
      const client = new OOREPSDKClient();

      mockOOREPClientInstance.getAvailableRemedies.mockResolvedValue([
        { id: 1, nameAbbrev: 'Acon.', nameLong: 'Aconitum napellus', namealt: [] },
      ]);

      const result = await client.getRemedyInfo({ remedy: 'acon.' });

      expect(result).not.toBeNull();
      expect(result!.nameLong).toBe('Aconitum napellus');

      client.destroy();
    });

    it('matches by alternative name', async () => {
      const client = new OOREPSDKClient();

      mockOOREPClientInstance.getAvailableRemedies.mockResolvedValue([
        { id: 1, nameAbbrev: 'Acon.', nameLong: 'Aconitum napellus', namealt: ['Aconite'] },
      ]);

      const result = await client.getRemedyInfo({ remedy: 'aconite' });

      expect(result).not.toBeNull();
      expect(result!.id).toBe(1);

      client.destroy();
    });

    it('performs partial matching for queries >= 3 chars', async () => {
      const client = new OOREPSDKClient();

      mockOOREPClientInstance.getAvailableRemedies.mockResolvedValue([
        { id: 1, nameAbbrev: 'Bell.', nameLong: 'Belladonna', namealt: [] },
      ]);

      const result = await client.getRemedyInfo({ remedy: 'bella' });

      expect(result).not.toBeNull();
      expect(result!.nameLong).toBe('Belladonna');

      client.destroy();
    });

    it('performs partial matching via alternative names', async () => {
      const client = new OOREPSDKClient();

      mockOOREPClientInstance.getAvailableRemedies.mockResolvedValue([
        {
          id: 1,
          nameAbbrev: 'Acon.',
          nameLong: 'Aconitum napellus',
          namealt: ['Monkshood', 'Wolfsbane'],
        },
      ]);

      // Partial match on alternative name 'Wolfsbane'
      const result = await client.getRemedyInfo({ remedy: 'wolfs' });

      expect(result).not.toBeNull();
      expect(result!.nameAbbrev).toBe('Acon.');

      client.destroy();
    });

    it('matches when query contains alternative name', async () => {
      const client = new OOREPSDKClient();

      mockOOREPClientInstance.getAvailableRemedies.mockResolvedValue([
        {
          id: 1,
          nameAbbrev: 'Acon.',
          nameLong: 'Aconitum napellus',
          namealt: ['Monk'],
        },
      ]);

      // Query 'monkfish' contains 'monk'
      const result = await client.getRemedyInfo({ remedy: 'monkfish' });

      expect(result).not.toBeNull();
      expect(result!.nameAbbrev).toBe('Acon.');

      client.destroy();
    });

    it('does not partial match for queries < 3 chars', async () => {
      const client = new OOREPSDKClient();

      mockOOREPClientInstance.getAvailableRemedies.mockResolvedValue([
        { id: 1, nameAbbrev: 'Bell.', nameLong: 'Belladonna', namealt: [] },
      ]);

      const result = await client.getRemedyInfo({ remedy: 'be' });

      expect(result).toBeNull();

      client.destroy();
    });

    it('returns null when remedy not found', async () => {
      const client = new OOREPSDKClient();

      mockOOREPClientInstance.getAvailableRemedies.mockResolvedValue([
        { id: 1, nameAbbrev: 'Acon.', nameLong: 'Aconitum napellus', namealt: [] },
      ]);

      const result = await client.getRemedyInfo({ remedy: 'nonexistent' });

      expect(result).toBeNull();

      client.destroy();
    });
  });

  describe('listRepertories - unit logic', () => {
    it('filters by language when specified', async () => {
      const client = new OOREPSDKClient();

      mockOOREPClientInstance.getAvailableRepertories.mockResolvedValue([
        { abbreviation: 'kent', title: 'Kent', language: 'en', author: 'Kent' },
        { abbreviation: 'synth', title: 'Synthesis', language: 'de', author: 'Schroyens' },
      ]);

      const result = await client.listRepertories({ language: 'en' });

      expect(result).toHaveLength(1);
      expect(result[0].abbreviation).toBe('kent');

      client.destroy();
    });

    it('returns all when no language filter', async () => {
      const client = new OOREPSDKClient();

      mockOOREPClientInstance.getAvailableRepertories.mockResolvedValue([
        { abbreviation: 'kent', title: 'Kent', language: 'en', author: 'Kent' },
        { abbreviation: 'synth', title: 'Synthesis', language: 'de', author: 'Schroyens' },
      ]);

      const result = await client.listRepertories();

      expect(result).toHaveLength(2);

      client.destroy();
    });
  });

  describe('listMateriaMedicas - unit logic', () => {
    it('filters by language when specified', async () => {
      const client = new OOREPSDKClient();

      mockOOREPClientInstance.getAvailableMateriaMedicas.mockResolvedValue([
        { abbreviation: 'boericke', title: 'Boericke', language: 'en', author: 'Boericke' },
        { abbreviation: 'hering', title: 'Hering', language: 'de', author: 'Hering' },
      ]);

      const result = await client.listMateriaMedicas({ language: 'de' });

      expect(result).toHaveLength(1);
      expect(result[0].abbreviation).toBe('hering');

      client.destroy();
    });

    it('returns cached result without calling API', async () => {
      const client = new OOREPSDKClient();

      const cachedResult = [
        { abbreviation: 'cached', title: 'Cached MM', language: 'en', author: 'Test' },
      ];
      mockCacheInstance.get.mockResolvedValue(cachedResult);

      const result = await client.listMateriaMedicas();

      expect(result).toBe(cachedResult);
      expect(mockOOREPClientInstance.getAvailableMateriaMedicas).not.toHaveBeenCalled();

      client.destroy();
    });

    it('returns all when no language filter', async () => {
      const client = new OOREPSDKClient();

      mockOOREPClientInstance.getAvailableMateriaMedicas.mockResolvedValue([
        { abbreviation: 'boericke', title: 'Boericke', language: 'en', author: 'Boericke' },
        { abbreviation: 'hering', title: 'Hering', language: 'de', author: 'Hering' },
      ]);

      const result = await client.listMateriaMedicas();

      expect(result).toHaveLength(2);

      client.destroy();
    });
  });

  describe('clearCache', () => {
    it('delegates to cache clear method', () => {
      const client = new OOREPSDKClient();

      client.clearCache();

      expect(mockCacheInstance.clear).toHaveBeenCalled();

      client.destroy();
    });
  });

  describe('destroy', () => {
    it('delegates to cache destroy method', () => {
      const client = new OOREPSDKClient();

      client.destroy();

      expect(mockCacheInstance.destroy).toHaveBeenCalled();
    });
  });

  describe('getConfig', () => {
    it('returns copy of config', () => {
      const client = new OOREPSDKClient({ timeoutMs: 45000 });

      const config1 = client.getConfig();
      const config2 = client.getConfig();

      expect(config1).not.toBe(config2);
      expect(config1.timeoutMs).toBe(45000);

      client.destroy();
    });
  });
});

describe('createOOREPClient factory - unit', () => {
  it('returns OOREPSDKClient instance', () => {
    const client = createOOREPClient();

    expect(client).toBeInstanceOf(OOREPSDKClient);

    client.destroy();
  });
});

describe('Resource Access Methods', () => {
  describe('getResource', () => {
    it('returns search syntax help resource', async () => {
      const client = new OOREPSDKClient();

      const result = await client.getResource('oorep://help/search-syntax');

      expect(result.uri).toBe('oorep://help/search-syntax');
      expect(result.mimeType).toBe('text/markdown');
      expect(result.text).toContain('# OOREP Search Syntax Guide');
      expect(result.text).toContain('## Wildcards');
      expect(result.text).toContain('## Exclusions');

      client.destroy();
    });

    it('returns remedies list resource', async () => {
      const client = new OOREPSDKClient();

      mockOOREPClientInstance.getAvailableRemedies.mockResolvedValue([
        { id: 1, nameAbbrev: 'Acon.', nameLong: 'Aconitum napellus', namealt: [] },
        { id: 2, nameAbbrev: 'Bell.', nameLong: 'Belladonna', namealt: [] },
      ]);

      const result = await client.getResource('oorep://remedies/list');

      expect(result.uri).toBe('oorep://remedies/list');
      expect(result.mimeType).toBe('application/json');
      expect(JSON.parse(result.text)).toHaveLength(2);

      client.destroy();
    });

    it('returns repertories list resource', async () => {
      const client = new OOREPSDKClient();

      mockOOREPClientInstance.getAvailableRepertories.mockResolvedValue([
        { abbreviation: 'kent', title: 'Kent', language: 'en', author: 'Kent' },
      ]);

      const result = await client.getResource('oorep://repertories/list');

      expect(result.uri).toBe('oorep://repertories/list');
      expect(result.mimeType).toBe('application/json');
      expect(JSON.parse(result.text)).toHaveLength(1);

      client.destroy();
    });

    it('returns materia medicas list resource', async () => {
      const client = new OOREPSDKClient();

      mockOOREPClientInstance.getAvailableMateriaMedicas.mockResolvedValue([
        { abbreviation: 'boericke', title: 'Boericke', language: 'en', author: 'Boericke' },
      ]);

      const result = await client.getResource('oorep://materia-medicas/list');

      expect(result.uri).toBe('oorep://materia-medicas/list');
      expect(result.mimeType).toBe('application/json');
      expect(JSON.parse(result.text)).toHaveLength(1);

      client.destroy();
    });

    it('returns cached resource on second call', async () => {
      const client = new OOREPSDKClient();

      const cachedResource = {
        uri: 'oorep://help/search-syntax' as const,
        mimeType: 'text/markdown',
        text: 'cached content',
      };
      mockCacheInstance.get.mockResolvedValue(cachedResource);

      const result = await client.getResource('oorep://help/search-syntax');

      expect(result).toBe(cachedResource);

      client.destroy();
    });
  });

  describe('getSearchSyntaxHelp', () => {
    it('returns markdown text directly', async () => {
      const client = new OOREPSDKClient();

      // Ensure cache returns null so we get fresh content
      mockCacheInstance.get.mockResolvedValue(null);

      const result = await client.getSearchSyntaxHelp();

      expect(typeof result).toBe('string');
      expect(result).toContain('# OOREP Search Syntax Guide');

      client.destroy();
    });
  });

  describe('listResources', () => {
    it('returns all available resource definitions', () => {
      const client = new OOREPSDKClient();

      const resources = client.listResources();

      expect(resources).toHaveLength(4);
      expect(resources.map((r) => r.uri)).toContain('oorep://remedies/list');
      expect(resources.map((r) => r.uri)).toContain('oorep://repertories/list');
      expect(resources.map((r) => r.uri)).toContain('oorep://materia-medicas/list');
      expect(resources.map((r) => r.uri)).toContain('oorep://help/search-syntax');

      client.destroy();
    });

    it('includes metadata for each resource', () => {
      const client = new OOREPSDKClient();

      const resources = client.listResources();
      const searchSyntax = resources.find((r) => r.uri === 'oorep://help/search-syntax');

      expect(searchSyntax).toBeDefined();
      expect(searchSyntax!.name).toBe('OOREP Search Syntax Help');
      expect(searchSyntax!.mimeType).toBe('text/markdown');
      expect(searchSyntax!.description).toContain('search syntax');

      client.destroy();
    });
  });
});

describe('Prompt Access Methods', () => {
  describe('getPrompt', () => {
    it('returns analyze-symptoms prompt without args', async () => {
      const client = new OOREPSDKClient();

      const result = await client.getPrompt('analyze-symptoms');

      expect(result.name).toBe('analyze-symptoms');
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].role).toBe('user');
      expect(result.messages[0].content.text).toContain('Gather Chief Complaint');
      expect(result.messages[0].content.text).toContain('Search Repertory');

      client.destroy();
    });

    it('returns analyze-symptoms prompt with initial symptom', async () => {
      const client = new OOREPSDKClient();

      const result = await client.getPrompt('analyze-symptoms', {
        symptom_description: 'throbbing headache',
      });

      expect(result.messages[0].content.text).toContain('throbbing headache');
      expect(result.messages[0].content.text).toContain('Initial symptom:');

      client.destroy();
    });

    it('returns remedy-comparison prompt with remedies', async () => {
      const client = new OOREPSDKClient();

      const result = await client.getPrompt('remedy-comparison', {
        remedies: 'Aconite,Belladonna,Gelsemium',
      });

      expect(result.name).toBe('remedy-comparison');
      expect(result.messages[0].content.text).toContain('Aconite, Belladonna, Gelsemium');
      expect(result.messages[0].content.text).toContain('Comparison Table');

      client.destroy();
    });

    it('throws error for remedy-comparison without remedies', async () => {
      const client = new OOREPSDKClient();

      await expect(client.getPrompt('remedy-comparison', {} as any)).rejects.toThrow(
        'remedies argument is required'
      );

      client.destroy();
    });

    it('throws error for remedy-comparison with only one remedy', async () => {
      const client = new OOREPSDKClient();

      await expect(client.getPrompt('remedy-comparison', { remedies: 'Aconite' })).rejects.toThrow(
        'At least 2 remedies are required'
      );

      client.destroy();
    });

    it('returns repertorization-workflow prompt', async () => {
      const client = new OOREPSDKClient();

      const result = await client.getPrompt('repertorization-workflow');

      expect(result.name).toBe('repertorization-workflow');
      expect(result.messages[0].content.text).toContain('STEP 1: Chief Complaint');
      expect(result.messages[0].content.text).toContain('STEP 7: Recommendations');
      expect(result.messages[0].content.text).toContain('Detailed Symptom Gathering');

      client.destroy();
    });
  });

  describe('listPrompts', () => {
    it('returns all available prompt definitions', () => {
      const client = new OOREPSDKClient();

      const prompts = client.listPrompts();

      expect(prompts).toHaveLength(3);
      expect(prompts.map((p) => p.name)).toContain('analyze-symptoms');
      expect(prompts.map((p) => p.name)).toContain('remedy-comparison');
      expect(prompts.map((p) => p.name)).toContain('repertorization-workflow');

      client.destroy();
    });

    it('includes arguments metadata for each prompt', () => {
      const client = new OOREPSDKClient();

      const prompts = client.listPrompts();
      const comparison = prompts.find((p) => p.name === 'remedy-comparison');

      expect(comparison).toBeDefined();
      expect(comparison!.arguments).toHaveLength(1);
      expect(comparison!.arguments![0].name).toBe('remedies');
      expect(comparison!.arguments![0].required).toBe(true);

      client.destroy();
    });

    it('marks repertorization-workflow as having no arguments', () => {
      const client = new OOREPSDKClient();

      const prompts = client.listPrompts();
      const workflow = prompts.find((p) => p.name === 'repertorization-workflow');

      expect(workflow).toBeDefined();
      expect(workflow!.arguments).toHaveLength(0);

      client.destroy();
    });
  });
});

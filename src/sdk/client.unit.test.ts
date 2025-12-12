/**
 * Unit tests for OOREP SDK Client
 *
 * These tests mock internal dependencies (OOREPClient, Cache, RequestDeduplicator)
 * for isolation testing of the SDK client's business logic.
 *
 * Complements the integration tests in client.test.ts which use real implementations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OOREPClient, createOOREPClient } from './client.js';

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
  OOREPHttpClient: vi.fn().mockImplementation(function () {
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

import { OOREPHttpClient } from '../lib/oorep-client.js';
import { InMemoryCache } from '../lib/cache.js';
import { MapRequestDeduplicator } from '../lib/deduplicator.js';

describe('OOREPClient Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock return values
    mockCacheInstance.get.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('initializes OOREPHttpClient with merged config', () => {
      const client = new OOREPClient({ timeoutMs: 60000 });

      expect(OOREPHttpClient).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: 'https://www.oorep.com',
          timeoutMs: 60000,
          defaultRepertory: 'publicum',
          defaultMateriaMedica: 'boericke',
        }),
        expect.any(Object)
      );

      client.destroy();
    });

    it('initializes OOREPHttpClient with remoteUser when provided', () => {
      const client = new OOREPClient({ remoteUser: '123' });

      expect(OOREPHttpClient).toHaveBeenCalledWith(
        expect.objectContaining({ remoteUser: '123' }),
        expect.any(Object)
      );

      client.destroy();
    });

    it('initializes Cache with cacheTtlMs', () => {
      const client = new OOREPClient({ cacheTtlMs: 600000 });

      expect(InMemoryCache).toHaveBeenCalledWith(600000, expect.any(Object));

      client.destroy();
    });

    it('initializes RequestDeduplicator', () => {
      const client = new OOREPClient();

      expect(MapRequestDeduplicator).toHaveBeenCalledWith(expect.any(Object));

      client.destroy();
    });
  });

  describe('searchRepertory - unit logic', () => {
    it('generates correct cache key with all parameters', async () => {
      const client = new OOREPClient();

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
      const client = new OOREPClient({ defaultRepertory: 'publicum' });

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
      const client = new OOREPClient();

      const cachedResult = { totalResults: 5, rubrics: [], remedyStats: [] };
      mockCacheInstance.get.mockResolvedValue(cachedResult);

      const result = await client.searchRepertory({ symptom: 'headache' });

      expect(result).toBe(cachedResult);
      expect(mockOOREPClientInstance.lookupRepertory).not.toHaveBeenCalled();

      client.destroy();
    });

    it('stores result in cache after API call', async () => {
      const client = new OOREPClient();

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
      const client = new OOREPClient();

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
      const client = new OOREPClient({ defaultMateriaMedica: 'boericke' });

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
      const client = new OOREPClient();

      mockOOREPClientInstance.getAvailableRemedies.mockResolvedValue([
        { id: 1, nameAbbrev: 'Acon.', nameLong: 'Aconitum napellus', namealt: [] },
      ]);

      const result = await client.getRemedyInfo({ remedy: 'ACONITUM NAPELLUS' });

      expect(result).not.toBeNull();
      expect(result!.nameAbbrev).toBe('Acon.');

      client.destroy();
    });

    it('matches by abbreviation', async () => {
      const client = new OOREPClient();

      mockOOREPClientInstance.getAvailableRemedies.mockResolvedValue([
        { id: 1, nameAbbrev: 'Acon.', nameLong: 'Aconitum napellus', namealt: [] },
      ]);

      const result = await client.getRemedyInfo({ remedy: 'acon.' });

      expect(result).not.toBeNull();
      expect(result!.nameLong).toBe('Aconitum napellus');

      client.destroy();
    });

    it('matches by alternative name', async () => {
      const client = new OOREPClient();

      mockOOREPClientInstance.getAvailableRemedies.mockResolvedValue([
        { id: 1, nameAbbrev: 'Acon.', nameLong: 'Aconitum napellus', namealt: ['Aconite'] },
      ]);

      const result = await client.getRemedyInfo({ remedy: 'aconite' });

      expect(result).not.toBeNull();
      expect(result!.id).toBe(1);

      client.destroy();
    });

    it('performs partial matching for queries >= 3 chars', async () => {
      const client = new OOREPClient();

      mockOOREPClientInstance.getAvailableRemedies.mockResolvedValue([
        { id: 1, nameAbbrev: 'Bell.', nameLong: 'Belladonna', namealt: [] },
      ]);

      const result = await client.getRemedyInfo({ remedy: 'bella' });

      expect(result).not.toBeNull();
      expect(result!.nameLong).toBe('Belladonna');

      client.destroy();
    });

    it('performs partial matching via alternative names', async () => {
      const client = new OOREPClient();

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
      const client = new OOREPClient();

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
      const client = new OOREPClient();

      mockOOREPClientInstance.getAvailableRemedies.mockResolvedValue([
        { id: 1, nameAbbrev: 'Bell.', nameLong: 'Belladonna', namealt: [] },
      ]);

      const result = await client.getRemedyInfo({ remedy: 'be' });

      expect(result).toBeNull();

      client.destroy();
    });

    it('returns null when remedy not found', async () => {
      const client = new OOREPClient();

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
      const client = new OOREPClient();

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
      const client = new OOREPClient();

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
      const client = new OOREPClient();

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
      const client = new OOREPClient();

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
      const client = new OOREPClient();

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
      const client = new OOREPClient();

      client.clearCache();

      expect(mockCacheInstance.clear).toHaveBeenCalled();

      client.destroy();
    });
  });

  describe('destroy', () => {
    it('delegates to cache destroy method', () => {
      const client = new OOREPClient();

      client.destroy();

      expect(mockCacheInstance.destroy).toHaveBeenCalled();
    });
  });

  describe('getConfig', () => {
    it('returns copy of config', () => {
      const client = new OOREPClient({ timeoutMs: 45000 });

      const config1 = client.getConfig();
      const config2 = client.getConfig();

      expect(config1).not.toBe(config2);
      expect(config1.timeoutMs).toBe(45000);

      client.destroy();
    });
  });
});

describe('createOOREPClient factory - unit', () => {
  it('returns OOREPClient instance', () => {
    const client = createOOREPClient();

    expect(client).toBeInstanceOf(OOREPClient);

    client.destroy();
  });
});

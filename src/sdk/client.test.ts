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
  get: vi.fn().mockReturnValue(null),
  set: vi.fn(),
  clear: vi.fn(),
  destroy: vi.fn(),
};

const mockDeduplicatorInstance = {
  deduplicate: vi.fn().mockImplementation((_key: string, fn: () => Promise<unknown>) => fn()),
};

vi.mock('../lib/oorep-client.js', () => ({
  OOREPClient: vi.fn().mockImplementation(function() {
    return mockOOREPClientInstance;
  }),
}));

vi.mock('../lib/cache.js', () => ({
  Cache: vi.fn().mockImplementation(function() {
    return mockCacheInstance;
  }),
  RequestDeduplicator: vi.fn().mockImplementation(function() {
    return mockDeduplicatorInstance;
  }),
}));

import { OOREPClient } from '../lib/oorep-client.js';
import { Cache, RequestDeduplicator } from '../lib/cache.js';

describe('OOREPSDKClient Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock return values
    mockCacheInstance.get.mockReturnValue(null);
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

      expect(Cache).toHaveBeenCalledWith(600000);

      client.destroy();
    });

    it('initializes RequestDeduplicator', () => {
      const client = new OOREPSDKClient();

      expect(RequestDeduplicator).toHaveBeenCalled();

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
      expect(mockCacheInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('repertory:')
      );
      expect(mockCacheInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('symptom=headache')
      );
      expect(mockCacheInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('repertory=kent')
      );

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
      mockCacheInstance.get.mockReturnValue(cachedResult);

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

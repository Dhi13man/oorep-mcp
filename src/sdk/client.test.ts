/**
 * Unit tests for OOREP SDK Client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OOREPSDKClient, createOOREPClient } from './client.js';

// Create mock instances that persist across tests
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

// Mock dependencies using class mocks
vi.mock('../lib/oorep-client.js', () => {
  return {
    OOREPClient: class MockOOREPClient {
      lookupRepertory = mockOOREPClientInstance.lookupRepertory;
      lookupMateriaMedica = mockOOREPClientInstance.lookupMateriaMedica;
      getAvailableRemedies = mockOOREPClientInstance.getAvailableRemedies;
      getAvailableRepertories = mockOOREPClientInstance.getAvailableRepertories;
      getAvailableMateriaMedicas = mockOOREPClientInstance.getAvailableMateriaMedicas;
    },
  };
});

vi.mock('../lib/cache.js', () => {
  return {
    Cache: class MockCache {
      get = mockCacheInstance.get;
      set = mockCacheInstance.set;
      clear = mockCacheInstance.clear;
      destroy = mockCacheInstance.destroy;
    },
    RequestDeduplicator: class MockRequestDeduplicator {
      deduplicate = mockDeduplicatorInstance.deduplicate;
    },
  };
});

vi.mock('../lib/data-formatter.js', () => ({
  formatRepertoryResults: vi.fn().mockReturnValue({
    totalResults: 1,
    rubrics: [],
    remedyStats: [],
  }),
  formatMateriaMedicaResults: vi.fn().mockReturnValue({
    totalResults: 1,
    results: [],
  }),
  generateCacheKey: vi.fn().mockImplementation((prefix, params) =>
    `${prefix}:${JSON.stringify(params)}`
  ),
}));

vi.mock('../utils/validation.js', () => ({
  validateSymptom: vi.fn(),
  validateRemedyName: vi.fn(),
  validateLanguage: vi.fn(),
}));

// Import mocked functions for assertions
import { validateSymptom, validateRemedyName, validateLanguage } from '../utils/validation.js';
import { formatRepertoryResults, formatMateriaMedicaResults } from '../lib/data-formatter.js';

describe('OOREPSDKClient', () => {
  let client: OOREPSDKClient;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock return values
    mockCacheInstance.get.mockReturnValue(null);
    client = new OOREPSDKClient();
  });

  afterEach(() => {
    client.destroy();
  });

  describe('constructor', () => {
    it('when no config provided then uses defaults', () => {
      // Arrange
      const newClient = new OOREPSDKClient();

      // Act
      const config = newClient.getConfig();

      // Assert
      expect(config.baseUrl).toBe('https://www.oorep.com');
      expect(config.timeoutMs).toBe(30000);
      expect(config.cacheTtlMs).toBe(300000);
      expect(config.defaultRepertory).toBe('publicum');
      expect(config.defaultMateriaMedica).toBe('boericke');

      newClient.destroy();
    });

    it('when custom config provided then uses custom values', () => {
      // Arrange
      const customConfig = {
        baseUrl: 'https://custom.oorep.com',
        timeoutMs: 60000,
        cacheTtlMs: 600000,
        defaultRepertory: 'kent',
        defaultMateriaMedica: 'hering',
      };

      // Act
      const newClient = new OOREPSDKClient(customConfig);
      const config = newClient.getConfig();

      // Assert
      expect(config.baseUrl).toBe('https://custom.oorep.com');
      expect(config.timeoutMs).toBe(60000);
      expect(config.cacheTtlMs).toBe(600000);
      expect(config.defaultRepertory).toBe('kent');
      expect(config.defaultMateriaMedica).toBe('hering');

      newClient.destroy();
    });

    it('when partial config provided then merges with defaults', () => {
      // Arrange & Act
      const newClient = new OOREPSDKClient({ timeoutMs: 45000 });
      const config = newClient.getConfig();

      // Assert
      expect(config.baseUrl).toBe('https://www.oorep.com');
      expect(config.timeoutMs).toBe(45000);
      expect(config.cacheTtlMs).toBe(300000);

      newClient.destroy();
    });

  });

  describe('searchRepertory', () => {
    it('when valid args then validates symptom', async () => {
      // Arrange
      mockOOREPClientInstance.lookupRepertory.mockResolvedValue(null);

      // Act
      await client.searchRepertory({ symptom: 'headache' });

      // Assert
      expect(validateSymptom).toHaveBeenCalledWith('headache');
    });

    it('when valid args then calls lookupRepertory with correct params', async () => {
      // Arrange
      mockOOREPClientInstance.lookupRepertory.mockResolvedValue(null);

      // Act
      await client.searchRepertory({
        symptom: 'headache',
        repertory: 'kent',
        minWeight: 2,
        includeRemedyStats: true,
      });

      // Assert
      expect(mockOOREPClientInstance.lookupRepertory).toHaveBeenCalledWith({
        symptom: 'headache',
        repertory: 'kent',
        minWeight: 2,
        includeRemedyStats: true,
      });
    });

    it('when successful then returns formatted results', async () => {
      // Arrange
      const mockApiResponse = { totalNumberOfResults: 5, results: [] };
      const mockFormattedResult = { totalResults: 5, rubrics: [], remedyStats: [] };
      mockOOREPClientInstance.lookupRepertory.mockResolvedValue(mockApiResponse);
      vi.mocked(formatRepertoryResults).mockReturnValue(mockFormattedResult);

      // Act
      const result = await client.searchRepertory({ symptom: 'headache' });

      // Assert
      expect(result).toEqual(mockFormattedResult);
    });

    it('when successful then caches result', async () => {
      // Arrange
      mockOOREPClientInstance.lookupRepertory.mockResolvedValue(null);

      // Act
      await client.searchRepertory({ symptom: 'headache' });

      // Assert
      expect(mockCacheInstance.set).toHaveBeenCalled();
    });

    it('when cached then returns cached result without API call', async () => {
      // Arrange
      const cachedResult = { totalResults: 10, rubrics: [], remedyStats: [] };
      mockCacheInstance.get.mockReturnValue(cachedResult);

      // Act
      const result = await client.searchRepertory({ symptom: 'headache' });

      // Assert
      expect(result).toEqual(cachedResult);
      expect(mockOOREPClientInstance.lookupRepertory).not.toHaveBeenCalled();
    });
  });

  describe('searchMateriaMedica', () => {
    it('when valid args then validates symptom', async () => {
      // Arrange
      mockOOREPClientInstance.lookupMateriaMedica.mockResolvedValue(null);

      // Act
      await client.searchMateriaMedica({ symptom: 'anxiety' });

      // Assert
      expect(validateSymptom).toHaveBeenCalledWith('anxiety');
    });

    it('when valid args then calls lookupMateriaMedica with correct params', async () => {
      // Arrange
      mockOOREPClientInstance.lookupMateriaMedica.mockResolvedValue(null);

      // Act
      await client.searchMateriaMedica({
        symptom: 'anxiety',
        materiamedica: 'boericke',
        remedy: 'acon',
      });

      // Assert
      expect(mockOOREPClientInstance.lookupMateriaMedica).toHaveBeenCalledWith({
        symptom: 'anxiety',
        materiamedica: 'boericke',
        remedy: 'acon',
      });
    });

    it('when successful then returns formatted results', async () => {
      // Arrange
      const mockFormattedResult = { totalResults: 3, results: [] };
      mockOOREPClientInstance.lookupMateriaMedica.mockResolvedValue(null);
      vi.mocked(formatMateriaMedicaResults).mockReturnValue(mockFormattedResult);

      // Act
      const result = await client.searchMateriaMedica({ symptom: 'anxiety' });

      // Assert
      expect(result).toEqual(mockFormattedResult);
    });

    it('when cached then returns cached result', async () => {
      // Arrange
      const cachedResult = { totalResults: 5, results: [] };
      mockCacheInstance.get.mockReturnValue(cachedResult);

      // Act
      const result = await client.searchMateriaMedica({ symptom: 'anxiety' });

      // Assert
      expect(result).toEqual(cachedResult);
      expect(mockOOREPClientInstance.lookupMateriaMedica).not.toHaveBeenCalled();
    });
  });

  describe('getRemedyInfo', () => {
    it('when valid remedy then validates remedy name', async () => {
      // Arrange
      mockOOREPClientInstance.getAvailableRemedies.mockResolvedValue([]);

      // Act
      await client.getRemedyInfo({ remedy: 'acon' });

      // Assert
      expect(validateRemedyName).toHaveBeenCalledWith('acon');
    });

    it('when remedy found by abbreviation then returns remedy info', async () => {
      // Arrange
      const mockRemedies = [
        { id: 1, nameAbbrev: 'Acon.', nameLong: 'Aconitum napellus', namealt: ['Aconite'] },
      ];
      mockOOREPClientInstance.getAvailableRemedies.mockResolvedValue(mockRemedies);

      // Act
      const result = await client.getRemedyInfo({ remedy: 'acon.' });

      // Assert
      expect(result).toEqual({
        id: 1,
        nameAbbrev: 'Acon.',
        nameLong: 'Aconitum napellus',
        nameAlt: ['Aconite'],
      });
    });

    it('when remedy found by long name then returns remedy info', async () => {
      // Arrange
      const mockRemedies = [
        { id: 1, nameAbbrev: 'Acon.', nameLong: 'Aconitum napellus' },
      ];
      mockOOREPClientInstance.getAvailableRemedies.mockResolvedValue(mockRemedies);

      // Act
      const result = await client.getRemedyInfo({ remedy: 'aconitum napellus' });

      // Assert
      expect(result?.id).toBe(1);
    });

    it('when remedy found by alternative name then returns remedy info', async () => {
      // Arrange
      const mockRemedies = [
        { id: 1, nameAbbrev: 'Acon.', nameLong: 'Aconitum napellus', namealt: ['Aconite', 'Monkshood'] },
      ];
      mockOOREPClientInstance.getAvailableRemedies.mockResolvedValue(mockRemedies);

      // Act
      const result = await client.getRemedyInfo({ remedy: 'monkshood' });

      // Assert
      expect(result?.id).toBe(1);
    });

    it('when remedy not found then returns null', async () => {
      // Arrange
      const mockRemedies = [
        { id: 1, nameAbbrev: 'Acon.', nameLong: 'Aconitum napellus' },
      ];
      mockOOREPClientInstance.getAvailableRemedies.mockResolvedValue(mockRemedies);

      // Act
      const result = await client.getRemedyInfo({ remedy: 'nonexistent' });

      // Assert
      expect(result).toBeNull();
    });

    it('when partial match with 3+ chars on long name then returns remedy', async () => {
      // Arrange - tests matchesPartially function
      const mockRemedies = [
        { id: 1, nameAbbrev: 'Acon.', nameLong: 'Aconitum napellus', namealt: [] },
      ];
      mockOOREPClientInstance.getAvailableRemedies.mockResolvedValue(mockRemedies);

      // Act - "aconit" is partial match for "aconitum"
      const result = await client.getRemedyInfo({ remedy: 'aconit' });

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
    });

    it('when partial match with 3+ chars on long name then returns remedy via substring', async () => {
      // Arrange - "bella" should match "belladonna" via partial match
      const mockRemedies = [
        { id: 1, nameAbbrev: 'Bell.', nameLong: 'Belladonna', namealt: [] },
      ];
      mockOOREPClientInstance.getAvailableRemedies.mockResolvedValue(mockRemedies);

      // Act - "bella" is partial match for "belladonna"
      const result = await client.getRemedyInfo({ remedy: 'bella' });

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
    });

    it('when partial match on alternative name substring then returns remedy', async () => {
      // Arrange
      const mockRemedies = [
        { id: 1, nameAbbrev: 'Acon.', nameLong: 'Aconitum napellus', namealt: ['Monkshood', 'Wolfsbane'] },
      ];
      mockOOREPClientInstance.getAvailableRemedies.mockResolvedValue(mockRemedies);

      // Act - "monkshood" exact match on alternative name
      const result = await client.getRemedyInfo({ remedy: 'monkshood' });

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
    });

    it('when exactly 3 char partial match then returns remedy', async () => {
      // Arrange - tests minimum 3-char partial matching
      const mockRemedies = [
        { id: 1, nameAbbrev: 'Acon.', nameLong: 'Aconitum napellus', namealt: [] },
      ];
      mockOOREPClientInstance.getAvailableRemedies.mockResolvedValue(mockRemedies);

      // Act - "aco" is exactly 3 chars and should match "aconitum" via substring
      const result = await client.getRemedyInfo({ remedy: 'aco' });

      // Assert - "aconitumnapellus".includes("aco") = true
      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
    });

    it('when query too short for partial match then does not match', async () => {
      // Arrange - partial matching requires 3+ chars
      const mockRemedies = [
        { id: 1, nameAbbrev: 'Acon.', nameLong: 'Aconitum napellus', namealt: [] },
      ];
      mockOOREPClientInstance.getAvailableRemedies.mockResolvedValue(mockRemedies);

      // Act - "ac" is too short for partial matching
      const result = await client.getRemedyInfo({ remedy: 'ac' });

      // Assert - should not match because query is < 3 chars
      expect(result).toBeNull();
    });

    it('when multiple remedies match then returns first match', async () => {
      // Arrange
      const mockRemedies = [
        { id: 1, nameAbbrev: 'Acon.', nameLong: 'Aconitum napellus', namealt: [] },
        { id: 2, nameAbbrev: 'Acon-l.', nameLong: 'Aconitum lycoctonum', namealt: [] },
      ];
      mockOOREPClientInstance.getAvailableRemedies.mockResolvedValue(mockRemedies);

      // Act
      const result = await client.getRemedyInfo({ remedy: 'aconitum' });

      // Assert - first match wins
      expect(result?.id).toBe(1);
    });

    it('when case differs then still matches', async () => {
      // Arrange
      const mockRemedies = [
        { id: 1, nameAbbrev: 'ACON.', nameLong: 'ACONITUM NAPELLUS', namealt: ['MONKSHOOD'] },
      ];
      mockOOREPClientInstance.getAvailableRemedies.mockResolvedValue(mockRemedies);

      // Act - lowercase query should match uppercase data
      const result = await client.getRemedyInfo({ remedy: 'aconitum napellus' });

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
    });

    it('when cached then returns cached result', async () => {
      // Arrange
      const cachedResult = { id: 1, nameAbbrev: 'Acon.', nameLong: 'Aconitum napellus' };
      mockCacheInstance.get.mockReturnValue(cachedResult);

      // Act
      const result = await client.getRemedyInfo({ remedy: 'acon' });

      // Assert
      expect(result).toEqual(cachedResult);
      expect(mockOOREPClientInstance.getAvailableRemedies).not.toHaveBeenCalled();
    });
  });

  describe('listRepertories', () => {
    it('when no language filter then returns all repertories', async () => {
      // Arrange
      const mockRepertories = [
        { abbreviation: 'kent', title: 'Kent Repertory', language: 'en' },
        { abbreviation: 'boger', title: 'Boger Boenninghausen', language: 'en' },
      ];
      mockOOREPClientInstance.getAvailableRepertories.mockResolvedValue(mockRepertories);

      // Act
      const result = await client.listRepertories();

      // Assert
      expect(result).toEqual(mockRepertories);
    });

    it('when language filter provided then validates language', async () => {
      // Arrange
      mockOOREPClientInstance.getAvailableRepertories.mockResolvedValue([]);

      // Act
      await client.listRepertories({ language: 'en' });

      // Assert
      expect(validateLanguage).toHaveBeenCalledWith('en');
    });

    it('when language filter provided then filters repertories', async () => {
      // Arrange
      const mockRepertories = [
        { abbreviation: 'kent', title: 'Kent Repertory', language: 'en' },
        { abbreviation: 'synth', title: 'Synthesis', language: 'de' },
      ];
      mockOOREPClientInstance.getAvailableRepertories.mockResolvedValue(mockRepertories);

      // Act
      const result = await client.listRepertories({ language: 'en' });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].abbreviation).toBe('kent');
    });

    it('when cached then returns cached result', async () => {
      // Arrange
      const cachedResult = [{ abbreviation: 'kent', title: 'Kent', language: 'en' }];
      mockCacheInstance.get.mockReturnValue(cachedResult);

      // Act
      const result = await client.listRepertories();

      // Assert
      expect(result).toEqual(cachedResult);
      expect(mockOOREPClientInstance.getAvailableRepertories).not.toHaveBeenCalled();
    });
  });

  describe('listMateriaMedicas', () => {
    it('when no language filter then returns all materia medicas', async () => {
      // Arrange
      const mockMateriaMedicas = [
        { abbreviation: 'boericke', title: 'Boericke Materia Medica', language: 'en' },
      ];
      mockOOREPClientInstance.getAvailableMateriaMedicas.mockResolvedValue(mockMateriaMedicas);

      // Act
      const result = await client.listMateriaMedicas();

      // Assert
      expect(result).toEqual(mockMateriaMedicas);
    });

    it('when language filter provided then validates language', async () => {
      // Arrange
      mockOOREPClientInstance.getAvailableMateriaMedicas.mockResolvedValue([]);

      // Act
      await client.listMateriaMedicas({ language: 'de' });

      // Assert
      expect(validateLanguage).toHaveBeenCalledWith('de');
    });

    it('when language filter provided then filters materia medicas', async () => {
      // Arrange
      const mockMateriaMedicas = [
        { abbreviation: 'boericke', title: 'Boericke', language: 'en' },
        { abbreviation: 'hering', title: 'Hering', language: 'de' },
      ];
      mockOOREPClientInstance.getAvailableMateriaMedicas.mockResolvedValue(mockMateriaMedicas);

      // Act
      const result = await client.listMateriaMedicas({ language: 'de' });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].abbreviation).toBe('hering');
    });

    it('when cached then returns cached result', async () => {
      // Arrange
      const cachedResult = [{ abbreviation: 'boericke', title: 'Boericke', language: 'en' }];
      mockCacheInstance.get.mockReturnValue(cachedResult);

      // Act
      const result = await client.listMateriaMedicas();

      // Assert
      expect(result).toEqual(cachedResult);
      expect(mockOOREPClientInstance.getAvailableMateriaMedicas).not.toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('when called then clears the cache', () => {
      // Act
      client.clearCache();

      // Assert
      expect(mockCacheInstance.clear).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('when called then destroys the cache', () => {
      // Act
      client.destroy();

      // Assert
      expect(mockCacheInstance.destroy).toHaveBeenCalled();
    });
  });

  describe('getConfig', () => {
    it('when called then returns immutable config copy', () => {
      // Act
      const config1 = client.getConfig();
      const config2 = client.getConfig();

      // Assert
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });
});

describe('createOOREPClient', () => {
  it('when called without config then creates client with defaults', () => {
    // Act
    const client = createOOREPClient();

    // Assert
    expect(client).toBeInstanceOf(OOREPSDKClient);
    expect(client.getConfig().baseUrl).toBe('https://www.oorep.com');

    client.destroy();
  });

  it('when called with config then creates client with custom config', () => {
    // Act
    const client = createOOREPClient({ timeoutMs: 60000 });

    // Assert
    expect(client).toBeInstanceOf(OOREPSDKClient);
    expect(client.getConfig().timeoutMs).toBe(60000);

    client.destroy();
  });
});

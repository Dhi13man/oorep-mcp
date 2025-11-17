/**
 * Unit tests for search_repertory tool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchRepertoryTool } from './search-repertory.js';
import type { OOREPConfig } from '../config.js';

describe('SearchRepertoryTool', () => {
  let mockTool: SearchRepertoryTool;
  let mockConfig: OOREPConfig;
  let mockClientLookupRepertory: ReturnType<typeof vi.fn>;

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

    mockTool = new SearchRepertoryTool(mockConfig);

    mockClientLookupRepertory = vi.fn();
    (mockTool as any).client.lookupRepertory = mockClientLookupRepertory;
  });

  describe('execute', () => {
    it('execute when valid symptom then returns formatted results', async () => {
      const mockApiResponse = {
        totalNumberOfResults: 1,
        results: [
          {
            rubric: { fullPath: 'Head, pain' },
            repertoryAbbrev: 'kent',
            weightedRemedies: [
              {
                remedy: { nameAbbrev: 'Acon.', nameLong: 'Aconitum' },
                weight: 3,
              },
            ],
          },
        ],
      };
      mockClientLookupRepertory.mockResolvedValue(mockApiResponse);

      const result = await mockTool.execute({ symptom: 'headache' });

      expect(result.totalResults).toBe(1);
      expect(result.rubrics).toHaveLength(1);
      expect(result.rubrics[0].rubric).toBe('Head, pain');
    });

    it('execute when no repertory specified then uses default', async () => {
      const mockApiResponse = {
        totalNumberOfResults: 0,
        results: [],
      };
      mockClientLookupRepertory.mockResolvedValue(mockApiResponse);

      await mockTool.execute({ symptom: 'test' });

      expect(mockClientLookupRepertory).toHaveBeenCalledWith(
        expect.objectContaining({
          repertory: 'test-rep',
        })
      );
    });

    it('execute when repertory specified then uses it', async () => {
      const mockApiResponse = {
        totalNumberOfResults: 0,
        results: [],
      };
      mockClientLookupRepertory.mockResolvedValue(mockApiResponse);

      await mockTool.execute({ symptom: 'test', repertory: 'kent' });

      expect(mockClientLookupRepertory).toHaveBeenCalledWith(
        expect.objectContaining({
          repertory: 'kent',
        })
      );
    });

    it('execute when minWeight specified then passes to client', async () => {
      const mockApiResponse = {
        totalNumberOfResults: 0,
        results: [],
      };
      mockClientLookupRepertory.mockResolvedValue(mockApiResponse);

      await mockTool.execute({ symptom: 'test', minWeight: 3 });

      expect(mockClientLookupRepertory).toHaveBeenCalledWith(
        expect.objectContaining({
          minWeight: 3,
        })
      );
    });

    it('execute when maxResults specified then limits results', async () => {
      const mockApiResponse = {
        totalNumberOfResults: 10,
        results: Array.from({ length: 10 }, (_, i) => ({
          rubric: { fullPath: `Rubric ${i}` },
          repertoryAbbrev: 'kent',
          weightedRemedies: [],
        })),
      };
      mockClientLookupRepertory.mockResolvedValue(mockApiResponse);

      const result = await mockTool.execute({ symptom: 'test', maxResults: 5 });

      expect(result.rubrics).toHaveLength(5);
    });

    it('execute when includeRemedyStats true then includes stats', async () => {
      const mockApiResponse = {
        totalNumberOfResults: 1,
        results: [
          {
            rubric: { fullPath: 'Test' },
            repertoryAbbrev: 'kent',
            weightedRemedies: [
              {
                remedy: { nameAbbrev: 'Acon.', nameLong: 'Aconitum' },
                weight: 3,
              },
            ],
          },
        ],
      };
      mockClientLookupRepertory.mockResolvedValue(mockApiResponse);

      const result = await mockTool.execute({ symptom: 'test', includeRemedyStats: true });

      expect(result.remedyStats).toBeDefined();
      expect(result.remedyStats).toHaveLength(1);
    });

    it('execute when includeRemedyStats false then no stats', async () => {
      const mockApiResponse = {
        totalNumberOfResults: 1,
        results: [
          {
            rubric: { fullPath: 'Test' },
            repertoryAbbrev: 'kent',
            weightedRemedies: [],
          },
        ],
      };
      mockClientLookupRepertory.mockResolvedValue(mockApiResponse);

      const result = await mockTool.execute({ symptom: 'test', includeRemedyStats: false });

      expect(result.remedyStats).toBeUndefined();
    });

    it('execute when symptom too short then throws ValidationError', async () => {
      await expect(mockTool.execute({ symptom: 'ab' })).rejects.toThrow();
    });

    it('execute when symptom too long then throws ValidationError', async () => {
      const longSymptom = 'a'.repeat(201);

      await expect(mockTool.execute({ symptom: longSymptom })).rejects.toThrow();
    });

    it('execute when symptom has invalid characters then throws ValidationError', async () => {
      await expect(mockTool.execute({ symptom: 'test@symptom' })).rejects.toThrow();
    });

    it('execute when symptom has wildcard in middle then throws ValidationError', async () => {
      await expect(mockTool.execute({ symptom: 'he*d' })).rejects.toThrow();
    });

    it('execute when symptom has multiple wildcards then throws ValidationError', async () => {
      await expect(mockTool.execute({ symptom: 'test**' })).rejects.toThrow();
    });

    it('execute when cached result then returns from cache', async () => {
      const mockApiResponse = {
        totalNumberOfResults: 1,
        results: [],
      };
      mockClientLookupRepertory.mockResolvedValue(mockApiResponse);

      await mockTool.execute({ symptom: 'headache' });
      mockClientLookupRepertory.mockClear();
      const result = await mockTool.execute({ symptom: 'headache' });

      expect(mockClientLookupRepertory).not.toHaveBeenCalled();
      expect(result.totalResults).toBe(1);
    });

    it('execute when concurrent duplicate requests then deduplicates', async () => {
      const mockApiResponse = {
        totalNumberOfResults: 1,
        results: [],
      };
      mockClientLookupRepertory.mockResolvedValue(mockApiResponse);

      const results = await Promise.all([
        mockTool.execute({ symptom: 'headache' }),
        mockTool.execute({ symptom: 'headache' }),
        mockTool.execute({ symptom: 'headache' }),
      ]);

      expect(mockClientLookupRepertory).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(3);
    });

    it('execute when different symptoms then makes separate calls', async () => {
      const mockApiResponse = {
        totalNumberOfResults: 0,
        results: [],
      };
      mockClientLookupRepertory.mockResolvedValue(mockApiResponse);

      await Promise.all([
        mockTool.execute({ symptom: 'headache' }),
        mockTool.execute({ symptom: 'fever' }),
      ]);

      expect(mockClientLookupRepertory).toHaveBeenCalledTimes(2);
    });

    it('execute when API returns null then returns empty result', async () => {
      mockClientLookupRepertory.mockResolvedValue(null);

      const result = await mockTool.execute({ symptom: 'test' });

      expect(result.totalResults).toBe(0);
      expect(result.rubrics).toEqual([]);
    });

    it('execute when API error then sanitizes error', async () => {
      mockClientLookupRepertory.mockRejectedValue(new Error('API Error'));

      await expect(mockTool.execute({ symptom: 'test' })).rejects.toThrow();
    });

    it('execute when invalid arguments then sanitizes error', async () => {
      await expect(mockTool.execute({ invalid: 'field' })).rejects.toThrow();
    });

    it('execute when symptom has whitespace then trims it', async () => {
      const mockApiResponse = {
        totalNumberOfResults: 0,
        results: [],
      };
      mockClientLookupRepertory.mockResolvedValue(mockApiResponse);

      await mockTool.execute({ symptom: '  headache  ' });

      expect(mockClientLookupRepertory).toHaveBeenCalledWith(
        expect.objectContaining({
          symptom: 'headache',
        })
      );
    });

    it('execute when valid wildcard at end then succeeds', async () => {
      const mockApiResponse = {
        totalNumberOfResults: 0,
        results: [],
      };
      mockClientLookupRepertory.mockResolvedValue(mockApiResponse);

      await expect(mockTool.execute({ symptom: 'head*' })).resolves.toBeDefined();
    });

    it('execute when valid wildcard at beginning then succeeds', async () => {
      const mockApiResponse = {
        totalNumberOfResults: 0,
        results: [],
      };
      mockClientLookupRepertory.mockResolvedValue(mockApiResponse);

      await expect(mockTool.execute({ symptom: '*ache' })).resolves.toBeDefined();
    });
  });
});

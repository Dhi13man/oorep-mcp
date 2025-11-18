/**
 * Unit tests for search_materia_medica tool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchMateriaMedicaTool } from './search-materia-medica.js';
import type { OOREPConfig } from '../config.js';

describe('SearchMateriaMedicaTool', () => {
  let mockTool: SearchMateriaMedicaTool;
  let mockConfig: OOREPConfig;
  let mockClientLookupMM: ReturnType<typeof vi.fn>;

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

    mockTool = new SearchMateriaMedicaTool(mockConfig);

    mockClientLookupMM = vi.fn();
    (mockTool as any).client.lookupMateriaMedica = mockClientLookupMM;
  });

  describe('execute', () => {
    it('execute when valid symptom then returns formatted results', async () => {
      const mockApiResponse = {
        results: [
          {
            abbrev: 'boericke',
            remedy_id: 1,
            remedy_fullname: 'Aconitum napellus',
            result_sections: [
              {
                heading: 'Mental',
                content: 'Anxiety and fear',
                depth: 1,
              },
            ],
          },
        ],
        numberOfMatchingSectionsPerChapter: [{ hits: 5, remedyId: 1 }],
      };
      mockClientLookupMM.mockResolvedValue(mockApiResponse);

      const result = await mockTool.execute({ symptom: 'anxiety' });

      expect(result.totalResults).toBe(5);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].remedy).toBe('Aconitum napellus');
    });

    it('execute when no materiamedica specified then uses default', async () => {
      const mockApiResponse = {
        results: [],
        numberOfMatchingSectionsPerChapter: [],
      };
      mockClientLookupMM.mockResolvedValue(mockApiResponse);

      await mockTool.execute({ symptom: 'test' });

      expect(mockClientLookupMM).toHaveBeenCalledWith(
        expect.objectContaining({
          materiamedica: 'test-mm',
        })
      );
    });

    it('execute when materiamedica specified then uses it', async () => {
      const mockApiResponse = {
        results: [],
        numberOfMatchingSectionsPerChapter: [],
      };
      mockClientLookupMM.mockResolvedValue(mockApiResponse);

      await mockTool.execute({ symptom: 'test', materiamedica: 'boericke' });

      expect(mockClientLookupMM).toHaveBeenCalledWith(
        expect.objectContaining({
          materiamedica: 'boericke',
        })
      );
    });

    it('execute when remedy filter specified then passes to client', async () => {
      const mockApiResponse = {
        results: [],
        numberOfMatchingSectionsPerChapter: [],
      };
      mockClientLookupMM.mockResolvedValue(mockApiResponse);

      await mockTool.execute({ symptom: 'test', remedy: 'Aconite' });

      expect(mockClientLookupMM).toHaveBeenCalledWith(
        expect.objectContaining({
          remedy: 'Aconite',
        })
      );
    });

    it('execute when maxResults specified then limits results', async () => {
      const mockApiResponse = {
        results: Array.from({ length: 10 }, (_, i) => ({
          abbrev: 'boericke',
          remedy_id: i,
          remedy_fullname: `Remedy ${i}`,
          result_sections: [],
        })),
        numberOfMatchingSectionsPerChapter: [],
      };
      mockClientLookupMM.mockResolvedValue(mockApiResponse);

      const result = await mockTool.execute({ symptom: 'test', maxResults: 5 });

      expect(result.results).toHaveLength(5);
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

    it('execute when remedy has invalid characters then throws ValidationError', async () => {
      await expect(mockTool.execute({ symptom: 'test', remedy: 'Test@Remedy' })).rejects.toThrow();
    });

    it('execute when remedy is too long then throws ValidationError', async () => {
      const longRemedy = 'a'.repeat(101);

      await expect(mockTool.execute({ symptom: 'test', remedy: longRemedy })).rejects.toThrow();
    });

    it('execute when cached result then returns from cache', async () => {
      const mockApiResponse = {
        results: [],
        numberOfMatchingSectionsPerChapter: [],
      };
      mockClientLookupMM.mockResolvedValue(mockApiResponse);

      await mockTool.execute({ symptom: 'anxiety' });
      mockClientLookupMM.mockClear();
      const result = await mockTool.execute({ symptom: 'anxiety' });

      expect(mockClientLookupMM).not.toHaveBeenCalled();
      expect(result.totalResults).toBe(0);
    });

    it('execute when concurrent duplicate requests then deduplicates', async () => {
      const mockApiResponse = {
        results: [],
        numberOfMatchingSectionsPerChapter: [],
      };
      mockClientLookupMM.mockResolvedValue(mockApiResponse);

      const results = await Promise.all([
        mockTool.execute({ symptom: 'anxiety' }),
        mockTool.execute({ symptom: 'anxiety' }),
        mockTool.execute({ symptom: 'anxiety' }),
      ]);

      expect(mockClientLookupMM).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(3);
    });

    it('execute when different symptoms then makes separate calls', async () => {
      const mockApiResponse = {
        results: [],
        numberOfMatchingSectionsPerChapter: [],
      };
      mockClientLookupMM.mockResolvedValue(mockApiResponse);

      await Promise.all([
        mockTool.execute({ symptom: 'anxiety' }),
        mockTool.execute({ symptom: 'fever' }),
      ]);

      expect(mockClientLookupMM).toHaveBeenCalledTimes(2);
    });

    it('execute when API returns null then returns empty result', async () => {
      mockClientLookupMM.mockResolvedValue(null);

      const result = await mockTool.execute({ symptom: 'test' });

      expect(result.totalResults).toBe(0);
      expect(result.results).toEqual([]);
    });

    it('execute when API error then sanitizes error', async () => {
      mockClientLookupMM.mockRejectedValue(new Error('API Error'));

      await expect(mockTool.execute({ symptom: 'test' })).rejects.toThrow();
    });

    it('execute when invalid arguments then sanitizes error', async () => {
      await expect(mockTool.execute({ invalid: 'field' })).rejects.toThrow();
    });

    it('execute when symptom has whitespace then trims it', async () => {
      const mockApiResponse = {
        results: [],
        numberOfMatchingSectionsPerChapter: [],
      };
      mockClientLookupMM.mockResolvedValue(mockApiResponse);

      await mockTool.execute({ symptom: '  anxiety  ' });

      expect(mockClientLookupMM).toHaveBeenCalledWith(
        expect.objectContaining({
          symptom: 'anxiety',
        })
      );
    });

    it('execute when remedy filter is empty string then allows it', async () => {
      const mockApiResponse = {
        results: [],
        numberOfMatchingSectionsPerChapter: [],
      };
      mockClientLookupMM.mockResolvedValue(mockApiResponse);

      await mockTool.execute({ symptom: 'test', remedy: '' });

      expect(mockClientLookupMM).toHaveBeenCalledWith(
        expect.objectContaining({
          remedy: '',
        })
      );
    });

    it('execute when different cache keys then separate cache entries', async () => {
      const mockApiResponse = {
        results: [],
        numberOfMatchingSectionsPerChapter: [],
      };
      mockClientLookupMM.mockResolvedValue(mockApiResponse);

      await mockTool.execute({ symptom: 'test', materiamedica: 'boericke' });
      await mockTool.execute({ symptom: 'test', materiamedica: 'clarke' });

      expect(mockClientLookupMM).toHaveBeenCalledTimes(2);
    });
  });
});

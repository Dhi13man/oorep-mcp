/**
 * Unit tests for search_repertory tool
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SearchRepertoryTool } from './search-repertory.js';
import type { OOREPConfig } from '../config.js';

describe('SearchRepertoryTool', () => {
  let mockTool: SearchRepertoryTool;
  let mockConfig: OOREPConfig;
  let mockSearchRepertory: ReturnType<typeof vi.fn>;

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

    mockSearchRepertory = vi.fn();
    (mockTool as any).client.searchRepertory = mockSearchRepertory;
  });

  afterEach(() => {
    mockTool.destroy();
  });

  describe('execute', () => {
    it('execute when valid symptom then returns formatted results', async () => {
      const mockResult = {
        totalResults: 1,
        rubrics: [
          {
            rubric: 'Head, pain',
            repertory: 'kent',
            remedies: [
              {
                abbrev: 'Acon.',
                name: 'Aconitum',
                weight: 3,
              },
            ],
          },
        ],
      };
      mockSearchRepertory.mockResolvedValue(mockResult);

      const result = await mockTool.execute({ symptom: 'headache' });

      expect(result.totalResults).toBe(1);
      expect(result.rubrics).toHaveLength(1);
      expect(result.rubrics[0].rubric).toBe('Head, pain');
    });

    it('execute when repertory specified then uses it', async () => {
      const mockResult = {
        totalResults: 0,
        rubrics: [],
      };
      mockSearchRepertory.mockResolvedValue(mockResult);

      await mockTool.execute({ symptom: 'test', repertory: 'kent' });

      expect(mockSearchRepertory).toHaveBeenCalledWith(
        expect.objectContaining({
          repertory: 'kent',
        })
      );
    });

    it('execute when minWeight specified then passes to client', async () => {
      const mockResult = {
        totalResults: 0,
        rubrics: [],
      };
      mockSearchRepertory.mockResolvedValue(mockResult);

      await mockTool.execute({ symptom: 'test', minWeight: 3 });

      expect(mockSearchRepertory).toHaveBeenCalledWith(
        expect.objectContaining({
          minWeight: 3,
        })
      );
    });

    it('execute when maxResults specified then limits results', async () => {
      const mockResult = {
        totalResults: 10,
        rubrics: Array.from({ length: 5 }, (_, i) => ({
          rubric: `Rubric ${i}`,
          repertory: 'kent',
          remedies: [],
        })),
      };
      mockSearchRepertory.mockResolvedValue(mockResult);

      const result = await mockTool.execute({ symptom: 'test', maxResults: 5 });

      expect(result.rubrics).toHaveLength(5);
    });

    it('execute when includeRemedyStats true then includes stats', async () => {
      const mockResult = {
        totalResults: 1,
        rubrics: [
          {
            rubric: 'Test',
            repertory: 'kent',
            remedies: [
              {
                abbrev: 'Acon.',
                name: 'Aconitum',
                weight: 3,
              },
            ],
          },
        ],
        remedyStats: [
          {
            abbrev: 'Acon.',
            name: 'Aconitum',
            totalOccurrences: 1,
            totalWeight: 3,
          },
        ],
      };
      mockSearchRepertory.mockResolvedValue(mockResult);

      const result = await mockTool.execute({ symptom: 'test', includeRemedyStats: true });

      expect(result.remedyStats).toBeDefined();
      expect(result.remedyStats).toHaveLength(1);
    });

    it('execute when includeRemedyStats false then no stats', async () => {
      const mockResult = {
        totalResults: 1,
        rubrics: [
          {
            rubric: 'Test',
            repertory: 'kent',
            remedies: [],
          },
        ],
      };
      mockSearchRepertory.mockResolvedValue(mockResult);

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

    it('execute when API error then sanitizes error', async () => {
      mockSearchRepertory.mockRejectedValue(new Error('API Error'));

      await expect(mockTool.execute({ symptom: 'test' })).rejects.toThrow();
    });

    it('execute when invalid arguments then sanitizes error', async () => {
      await expect(mockTool.execute({ invalid: 'field' })).rejects.toThrow();
    });

    it('execute when symptom has whitespace then trims it', async () => {
      const mockResult = {
        totalResults: 0,
        rubrics: [],
      };
      mockSearchRepertory.mockResolvedValue(mockResult);

      await mockTool.execute({ symptom: '  headache  ' });

      expect(mockSearchRepertory).toHaveBeenCalledWith(
        expect.objectContaining({
          symptom: 'headache',
        })
      );
    });

    it('execute when valid wildcard at end then succeeds', async () => {
      const mockResult = {
        totalResults: 0,
        rubrics: [],
      };
      mockSearchRepertory.mockResolvedValue(mockResult);

      await expect(mockTool.execute({ symptom: 'head*' })).resolves.toBeDefined();
    });

    it('execute when valid wildcard at beginning then succeeds', async () => {
      const mockResult = {
        totalResults: 0,
        rubrics: [],
      };
      mockSearchRepertory.mockResolvedValue(mockResult);

      await expect(mockTool.execute({ symptom: '*ache' })).resolves.toBeDefined();
    });
  });
});

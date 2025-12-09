/**
 * Unit tests for search_repertory tool
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SearchRepertoryTool } from './search-repertory.js';
import { createMockSDKClient } from './test-helpers.js';

describe('SearchRepertoryTool', () => {
  let tool: SearchRepertoryTool;
  let mockClient: ReturnType<typeof createMockSDKClient>;

  beforeEach(() => {
    mockClient = createMockSDKClient();
    tool = new SearchRepertoryTool(mockClient);
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
      mockClient.searchRepertory.mockResolvedValue(mockResult);

      const result = await tool.execute({ symptom: 'headache' });

      expect(result.totalResults).toBe(1);
      expect(result.rubrics).toHaveLength(1);
      expect(result.rubrics[0].rubric).toBe('Head, pain');
    });

    it('execute when repertory specified then uses it', async () => {
      const mockResult = {
        totalResults: 0,
        rubrics: [],
      };
      mockClient.searchRepertory.mockResolvedValue(mockResult);

      await tool.execute({ symptom: 'test', repertory: 'kent' });

      expect(mockClient.searchRepertory).toHaveBeenCalledWith(
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
      mockClient.searchRepertory.mockResolvedValue(mockResult);

      await tool.execute({ symptom: 'test', minWeight: 3 });

      expect(mockClient.searchRepertory).toHaveBeenCalledWith(
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
      mockClient.searchRepertory.mockResolvedValue(mockResult);

      const result = await tool.execute({ symptom: 'test', maxResults: 5 });

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
      mockClient.searchRepertory.mockResolvedValue(mockResult);

      const result = await tool.execute({ symptom: 'test', includeRemedyStats: true });

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
      mockClient.searchRepertory.mockResolvedValue(mockResult);

      const result = await tool.execute({ symptom: 'test', includeRemedyStats: false });

      expect(result.remedyStats).toBeUndefined();
    });

    it('execute when symptom too short then throws ValidationError', async () => {
      await expect(tool.execute({ symptom: 'ab' })).rejects.toThrow();
    });

    it('execute when symptom too long then throws ValidationError', async () => {
      const longSymptom = 'a'.repeat(201);

      await expect(tool.execute({ symptom: longSymptom })).rejects.toThrow();
    });

    it('execute when symptom has invalid characters then throws ValidationError', async () => {
      await expect(tool.execute({ symptom: 'test@symptom' })).rejects.toThrow();
    });

    it('execute when symptom has wildcard in middle then throws ValidationError', async () => {
      await expect(tool.execute({ symptom: 'he*d' })).rejects.toThrow();
    });

    it('execute when symptom has multiple wildcards then throws ValidationError', async () => {
      await expect(tool.execute({ symptom: 'test**' })).rejects.toThrow();
    });

    it('execute when API error then sanitizes error', async () => {
      mockClient.searchRepertory.mockRejectedValue(new Error('API Error'));

      await expect(tool.execute({ symptom: 'test' })).rejects.toThrow();
    });

    it('execute when invalid arguments then sanitizes error', async () => {
      await expect(tool.execute({ invalid: 'field' })).rejects.toThrow();
    });

    it('execute when symptom has whitespace then trims it', async () => {
      const mockResult = {
        totalResults: 0,
        rubrics: [],
      };
      mockClient.searchRepertory.mockResolvedValue(mockResult);

      await tool.execute({ symptom: '  headache  ' });

      expect(mockClient.searchRepertory).toHaveBeenCalledWith(
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
      mockClient.searchRepertory.mockResolvedValue(mockResult);

      await expect(tool.execute({ symptom: 'head*' })).resolves.toBeDefined();
    });

    it('execute when valid wildcard at beginning then succeeds', async () => {
      const mockResult = {
        totalResults: 0,
        rubrics: [],
      };
      mockClient.searchRepertory.mockResolvedValue(mockResult);

      await expect(tool.execute({ symptom: '*ache' })).resolves.toBeDefined();
    });
  });
});

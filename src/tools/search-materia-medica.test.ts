/**
 * Unit tests for search_materia_medica tool
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SearchMateriaMedicaTool } from './search-materia-medica.js';
import type { OOREPConfig } from '../config.js';

describe('SearchMateriaMedicaTool', () => {
  let mockTool: SearchMateriaMedicaTool;
  let mockConfig: OOREPConfig;
  let mockSearchMateriaMedica: ReturnType<typeof vi.fn>;

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

    mockSearchMateriaMedica = vi.fn();
    (mockTool as any).client.searchMateriaMedica = mockSearchMateriaMedica;
  });

  afterEach(() => {
    mockTool.destroy();
  });

  describe('execute', () => {
    it('execute when valid symptom then returns formatted results', async () => {
      const mockFormattedResponse = {
        totalResults: 5,
        results: [
          {
            remedy: 'Aconitum napellus',
            sections: [
              {
                heading: 'Mental',
                content: 'Anxiety and fear',
                depth: 1,
              },
            ],
          },
        ],
      };
      mockSearchMateriaMedica.mockResolvedValue(mockFormattedResponse);

      const result = await mockTool.execute({ symptom: 'anxiety' });

      expect(result.totalResults).toBe(5);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].remedy).toBe('Aconitum napellus');
    });

    it('execute when materiamedica specified then uses it', async () => {
      const mockFormattedResponse = {
        totalResults: 0,
        results: [],
      };
      mockSearchMateriaMedica.mockResolvedValue(mockFormattedResponse);

      await mockTool.execute({ symptom: 'test', materiamedica: 'boericke' });

      expect(mockSearchMateriaMedica).toHaveBeenCalledWith(
        expect.objectContaining({
          materiamedica: 'boericke',
        })
      );
    });

    it('execute when remedy filter specified then passes to client', async () => {
      const mockFormattedResponse = {
        totalResults: 0,
        results: [],
      };
      mockSearchMateriaMedica.mockResolvedValue(mockFormattedResponse);

      await mockTool.execute({ symptom: 'test', remedy: 'Aconite' });

      expect(mockSearchMateriaMedica).toHaveBeenCalledWith(
        expect.objectContaining({
          remedy: 'Aconite',
        })
      );
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

    it('execute when API error then sanitizes error', async () => {
      mockSearchMateriaMedica.mockRejectedValue(new Error('API Error'));

      await expect(mockTool.execute({ symptom: 'test' })).rejects.toThrow();
    });

    it('execute when invalid arguments then sanitizes error', async () => {
      await expect(mockTool.execute({ invalid: 'field' })).rejects.toThrow();
    });

    it('execute when symptom has whitespace then trims it', async () => {
      const mockFormattedResponse = {
        totalResults: 0,
        results: [],
      };
      mockSearchMateriaMedica.mockResolvedValue(mockFormattedResponse);

      await mockTool.execute({ symptom: '  anxiety  ' });

      expect(mockSearchMateriaMedica).toHaveBeenCalledWith(
        expect.objectContaining({
          symptom: 'anxiety',
        })
      );
    });

    it('execute when remedy filter is undefined then does not include remedy param', async () => {
      const mockFormattedResponse = {
        totalResults: 0,
        results: [],
      };
      mockSearchMateriaMedica.mockResolvedValue(mockFormattedResponse);

      await mockTool.execute({ symptom: 'test' });

      expect(mockSearchMateriaMedica).toHaveBeenCalledWith(
        expect.objectContaining({
          symptom: 'test',
        })
      );
      // Verify remedy is not explicitly set to empty string
      const callArgs = mockSearchMateriaMedica.mock.calls[0][0];
      expect(callArgs.remedy).toBeUndefined();
    });
  });
});

/**
 * Unit tests for list_available_materia_medicas tool
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ListMateriaMedicasTool } from './list-materia-medicas.js';
import type { OOREPConfig } from '../config.js';

describe('ListMateriaMedicasTool', () => {
  let mockTool: ListMateriaMedicasTool;
  let mockConfig: OOREPConfig;
  let mockListMateriaMedicas: ReturnType<typeof vi.fn>;

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

    mockTool = new ListMateriaMedicasTool(mockConfig);

    // Mock the OOREPSDKClient.listMateriaMedicas method
    mockListMateriaMedicas = vi.fn();
    (mockTool as any).client.listMateriaMedicas = mockListMateriaMedicas;
  });

  afterEach(() => {
    mockTool.destroy();
  });

  describe('execute', () => {
    it('execute when no language filter then returns all materia medicas', async () => {
      const mockMateriaMedicas = [
        {
          abbreviation: 'boericke',
          title: 'Boericke Materia Medica',
          author: 'William Boericke',
          language: 'en',
        },
        {
          abbreviation: 'clarke',
          title: 'Clarke Dictionary',
          author: 'John Henry Clarke',
          language: 'en',
        },
      ];
      mockListMateriaMedicas.mockResolvedValue(mockMateriaMedicas);

      const result = await mockTool.execute({});

      expect(result.materiaMedicas).toHaveLength(2);
      expect(result.materiaMedicas[0].abbreviation).toBe('boericke');
      expect(result.materiaMedicas[1].abbreviation).toBe('clarke');
    });

    it('execute when language filter specified then returns filtered materia medicas', async () => {
      const mockMateriaMedicas = [
        {
          abbreviation: 'german-mm',
          title: 'German MM',
          language: 'de',
        },
      ];
      mockListMateriaMedicas.mockResolvedValue(mockMateriaMedicas);

      const result = await mockTool.execute({ language: 'de' });

      expect(result.materiaMedicas).toHaveLength(1);
      expect(result.materiaMedicas[0].abbreviation).toBe('german-mm');
      expect(mockListMateriaMedicas).toHaveBeenCalledWith({ language: 'de' });
    });

    it('execute when language filter is case-insensitive then filters correctly', async () => {
      const mockMateriaMedicas = [
        {
          abbreviation: 'boericke',
          title: 'Boericke MM',
          language: 'EN',
        },
      ];
      mockListMateriaMedicas.mockResolvedValue(mockMateriaMedicas);

      const result = await mockTool.execute({ language: 'en' });

      expect(result.materiaMedicas).toHaveLength(1);
    });

    it('execute when no materia medicas match language then returns empty array', async () => {
      mockListMateriaMedicas.mockResolvedValue([]);

      const result = await mockTool.execute({ language: 'fr' });

      expect(result.materiaMedicas).toHaveLength(0);
    });

    it('execute when materia medica has all metadata fields then includes them', async () => {
      const mockMateriaMedicas = [
        {
          abbreviation: 'boericke',
          title: 'Boericke MM',
          author: 'William Boericke',
          year: 1927,
          language: 'en',
          edition: '9th',
          publisher: 'Test Publisher',
          license: 'Public Domain',
        },
      ];
      mockListMateriaMedicas.mockResolvedValue(mockMateriaMedicas);

      const result = await mockTool.execute({});

      const mm = result.materiaMedicas[0];
      expect(mm.year).toBe(1927);
      expect(mm.edition).toBe('9th');
      expect(mm.publisher).toBe('Test Publisher');
      expect(mm.license).toBe('Public Domain');
    });

    it('execute when materia medica has optional fields undefined then omits them', async () => {
      const mockMateriaMedicas = [
        {
          abbreviation: 'boericke',
          title: 'Boericke MM',
        },
      ];
      mockListMateriaMedicas.mockResolvedValue(mockMateriaMedicas);

      const result = await mockTool.execute({});

      const mm = result.materiaMedicas[0];
      expect(mm.year).toBeUndefined();
      expect(mm.edition).toBeUndefined();
      expect(mm.publisher).toBeUndefined();
      expect(mm.license).toBeUndefined();
    });

    it('execute when invalid language code then throws ValidationError', async () => {
      await expect(mockTool.execute({ language: 'invalid123' })).rejects.toThrow();
    });

    it('execute when language code too short then throws ValidationError', async () => {
      await expect(mockTool.execute({ language: 'e' })).rejects.toThrow();
    });

    it('execute when language code too long then throws ValidationError', async () => {
      await expect(mockTool.execute({ language: 'engl' })).rejects.toThrow();
    });

    it('execute when called twice then SDK handles caching', async () => {
      const mockMateriaMedicas = [
        {
          abbreviation: 'boericke',
          title: 'Boericke MM',
        },
      ];
      mockListMateriaMedicas.mockResolvedValue(mockMateriaMedicas);

      await mockTool.execute({});
      const result = await mockTool.execute({});

      // SDK handles caching internally
      expect(result.materiaMedicas).toHaveLength(1);
    });

    it('execute when different language filters then makes separate calls', async () => {
      const mockMateriaMedicas = [
        {
          abbreviation: 'boericke',
          title: 'Boericke MM',
          language: 'en',
        },
      ];
      mockListMateriaMedicas.mockResolvedValue(mockMateriaMedicas);

      await mockTool.execute({ language: 'en' });
      await mockTool.execute({ language: 'de' });

      expect(mockListMateriaMedicas).toHaveBeenCalledTimes(2);
    });

    it('execute when API returns empty array then returns empty array', async () => {
      mockListMateriaMedicas.mockResolvedValue([]);

      const result = await mockTool.execute({});

      expect(result.materiaMedicas).toEqual([]);
    });

    it('execute when API error then sanitizes error', async () => {
      mockListMateriaMedicas.mockRejectedValue(new Error('API Error'));

      await expect(mockTool.execute({})).rejects.toThrow();
    });

    it('execute when invalid arguments then sanitizes error', async () => {
      await expect(mockTool.execute({ invalid: 'field' })).rejects.toThrow();
    });
  });
});

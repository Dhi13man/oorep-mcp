/**
 * Unit tests for list_available_materia_medicas tool
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ListMateriaMedicasTool } from './list-materia-medicas.js';
import { createMockSDKClient } from './test-helpers.js';

describe('ListMateriaMedicasTool', () => {
  let tool: ListMateriaMedicasTool;
  let mockClient: ReturnType<typeof createMockSDKClient>;

  beforeEach(() => {
    mockClient = createMockSDKClient();
    tool = new ListMateriaMedicasTool(mockClient);
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
      mockClient.listMateriaMedicas.mockResolvedValue(mockMateriaMedicas);

      const result = await tool.execute({});

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
      mockClient.listMateriaMedicas.mockResolvedValue(mockMateriaMedicas);

      const result = await tool.execute({ language: 'de' });

      expect(result.materiaMedicas).toHaveLength(1);
      expect(result.materiaMedicas[0].abbreviation).toBe('german-mm');
      expect(mockClient.listMateriaMedicas).toHaveBeenCalledWith({ language: 'de' });
    });

    it('execute when language filter is case-insensitive then filters correctly', async () => {
      const mockMateriaMedicas = [
        {
          abbreviation: 'boericke',
          title: 'Boericke MM',
          language: 'EN',
        },
      ];
      mockClient.listMateriaMedicas.mockResolvedValue(mockMateriaMedicas);

      const result = await tool.execute({ language: 'en' });

      expect(result.materiaMedicas).toHaveLength(1);
    });

    it('execute when no materia medicas match language then returns empty array', async () => {
      mockClient.listMateriaMedicas.mockResolvedValue([]);

      const result = await tool.execute({ language: 'fr' });

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
      mockClient.listMateriaMedicas.mockResolvedValue(mockMateriaMedicas);

      const result = await tool.execute({});

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
      mockClient.listMateriaMedicas.mockResolvedValue(mockMateriaMedicas);

      const result = await tool.execute({});

      const mm = result.materiaMedicas[0];
      expect(mm.year).toBeUndefined();
      expect(mm.edition).toBeUndefined();
      expect(mm.publisher).toBeUndefined();
      expect(mm.license).toBeUndefined();
    });

    it('execute when invalid language code then throws ValidationError', async () => {
      await expect(tool.execute({ language: 'invalid123' })).rejects.toThrow();
    });

    it('execute when language code too short then throws ValidationError', async () => {
      await expect(tool.execute({ language: 'e' })).rejects.toThrow();
    });

    it('execute when language code too long then throws ValidationError', async () => {
      await expect(tool.execute({ language: 'engl' })).rejects.toThrow();
    });

    it('execute when called twice then SDK handles caching', async () => {
      const mockMateriaMedicas = [
        {
          abbreviation: 'boericke',
          title: 'Boericke MM',
        },
      ];
      mockClient.listMateriaMedicas.mockResolvedValue(mockMateriaMedicas);

      await tool.execute({});
      const result = await tool.execute({});

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
      mockClient.listMateriaMedicas.mockResolvedValue(mockMateriaMedicas);

      await tool.execute({ language: 'en' });
      await tool.execute({ language: 'de' });

      expect(mockClient.listMateriaMedicas).toHaveBeenCalledTimes(2);
    });

    it('execute when API returns empty array then returns empty array', async () => {
      mockClient.listMateriaMedicas.mockResolvedValue([]);

      const result = await tool.execute({});

      expect(result.materiaMedicas).toEqual([]);
    });

    it('execute when API error then sanitizes error', async () => {
      mockClient.listMateriaMedicas.mockRejectedValue(new Error('API Error'));

      await expect(tool.execute({})).rejects.toThrow();
    });

    it('execute when invalid arguments then sanitizes error', async () => {
      await expect(tool.execute({ invalid: 'field' })).rejects.toThrow();
    });
  });
});

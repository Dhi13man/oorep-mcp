/**
 * Unit tests for list_available_repertories tool
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ListRepertoriesTool } from './list-repertories.js';
import type { OOREPConfig } from '../config.js';

describe('ListRepertoriesTool', () => {
  let mockTool: ListRepertoriesTool;
  let mockConfig: OOREPConfig;
  let mockListRepertories: ReturnType<typeof vi.fn>;

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

    mockTool = new ListRepertoriesTool(mockConfig);

    // Mock the OOREPSDKClient.listRepertories method
    mockListRepertories = vi.fn();
    (mockTool as any).client.listRepertories = mockListRepertories;
  });

  afterEach(() => {
    mockTool.destroy();
  });

  describe('execute', () => {
    it('execute when no language filter then returns all repertories', async () => {
      const mockRepertories = [
        {
          abbreviation: 'kent',
          title: 'Kent Repertory',
          author: 'James Tyler Kent',
          language: 'en',
        },
        {
          abbreviation: 'boger',
          title: 'Boger Repertory',
          author: 'Cyrus Boger',
          language: 'en',
        },
      ];
      mockListRepertories.mockResolvedValue(mockRepertories);

      const result = await mockTool.execute({});

      expect(result.repertories).toHaveLength(2);
      expect(result.repertories[0].abbreviation).toBe('kent');
      expect(result.repertories[1].abbreviation).toBe('boger');
    });

    it('execute when language filter specified then returns filtered repertories', async () => {
      const mockRepertories = [
        {
          abbreviation: 'german-rep',
          title: 'German Repertory',
          language: 'de',
        },
      ];
      mockListRepertories.mockResolvedValue(mockRepertories);

      const result = await mockTool.execute({ language: 'de' });

      expect(result.repertories).toHaveLength(1);
      expect(result.repertories[0].abbreviation).toBe('german-rep');
      expect(mockListRepertories).toHaveBeenCalledWith({ language: 'de' });
    });

    it('execute when language filter is case-insensitive then filters correctly', async () => {
      const mockRepertories = [
        {
          abbreviation: 'kent',
          title: 'Kent Repertory',
          language: 'EN',
        },
      ];
      mockListRepertories.mockResolvedValue(mockRepertories);

      const result = await mockTool.execute({ language: 'en' });

      expect(result.repertories).toHaveLength(1);
    });

    it('execute when no repertories match language then returns empty array', async () => {
      mockListRepertories.mockResolvedValue([]);

      const result = await mockTool.execute({ language: 'fr' });

      expect(result.repertories).toHaveLength(0);
    });

    it('execute when repertory has all metadata fields then includes them', async () => {
      const mockRepertories = [
        {
          abbreviation: 'kent',
          title: 'Kent Repertory',
          author: 'James Tyler Kent',
          year: 1905,
          language: 'en',
          edition: '6th',
          publisher: 'Test Publisher',
          license: 'Public Domain',
          remedyCount: 1500,
        },
      ];
      mockListRepertories.mockResolvedValue(mockRepertories);

      const result = await mockTool.execute({});

      const rep = result.repertories[0];
      expect(rep.year).toBe(1905);
      expect(rep.edition).toBe('6th');
      expect(rep.publisher).toBe('Test Publisher');
      expect(rep.license).toBe('Public Domain');
      expect(rep.remedyCount).toBe(1500);
    });

    it('execute when repertory has optional fields undefined then omits them', async () => {
      const mockRepertories = [
        {
          abbreviation: 'kent',
          title: 'Kent Repertory',
        },
      ];
      mockListRepertories.mockResolvedValue(mockRepertories);

      const result = await mockTool.execute({});

      const rep = result.repertories[0];
      expect(rep.year).toBeUndefined();
      expect(rep.edition).toBeUndefined();
      expect(rep.publisher).toBeUndefined();
      expect(rep.license).toBeUndefined();
      expect(rep.remedyCount).toBeUndefined();
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
      const mockRepertories = [
        {
          abbreviation: 'kent',
          title: 'Kent Repertory',
        },
      ];
      mockListRepertories.mockResolvedValue(mockRepertories);

      await mockTool.execute({});
      const result = await mockTool.execute({});

      // SDK handles caching internally
      expect(result.repertories).toHaveLength(1);
    });

    it('execute when different language filters then makes separate calls', async () => {
      const mockRepertories = [
        {
          abbreviation: 'kent',
          title: 'Kent Repertory',
          language: 'en',
        },
      ];
      mockListRepertories.mockResolvedValue(mockRepertories);

      await mockTool.execute({ language: 'en' });
      await mockTool.execute({ language: 'de' });

      expect(mockListRepertories).toHaveBeenCalledTimes(2);
    });

    it('execute when API returns empty array then returns empty array', async () => {
      mockListRepertories.mockResolvedValue([]);

      const result = await mockTool.execute({});

      expect(result.repertories).toEqual([]);
    });

    it('execute when API error then sanitizes error', async () => {
      mockListRepertories.mockRejectedValue(new Error('API Error'));

      await expect(mockTool.execute({})).rejects.toThrow();
    });

    it('execute when invalid arguments then sanitizes error', async () => {
      await expect(mockTool.execute({ invalid: 'field' })).rejects.toThrow();
    });
  });
});

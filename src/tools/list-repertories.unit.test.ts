/**
 * Unit tests for list_available_repertories tool
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ListRepertoriesTool } from './list-repertories.js';
import { createMockSDKClient } from './test-helpers.js';

describe('ListRepertoriesTool', () => {
  let tool: ListRepertoriesTool;
  let mockClient: ReturnType<typeof createMockSDKClient>;

  beforeEach(() => {
    mockClient = createMockSDKClient();
    tool = new ListRepertoriesTool(mockClient);
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
      mockClient.listRepertories.mockResolvedValue(mockRepertories);

      const result = await tool.execute({});

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
      mockClient.listRepertories.mockResolvedValue(mockRepertories);

      const result = await tool.execute({ language: 'de' });

      expect(result.repertories).toHaveLength(1);
      expect(result.repertories[0].abbreviation).toBe('german-rep');
      expect(mockClient.listRepertories).toHaveBeenCalledWith({ language: 'de' });
    });

    it('execute when language filter is case-insensitive then filters correctly', async () => {
      const mockRepertories = [
        {
          abbreviation: 'kent',
          title: 'Kent Repertory',
          language: 'EN',
        },
      ];
      mockClient.listRepertories.mockResolvedValue(mockRepertories);

      const result = await tool.execute({ language: 'en' });

      expect(result.repertories).toHaveLength(1);
    });

    it('execute when no repertories match language then returns empty array', async () => {
      mockClient.listRepertories.mockResolvedValue([]);

      const result = await tool.execute({ language: 'fr' });

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
      mockClient.listRepertories.mockResolvedValue(mockRepertories);

      const result = await tool.execute({});

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
      mockClient.listRepertories.mockResolvedValue(mockRepertories);

      const result = await tool.execute({});

      const rep = result.repertories[0];
      expect(rep.year).toBeUndefined();
      expect(rep.edition).toBeUndefined();
      expect(rep.publisher).toBeUndefined();
      expect(rep.license).toBeUndefined();
      expect(rep.remedyCount).toBeUndefined();
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
      const mockRepertories = [
        {
          abbreviation: 'kent',
          title: 'Kent Repertory',
        },
      ];
      mockClient.listRepertories.mockResolvedValue(mockRepertories);

      await tool.execute({});
      const result = await tool.execute({});

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
      mockClient.listRepertories.mockResolvedValue(mockRepertories);

      await tool.execute({ language: 'en' });
      await tool.execute({ language: 'de' });

      expect(mockClient.listRepertories).toHaveBeenCalledTimes(2);
    });

    it('execute when API returns empty array then returns empty array', async () => {
      mockClient.listRepertories.mockResolvedValue([]);

      const result = await tool.execute({});

      expect(result.repertories).toEqual([]);
    });

    it('execute when API error then sanitizes error', async () => {
      mockClient.listRepertories.mockRejectedValue(new Error('API Error'));

      await expect(tool.execute({})).rejects.toThrow();
    });

    it('execute when invalid arguments then sanitizes error', async () => {
      await expect(tool.execute({ invalid: 'field' })).rejects.toThrow();
    });
  });
});

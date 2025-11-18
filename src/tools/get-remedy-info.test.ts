/**
 * Unit tests for get_remedy_info tool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetRemedyInfoTool } from './get-remedy-info.js';
import type { OOREPConfig } from '../config.js';

describe('GetRemedyInfoTool', () => {
  let mockTool: GetRemedyInfoTool;
  let mockConfig: OOREPConfig;
  let mockClientGetRemedies: ReturnType<typeof vi.fn>;

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

    mockTool = new GetRemedyInfoTool(mockConfig);

    mockClientGetRemedies = vi.fn();
    (mockTool as any).client.getAvailableRemedies = mockClientGetRemedies;
  });

  describe('execute', () => {
    it('execute when remedy exists with exact match then returns info', async () => {
      const mockRemedies = [
        {
          id: 1,
          nameAbbrev: 'Acon.',
          nameLong: 'Aconitum napellus',
          namealt: ['Monkshood'],
        },
      ];
      mockClientGetRemedies.mockResolvedValue(mockRemedies);

      const result = await mockTool.execute({ remedy: 'Acon.' });

      expect(result.id).toBe(1);
      expect(result.nameAbbrev).toBe('Acon.');
      expect(result.nameLong).toBe('Aconitum napellus');
      expect(result.nameAlt).toEqual(['Monkshood']);
    });

    it('execute when remedy matches by long name then returns info', async () => {
      const mockRemedies = [
        {
          id: 2,
          nameAbbrev: 'Bell.',
          nameLong: 'Belladonna',
          namealt: [],
        },
      ];
      mockClientGetRemedies.mockResolvedValue(mockRemedies);

      const result = await mockTool.execute({ remedy: 'Belladonna' });

      expect(result.id).toBe(2);
      expect(result.nameAbbrev).toBe('Bell.');
    });

    it('execute when remedy matches by alternative name then returns info', async () => {
      const mockRemedies = [
        {
          id: 1,
          nameAbbrev: 'Acon.',
          nameLong: 'Aconitum napellus',
          namealt: ['Monkshood', 'Wolfsbane'],
        },
      ];
      mockClientGetRemedies.mockResolvedValue(mockRemedies);

      const result = await mockTool.execute({ remedy: 'Monkshood' });

      expect(result.id).toBe(1);
    });

    it('execute when remedy is case-insensitive match then returns info', async () => {
      const mockRemedies = [
        {
          id: 1,
          nameAbbrev: 'Acon.',
          nameLong: 'Aconitum napellus',
          namealt: [],
        },
      ];
      mockClientGetRemedies.mockResolvedValue(mockRemedies);

      const result = await mockTool.execute({ remedy: 'ACON.' });

      expect(result.id).toBe(1);
    });

    it('execute when remedy has partial match then returns info', async () => {
      const mockRemedies = [
        {
          id: 1,
          nameAbbrev: 'Acon.',
          nameLong: 'Aconitum napellus',
          namealt: [],
        },
      ];
      mockClientGetRemedies.mockResolvedValue(mockRemedies);

      const result = await mockTool.execute({ remedy: 'aconit' });

      expect(result.id).toBe(1);
    });

    it('execute when partial match less than 3 chars then requires exact match', async () => {
      const mockRemedies = [
        {
          id: 1,
          nameAbbrev: 'Acon.',
          nameLong: 'Aconitum napellus',
          namealt: [],
        },
      ];
      mockClientGetRemedies.mockResolvedValue(mockRemedies);

      await expect(mockTool.execute({ remedy: 'ac' })).rejects.toThrow();
    });

    it('execute when remedy not found then throws error', async () => {
      mockClientGetRemedies.mockResolvedValue([
        {
          id: 1,
          nameAbbrev: 'Acon.',
          nameLong: 'Aconitum napellus',
          namealt: [],
        },
      ]);

      await expect(mockTool.execute({ remedy: 'NonExistent' })).rejects.toThrow();
    });

    it('execute when invalid remedy name then throws ValidationError', async () => {
      await expect(mockTool.execute({ remedy: '' })).rejects.toThrow();
    });

    it('execute when remedy name too long then throws ValidationError', async () => {
      const longName = 'a'.repeat(101);

      await expect(mockTool.execute({ remedy: longName })).rejects.toThrow();
    });

    it('execute when remedy has invalid characters then throws ValidationError', async () => {
      await expect(mockTool.execute({ remedy: 'Test@Remedy' })).rejects.toThrow();
    });

    it('execute when cached result then returns from cache', async () => {
      const mockRemedies = [
        {
          id: 1,
          nameAbbrev: 'Acon.',
          nameLong: 'Aconitum napellus',
          namealt: [],
        },
      ];
      mockClientGetRemedies.mockResolvedValue(mockRemedies);

      await mockTool.execute({ remedy: 'Acon.' });
      mockClientGetRemedies.mockClear();
      const result = await mockTool.execute({ remedy: 'Acon.' });

      expect(mockClientGetRemedies).not.toHaveBeenCalled();
      expect(result.id).toBe(1);
    });

    it('execute when concurrent duplicate requests then deduplicates', async () => {
      const mockRemedies = [
        {
          id: 1,
          nameAbbrev: 'Acon.',
          nameLong: 'Aconitum napellus',
          namealt: [],
        },
      ];
      mockClientGetRemedies.mockResolvedValue(mockRemedies);

      const results = await Promise.all([
        mockTool.execute({ remedy: 'Acon.' }),
        mockTool.execute({ remedy: 'Acon.' }),
        mockTool.execute({ remedy: 'Acon.' }),
      ]);

      expect(mockClientGetRemedies).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(3);
    });

    it('execute when remedy has no alternative names then nameAlt is undefined', async () => {
      const mockRemedies = [
        {
          id: 1,
          nameAbbrev: 'Test',
          nameLong: 'Test Remedy',
        },
      ];
      mockClientGetRemedies.mockResolvedValue(mockRemedies);

      const result = await mockTool.execute({ remedy: 'Test' });

      expect(result.nameAlt).toBeUndefined();
    });

    it('execute when invalid arguments then sanitizes error', async () => {
      await expect(mockTool.execute({ invalid: 'field' })).rejects.toThrow();
    });

    it('execute when API error then sanitizes error', async () => {
      mockClientGetRemedies.mockRejectedValue(new Error('API Error'));

      await expect(mockTool.execute({ remedy: 'Test' })).rejects.toThrow();
    });
  });
});

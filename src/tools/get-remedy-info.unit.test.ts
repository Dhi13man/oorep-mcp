/**
 * Unit tests for get_remedy_info tool
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GetRemedyInfoTool } from './get-remedy-info.js';
import { createMockSDKClient } from './test-helpers.js';

describe('GetRemedyInfoTool', () => {
  let tool: GetRemedyInfoTool;
  let mockClient: ReturnType<typeof createMockSDKClient>;

  beforeEach(() => {
    mockClient = createMockSDKClient();
    tool = new GetRemedyInfoTool(mockClient);
  });

  describe('execute', () => {
    it('execute when remedy exists with exact match then returns info', async () => {
      const mockRemedyInfo = {
        id: 1,
        nameAbbrev: 'Acon.',
        nameLong: 'Aconitum napellus',
        nameAlt: ['Monkshood'],
      };
      mockClient.getRemedyInfo.mockResolvedValue(mockRemedyInfo);

      const result = await tool.execute({ remedy: 'Acon.' });

      expect(result.id).toBe(1);
      expect(result.nameAbbrev).toBe('Acon.');
      expect(result.nameLong).toBe('Aconitum napellus');
      expect(result.nameAlt).toEqual(['Monkshood']);
    });

    it('execute when remedy matches by long name then returns info', async () => {
      const mockRemedyInfo = {
        id: 2,
        nameAbbrev: 'Bell.',
        nameLong: 'Belladonna',
        nameAlt: [],
      };
      mockClient.getRemedyInfo.mockResolvedValue(mockRemedyInfo);

      const result = await tool.execute({ remedy: 'Belladonna' });

      expect(result.id).toBe(2);
      expect(result.nameAbbrev).toBe('Bell.');
    });

    it('execute when remedy matches by alternative name then returns info', async () => {
      const mockRemedyInfo = {
        id: 1,
        nameAbbrev: 'Acon.',
        nameLong: 'Aconitum napellus',
        nameAlt: ['Monkshood', 'Wolfsbane'],
      };
      mockClient.getRemedyInfo.mockResolvedValue(mockRemedyInfo);

      const result = await tool.execute({ remedy: 'Monkshood' });

      expect(result.id).toBe(1);
    });

    it('execute when remedy is case-insensitive match then returns info', async () => {
      const mockRemedyInfo = {
        id: 1,
        nameAbbrev: 'Acon.',
        nameLong: 'Aconitum napellus',
        nameAlt: [],
      };
      mockClient.getRemedyInfo.mockResolvedValue(mockRemedyInfo);

      const result = await tool.execute({ remedy: 'ACON.' });

      expect(result.id).toBe(1);
    });

    it('execute when remedy has partial match then returns info', async () => {
      const mockRemedyInfo = {
        id: 1,
        nameAbbrev: 'Acon.',
        nameLong: 'Aconitum napellus',
        nameAlt: [],
      };
      mockClient.getRemedyInfo.mockResolvedValue(mockRemedyInfo);

      const result = await tool.execute({ remedy: 'aconit' });

      expect(result.id).toBe(1);
    });

    it('execute when partial match less than 3 chars then requires exact match', async () => {
      mockClient.getRemedyInfo.mockResolvedValue(null);

      await expect(tool.execute({ remedy: 'ac' })).rejects.toThrow();
    });

    it('execute when remedy not found then throws error', async () => {
      mockClient.getRemedyInfo.mockResolvedValue(null);

      await expect(tool.execute({ remedy: 'NonExistent' })).rejects.toThrow();
    });

    it('execute when invalid remedy name then throws ValidationError', async () => {
      await expect(tool.execute({ remedy: '' })).rejects.toThrow();
    });

    it('execute when remedy name too long then throws ValidationError', async () => {
      const longName = 'a'.repeat(101);

      await expect(tool.execute({ remedy: longName })).rejects.toThrow();
    });

    it('execute when remedy has invalid characters then throws ValidationError', async () => {
      await expect(tool.execute({ remedy: 'Test@Remedy' })).rejects.toThrow();
    });

    it('execute when remedy has no alternative names then nameAlt is undefined', async () => {
      const mockRemedyInfo = {
        id: 1,
        nameAbbrev: 'Test',
        nameLong: 'Test Remedy',
      };
      mockClient.getRemedyInfo.mockResolvedValue(mockRemedyInfo);

      const result = await tool.execute({ remedy: 'Test' });

      expect(result.nameAlt).toBeUndefined();
    });

    it('execute when invalid arguments then sanitizes error', async () => {
      await expect(tool.execute({ invalid: 'field' })).rejects.toThrow();
    });

    it('execute when API error then sanitizes error', async () => {
      mockClient.getRemedyInfo.mockRejectedValue(new Error('API Error'));

      await expect(tool.execute({ remedy: 'Test' })).rejects.toThrow();
    });
  });
});

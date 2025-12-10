/**
 * Unit tests for repertories-list resource
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  repertoriesListDefinition,
  fetchRepertoriesList,
  type ResourceContent,
} from './repertories-list.js';
import { RESOURCE_URIS, MIME_TYPES } from '../sdk/constants.js';
import type { OOREPClient } from '../lib/oorep-client.js';

describe('repertoriesListDefinition', () => {
  it('when accessed then has correct URI', () => {
    expect(repertoriesListDefinition.uri).toBe(RESOURCE_URIS.REPERTORIES_LIST);
    expect(repertoriesListDefinition.uri).toBe('oorep://repertories/list');
  });

  it('when accessed then has correct name', () => {
    expect(repertoriesListDefinition.name).toBe('Available Repertories List');
  });

  it('when accessed then has correct mimeType', () => {
    expect(repertoriesListDefinition.mimeType).toBe(MIME_TYPES.JSON);
    expect(repertoriesListDefinition.mimeType).toBe('application/json');
  });

  it('when accessed then has non-empty description', () => {
    expect(repertoriesListDefinition.description).toBeTruthy();
    expect(repertoriesListDefinition.description.length).toBeGreaterThan(20);
  });

  it('when accessed then description mentions repertories', () => {
    expect(repertoriesListDefinition.description.toLowerCase()).toContain('repertories');
  });
});

describe('fetchRepertoriesList', () => {
  let mockClient: OOREPClient;
  let mockGetAvailableRepertories: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockGetAvailableRepertories = vi.fn();
    mockClient = {
      getAvailableRepertories: mockGetAvailableRepertories,
    } as unknown as OOREPClient;
  });

  it('when called then returns correct URI', async () => {
    mockGetAvailableRepertories.mockResolvedValue([]);

    const result = await fetchRepertoriesList(mockClient);

    expect(result.uri).toBe(RESOURCE_URIS.REPERTORIES_LIST);
  });

  it('when called then returns correct mimeType', async () => {
    mockGetAvailableRepertories.mockResolvedValue([]);

    const result = await fetchRepertoriesList(mockClient);

    expect(result.mimeType).toBe(MIME_TYPES.JSON);
  });

  it('when client returns repertories then formats as JSON', async () => {
    const mockRepertories = [
      { abbreviation: 'kent', title: 'Kent Repertory', language: 'en' },
      { abbreviation: 'publicum', title: 'Repertorium Publicum', language: 'en' },
    ];
    mockGetAvailableRepertories.mockResolvedValue(mockRepertories);

    const result = await fetchRepertoriesList(mockClient);

    expect(JSON.parse(result.text)).toEqual(mockRepertories);
  });

  it('when called then formats JSON with indentation', async () => {
    const mockRepertories = [{ abbreviation: 'kent', title: 'Kent Repertory' }];
    mockGetAvailableRepertories.mockResolvedValue(mockRepertories);

    const result = await fetchRepertoriesList(mockClient);

    expect(result.text).toContain('\n');
    expect(result.text).toContain('  ');
  });

  it('when client returns empty array then returns empty JSON array', async () => {
    mockGetAvailableRepertories.mockResolvedValue([]);

    const result = await fetchRepertoriesList(mockClient);

    expect(JSON.parse(result.text)).toEqual([]);
  });

  it('when called then calls client.getAvailableRepertories', async () => {
    mockGetAvailableRepertories.mockResolvedValue([]);

    await fetchRepertoriesList(mockClient);

    expect(mockGetAvailableRepertories).toHaveBeenCalledTimes(1);
  });

  it('when client throws error then propagates error', async () => {
    mockGetAvailableRepertories.mockRejectedValue(new Error('API Error'));

    await expect(fetchRepertoriesList(mockClient)).rejects.toThrow('API Error');
  });

  it('when client returns repertories with metadata then all fields are preserved', async () => {
    const mockRepertories = [
      {
        abbreviation: 'kent',
        title: 'Kent Repertory',
        language: 'en',
        author: 'J.T. Kent',
        year: 1897,
        rubricCount: 10000,
      },
    ];
    mockGetAvailableRepertories.mockResolvedValue(mockRepertories);

    const result = await fetchRepertoriesList(mockClient);
    const parsed = JSON.parse(result.text);

    expect(parsed[0].author).toBe('J.T. Kent');
    expect(parsed[0].year).toBe(1897);
    expect(parsed[0].rubricCount).toBe(10000);
  });
});

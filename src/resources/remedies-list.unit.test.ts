/**
 * Unit tests for remedies-list resource
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  remediesListDefinition,
  fetchRemediesList,
  type ResourceContent,
} from './remedies-list.js';
import { RESOURCE_URIS, MIME_TYPES } from '../sdk/constants.js';
import type { OOREPClient } from '../lib/oorep-client.js';

describe('remediesListDefinition', () => {
  it('when accessed then has correct URI', () => {
    expect(remediesListDefinition.uri).toBe(RESOURCE_URIS.REMEDIES_LIST);
    expect(remediesListDefinition.uri).toBe('oorep://remedies/list');
  });

  it('when accessed then has correct name', () => {
    expect(remediesListDefinition.name).toBe('Available Remedies List');
  });

  it('when accessed then has correct mimeType', () => {
    expect(remediesListDefinition.mimeType).toBe(MIME_TYPES.JSON);
    expect(remediesListDefinition.mimeType).toBe('application/json');
  });

  it('when accessed then has non-empty description', () => {
    expect(remediesListDefinition.description).toBeTruthy();
    expect(remediesListDefinition.description.length).toBeGreaterThan(20);
  });

  it('when accessed then description mentions remedies', () => {
    expect(remediesListDefinition.description.toLowerCase()).toContain('remedies');
  });
});

describe('fetchRemediesList', () => {
  let mockClient: OOREPClient;
  let mockGetAvailableRemedies: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockGetAvailableRemedies = vi.fn();
    mockClient = {
      getAvailableRemedies: mockGetAvailableRemedies,
    } as unknown as OOREPClient;
  });

  it('when called then returns correct URI', async () => {
    mockGetAvailableRemedies.mockResolvedValue([]);

    const result = await fetchRemediesList(mockClient);

    expect(result.uri).toBe(RESOURCE_URIS.REMEDIES_LIST);
  });

  it('when called then returns correct mimeType', async () => {
    mockGetAvailableRemedies.mockResolvedValue([]);

    const result = await fetchRemediesList(mockClient);

    expect(result.mimeType).toBe(MIME_TYPES.JSON);
  });

  it('when client returns remedies then formats as JSON', async () => {
    const mockRemedies = [
      { id: 1, nameAbbrev: 'Acon.', nameLong: 'Aconitum napellus', namealt: ['Aconite'] },
      { id: 2, nameAbbrev: 'Bell.', nameLong: 'Belladonna', namealt: [] },
    ];
    mockGetAvailableRemedies.mockResolvedValue(mockRemedies);

    const result = await fetchRemediesList(mockClient);

    expect(JSON.parse(result.text)).toEqual(mockRemedies);
  });

  it('when called then formats JSON with indentation', async () => {
    const mockRemedies = [{ id: 1, nameAbbrev: 'Acon.', nameLong: 'Aconitum napellus' }];
    mockGetAvailableRemedies.mockResolvedValue(mockRemedies);

    const result = await fetchRemediesList(mockClient);

    expect(result.text).toContain('\n');
    expect(result.text).toContain('  ');
  });

  it('when client returns empty array then returns empty JSON array', async () => {
    mockGetAvailableRemedies.mockResolvedValue([]);

    const result = await fetchRemediesList(mockClient);

    expect(JSON.parse(result.text)).toEqual([]);
  });

  it('when called then calls client.getAvailableRemedies', async () => {
    mockGetAvailableRemedies.mockResolvedValue([]);

    await fetchRemediesList(mockClient);

    expect(mockGetAvailableRemedies).toHaveBeenCalledTimes(1);
  });

  it('when client throws error then propagates error', async () => {
    mockGetAvailableRemedies.mockRejectedValue(new Error('API Error'));

    await expect(fetchRemediesList(mockClient)).rejects.toThrow('API Error');
  });

  it('when client returns many remedies then all are included', async () => {
    const mockRemedies = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      nameAbbrev: `Rem${i}.`,
      nameLong: `Remedy ${i}`,
      namealt: [],
    }));
    mockGetAvailableRemedies.mockResolvedValue(mockRemedies);

    const result = await fetchRemediesList(mockClient);

    expect(JSON.parse(result.text)).toHaveLength(100);
  });
});

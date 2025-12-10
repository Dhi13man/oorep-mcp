/**
 * Unit tests for materia-medicas-list resource
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  materiaMedicasListDefinition,
  fetchMateriaMedicasList,
  type ResourceContent,
} from './materia-medicas-list.js';
import { RESOURCE_URIS, MIME_TYPES } from '../sdk/constants.js';
import type { OOREPClient } from '../lib/oorep-client.js';

describe('materiaMedicasListDefinition', () => {
  it('when accessed then has correct URI', () => {
    expect(materiaMedicasListDefinition.uri).toBe(RESOURCE_URIS.MATERIA_MEDICAS_LIST);
    expect(materiaMedicasListDefinition.uri).toBe('oorep://materia-medicas/list');
  });

  it('when accessed then has correct name', () => {
    expect(materiaMedicasListDefinition.name).toBe('Available Materia Medicas List');
  });

  it('when accessed then has correct mimeType', () => {
    expect(materiaMedicasListDefinition.mimeType).toBe(MIME_TYPES.JSON);
    expect(materiaMedicasListDefinition.mimeType).toBe('application/json');
  });

  it('when accessed then has non-empty description', () => {
    expect(materiaMedicasListDefinition.description).toBeTruthy();
    expect(materiaMedicasListDefinition.description.length).toBeGreaterThan(20);
  });

  it('when accessed then description mentions materia medica', () => {
    expect(materiaMedicasListDefinition.description.toLowerCase()).toContain('materia medica');
  });
});

describe('fetchMateriaMedicasList', () => {
  let mockClient: OOREPClient;
  let mockGetAvailableMateriaMedicas: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockGetAvailableMateriaMedicas = vi.fn();
    mockClient = {
      getAvailableMateriaMedicas: mockGetAvailableMateriaMedicas,
    } as unknown as OOREPClient;
  });

  it('when called then returns correct URI', async () => {
    mockGetAvailableMateriaMedicas.mockResolvedValue([]);

    const result = await fetchMateriaMedicasList(mockClient);

    expect(result.uri).toBe(RESOURCE_URIS.MATERIA_MEDICAS_LIST);
  });

  it('when called then returns correct mimeType', async () => {
    mockGetAvailableMateriaMedicas.mockResolvedValue([]);

    const result = await fetchMateriaMedicasList(mockClient);

    expect(result.mimeType).toBe(MIME_TYPES.JSON);
  });

  it('when client returns materia medicas then formats as JSON', async () => {
    const mockMateriaMedicas = [
      { abbreviation: 'boericke', title: 'Boericke Materia Medica', language: 'en' },
      { abbreviation: 'hering', title: 'Guiding Symptoms', language: 'en' },
    ];
    mockGetAvailableMateriaMedicas.mockResolvedValue(mockMateriaMedicas);

    const result = await fetchMateriaMedicasList(mockClient);

    expect(JSON.parse(result.text)).toEqual(mockMateriaMedicas);
  });

  it('when called then formats JSON with indentation', async () => {
    const mockMateriaMedicas = [{ abbreviation: 'boericke', title: 'Boericke Materia Medica' }];
    mockGetAvailableMateriaMedicas.mockResolvedValue(mockMateriaMedicas);

    const result = await fetchMateriaMedicasList(mockClient);

    expect(result.text).toContain('\n');
    expect(result.text).toContain('  ');
  });

  it('when client returns empty array then returns empty JSON array', async () => {
    mockGetAvailableMateriaMedicas.mockResolvedValue([]);

    const result = await fetchMateriaMedicasList(mockClient);

    expect(JSON.parse(result.text)).toEqual([]);
  });

  it('when called then calls client.getAvailableMateriaMedicas', async () => {
    mockGetAvailableMateriaMedicas.mockResolvedValue([]);

    await fetchMateriaMedicasList(mockClient);

    expect(mockGetAvailableMateriaMedicas).toHaveBeenCalledTimes(1);
  });

  it('when client throws error then propagates error', async () => {
    mockGetAvailableMateriaMedicas.mockRejectedValue(new Error('API Error'));

    await expect(fetchMateriaMedicasList(mockClient)).rejects.toThrow('API Error');
  });

  it('when client returns materia medicas with metadata then all fields are preserved', async () => {
    const mockMateriaMedicas = [
      {
        abbreviation: 'boericke',
        title: 'Boericke Materia Medica',
        language: 'en',
        author: 'W. Boericke',
        year: 1927,
        remedyCount: 500,
      },
    ];
    mockGetAvailableMateriaMedicas.mockResolvedValue(mockMateriaMedicas);

    const result = await fetchMateriaMedicasList(mockClient);
    const parsed = JSON.parse(result.text);

    expect(parsed[0].author).toBe('W. Boericke');
    expect(parsed[0].year).toBe(1927);
    expect(parsed[0].remedyCount).toBe(500);
  });
});

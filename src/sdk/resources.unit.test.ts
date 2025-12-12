/**
 * Unit tests for SDK resource functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listResources, getResource, getSearchSyntaxHelp } from './resources.js';

// Mock client for dynamic resources
const mockGetAvailableRemedies = vi.fn();
const mockGetAvailableRepertories = vi.fn();
const mockGetAvailableMateriaMedicas = vi.fn();

const mockOOREPClient = {
  getAvailableRemedies: mockGetAvailableRemedies,
  getAvailableRepertories: mockGetAvailableRepertories,
  getAvailableMateriaMedicas: mockGetAvailableMateriaMedicas,
};

describe('listResources', () => {
  it('returns all available resource definitions', () => {
    const resources = listResources();

    expect(resources).toHaveLength(4);
    expect(resources.map((r) => r.uri)).toContain('oorep://remedies/list');
    expect(resources.map((r) => r.uri)).toContain('oorep://repertories/list');
    expect(resources.map((r) => r.uri)).toContain('oorep://materia-medicas/list');
    expect(resources.map((r) => r.uri)).toContain('oorep://help/search-syntax');
  });

  it('includes metadata for each resource', () => {
    const resources = listResources();
    const searchSyntax = resources.find((r) => r.uri === 'oorep://help/search-syntax');

    expect(searchSyntax).toBeDefined();
    expect(searchSyntax!.name).toBe('OOREP Search Syntax Help');
    expect(searchSyntax!.mimeType).toBe('text/markdown');
    expect(searchSyntax!.description).toContain('search syntax');
  });
});

describe('getResource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns search syntax help resource without client', async () => {
    const result = await getResource('oorep://help/search-syntax');

    expect(result.uri).toBe('oorep://help/search-syntax');
    expect(result.mimeType).toBe('text/markdown');
    expect(result.text).toContain('# OOREP Search Syntax Guide');
    expect(result.text).toContain('Wildcards');
  });

  it('returns remedies list resource with client', async () => {
    mockGetAvailableRemedies.mockResolvedValue([
      { id: 1, nameAbbrev: 'Acon.', nameLong: 'Aconitum napellus', namealt: [] },
      { id: 2, nameAbbrev: 'Bell.', nameLong: 'Belladonna', namealt: [] },
    ]);

    const result = await getResource('oorep://remedies/list', mockOOREPClient as any);

    expect(result.uri).toBe('oorep://remedies/list');
    expect(result.mimeType).toBe('application/json');
    expect(JSON.parse(result.text)).toHaveLength(2);
  });

  it('returns repertories list resource with client', async () => {
    mockGetAvailableRepertories.mockResolvedValue([
      { abbreviation: 'kent', title: 'Kent', language: 'en', author: 'Kent' },
    ]);

    const result = await getResource('oorep://repertories/list', mockOOREPClient as any);

    expect(result.uri).toBe('oorep://repertories/list');
    expect(result.mimeType).toBe('application/json');
    expect(JSON.parse(result.text)).toHaveLength(1);
  });

  it('returns materia medicas list resource with client', async () => {
    mockGetAvailableMateriaMedicas.mockResolvedValue([
      { abbreviation: 'boericke', title: 'Boericke', language: 'en', author: 'Boericke' },
    ]);

    const result = await getResource('oorep://materia-medicas/list', mockOOREPClient as any);

    expect(result.uri).toBe('oorep://materia-medicas/list');
    expect(result.mimeType).toBe('application/json');
    expect(JSON.parse(result.text)).toHaveLength(1);
  });

  it('throws error when client required but not provided', async () => {
    await expect(getResource('oorep://remedies/list')).rejects.toThrow('OOREPHttpClient is required');
  });
});

describe('getSearchSyntaxHelp', () => {
  it('returns markdown text directly', () => {
    const result = getSearchSyntaxHelp();

    expect(typeof result).toBe('string');
    expect(result).toContain('# OOREP Search Syntax Guide');
  });
});

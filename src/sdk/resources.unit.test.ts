/**
 * Unit tests for OOREP SDK Resource Definitions
 */

import { describe, it, expect } from 'vitest';
import {
  resourceDefinitions,
  getResourceDefinition,
  getResourceUris,
  RESOURCE_URIS,
  type OOREPResourceDefinition,
} from './resources.js';

describe('resourceDefinitions', () => {
  it('when accessed then contains all four resources', () => {
    // Assert
    expect(resourceDefinitions).toHaveLength(4);
  });

  it.each([
    RESOURCE_URIS.REMEDIES_LIST,
    RESOURCE_URIS.REPERTORIES_LIST,
    RESOURCE_URIS.MATERIA_MEDICAS_LIST,
    RESOURCE_URIS.SEARCH_SYNTAX_HELP,
  ])('when accessed then contains resource %s', (uri) => {
    // Act
    const resource = resourceDefinitions.find((r) => r.uri === uri);

    // Assert
    expect(resource).toBeDefined();
  });

  describe('resource structure validation', () => {
    it.each(resourceDefinitions.map((r) => [r.uri, r]))(
      'when resource %s then has required fields',
      (_uri, resource) => {
        // Assert
        expect(resource.uri).toBeDefined();
        expect(typeof resource.uri).toBe('string');
        expect(resource.name).toBeDefined();
        expect(typeof resource.name).toBe('string');
        expect(resource.description).toBeDefined();
        expect(typeof resource.description).toBe('string');
        expect(resource.mimeType).toBeDefined();
        expect(typeof resource.mimeType).toBe('string');
      }
    );
  });

  describe('remedies list resource', () => {
    const resource = resourceDefinitions.find((r) => r.uri === RESOURCE_URIS.REMEDIES_LIST)!;

    it('when accessed then has correct URI', () => {
      // Assert
      expect(resource.uri).toBe('oorep://remedies/list');
    });

    it('when accessed then has JSON mime type', () => {
      // Assert
      expect(resource.mimeType).toBe('application/json');
    });

    it('when accessed then has descriptive name', () => {
      // Assert
      expect(resource.name).toContain('Remedies');
    });
  });

  describe('repertories list resource', () => {
    const resource = resourceDefinitions.find((r) => r.uri === RESOURCE_URIS.REPERTORIES_LIST)!;

    it('when accessed then has correct URI', () => {
      // Assert
      expect(resource.uri).toBe('oorep://repertories/list');
    });

    it('when accessed then has JSON mime type', () => {
      // Assert
      expect(resource.mimeType).toBe('application/json');
    });
  });

  describe('materia medicas list resource', () => {
    const resource = resourceDefinitions.find((r) => r.uri === RESOURCE_URIS.MATERIA_MEDICAS_LIST)!;

    it('when accessed then has correct URI', () => {
      // Assert
      expect(resource.uri).toBe('oorep://materia-medicas/list');
    });

    it('when accessed then has JSON mime type', () => {
      // Assert
      expect(resource.mimeType).toBe('application/json');
    });
  });

  describe('search syntax help resource', () => {
    const resource = resourceDefinitions.find((r) => r.uri === RESOURCE_URIS.SEARCH_SYNTAX_HELP)!;

    it('when accessed then has correct URI', () => {
      // Assert
      expect(resource.uri).toBe('oorep://help/search-syntax');
    });

    it('when accessed then has markdown mime type', () => {
      // Assert
      expect(resource.mimeType).toBe('text/markdown');
    });
  });
});

describe('getResourceDefinition', () => {
  it.each([
    RESOURCE_URIS.REMEDIES_LIST,
    RESOURCE_URIS.REPERTORIES_LIST,
    RESOURCE_URIS.MATERIA_MEDICAS_LIST,
    RESOURCE_URIS.SEARCH_SYNTAX_HELP,
  ])('when valid URI %s then returns resource definition', (uri) => {
    // Act
    const resource = getResourceDefinition(uri);

    // Assert
    expect(resource).toBeDefined();
    expect(resource?.uri).toBe(uri);
  });

  it('when unknown URI then returns undefined', () => {
    // Act
    const resource = getResourceDefinition('oorep://nonexistent/resource');

    // Assert
    expect(resource).toBeUndefined();
  });

  it('when valid URI then returns complete definition', () => {
    // Act
    const resource = getResourceDefinition(RESOURCE_URIS.REMEDIES_LIST);

    // Assert
    expect(resource).toMatchObject<Partial<OOREPResourceDefinition>>({
      uri: RESOURCE_URIS.REMEDIES_LIST,
      name: expect.any(String),
      description: expect.any(String),
      mimeType: expect.any(String),
    });
  });
});

describe('getResourceUris', () => {
  it('when called then returns array of all resource URIs', () => {
    // Act
    const uris = getResourceUris();

    // Assert
    expect(uris).toHaveLength(4);
    expect(uris).toContain(RESOURCE_URIS.REMEDIES_LIST);
    expect(uris).toContain(RESOURCE_URIS.REPERTORIES_LIST);
    expect(uris).toContain(RESOURCE_URIS.MATERIA_MEDICAS_LIST);
    expect(uris).toContain(RESOURCE_URIS.SEARCH_SYNTAX_HELP);
  });

  it('when called then returns strings only', () => {
    // Act
    const uris = getResourceUris();

    // Assert
    uris.forEach((uri) => {
      expect(typeof uri).toBe('string');
    });
  });

  it('when called then returns unique URIs', () => {
    // Act
    const uris = getResourceUris();
    const uniqueUris = new Set(uris);

    // Assert
    expect(uniqueUris.size).toBe(uris.length);
  });

  it('when called then all URIs follow oorep:// protocol', () => {
    // Act
    const uris = getResourceUris();

    // Assert
    uris.forEach((uri) => {
      expect(uri).toMatch(/^oorep:\/\//);
    });
  });
});

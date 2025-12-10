/**
 * Unit tests for search-syntax-help resource
 */

import { describe, it, expect } from 'vitest';
import {
  searchSyntaxHelpDefinition,
  getSearchSyntaxHelp,
  type ResourceContent,
  type ResourceDefinition,
} from './search-syntax-help.js';
import { RESOURCE_URIS, MIME_TYPES } from '../sdk/constants.js';

describe('searchSyntaxHelpDefinition', () => {
  it('when accessed then has correct URI', () => {
    expect(searchSyntaxHelpDefinition.uri).toBe(RESOURCE_URIS.SEARCH_SYNTAX_HELP);
    expect(searchSyntaxHelpDefinition.uri).toBe('oorep://help/search-syntax');
  });

  it('when accessed then has correct name', () => {
    expect(searchSyntaxHelpDefinition.name).toBe('OOREP Search Syntax Help');
  });

  it('when accessed then has correct mimeType', () => {
    expect(searchSyntaxHelpDefinition.mimeType).toBe(MIME_TYPES.MARKDOWN);
    expect(searchSyntaxHelpDefinition.mimeType).toBe('text/markdown');
  });

  it('when accessed then has non-empty description', () => {
    expect(searchSyntaxHelpDefinition.description).toBeTruthy();
    expect(searchSyntaxHelpDefinition.description.length).toBeGreaterThan(20);
  });

  it('when accessed then description mentions search syntax', () => {
    expect(searchSyntaxHelpDefinition.description.toLowerCase()).toContain('search');
    expect(searchSyntaxHelpDefinition.description.toLowerCase()).toContain('syntax');
  });
});

describe('getSearchSyntaxHelp', () => {
  let result: ResourceContent;

  beforeEach(() => {
    result = getSearchSyntaxHelp();
  });

  it('when called then returns correct URI', () => {
    expect(result.uri).toBe(RESOURCE_URIS.SEARCH_SYNTAX_HELP);
  });

  it('when called then returns correct mimeType', () => {
    expect(result.mimeType).toBe(MIME_TYPES.MARKDOWN);
  });

  it('when called then returns non-empty text', () => {
    expect(result.text).toBeTruthy();
    expect(result.text.length).toBeGreaterThan(100);
  });

  describe('content sections', () => {
    it('when called then includes title header', () => {
      expect(result.text).toContain('# OOREP Search Syntax Guide');
    });

    it('when called then includes basic search section', () => {
      expect(result.text).toContain('## Basic Search');
    });

    it('when called then includes wildcards section', () => {
      expect(result.text).toContain('## Wildcards');
      expect(result.text).toContain('asterisk');
      expect(result.text).toContain('*');
    });

    it('when called then includes exclusions section', () => {
      expect(result.text).toContain('## Exclusions');
      expect(result.text).toContain('minus sign');
      expect(result.text).toContain('-');
    });

    it('when called then includes exact phrases section', () => {
      expect(result.text).toContain('## Exact Phrases');
      expect(result.text).toContain('quotation marks');
    });

    it('when called then includes combining techniques section', () => {
      expect(result.text).toContain('## Combining Techniques');
    });

    it('when called then includes examples section', () => {
      expect(result.text).toContain('## Examples');
    });

    it('when called then includes tips section', () => {
      expect(result.text).toContain('## Tips');
    });

    it('when called then includes practitioner disclaimer', () => {
      expect(result.text.toLowerCase()).toContain('practitioner');
    });
  });

  describe('example searches', () => {
    it('when called then includes headache example', () => {
      expect(result.text.toLowerCase()).toContain('headache');
    });

    it('when called then includes modality examples', () => {
      expect(result.text).toContain('worse from cold');
      expect(result.text).toContain('better from motion');
    });

    it('when called then includes wildcard example', () => {
      expect(result.text).toMatch(/head\*/);
    });

    it('when called then includes exclusion example', () => {
      expect(result.text).toMatch(/-\w+/);
    });
  });

  it('when called multiple times then returns same content', () => {
    const result1 = getSearchSyntaxHelp();
    const result2 = getSearchSyntaxHelp();

    expect(result1.text).toBe(result2.text);
    expect(result1.uri).toBe(result2.uri);
    expect(result1.mimeType).toBe(result2.mimeType);
  });
});

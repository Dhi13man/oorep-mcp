/**
 * Unit tests for search-syntax-help resource
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { searchSyntaxHelpDefinition, getSearchSyntaxHelp } from './search-syntax-help.js';
import type { ResourceContent } from './remedies-list.js';
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
      expect(result.text).toContain('# OOREP Search Guide');
    });

    it('when called then includes how search works section', () => {
      expect(result.text).toContain('## How Search Works');
      expect(result.text).toContain('AND Logic');
    });

    it('when called then includes modality section with agg/amel', () => {
      expect(result.text).toContain('agg');
      expect(result.text).toContain('amel');
      expect(result.text).toContain('NOT worse/better');
    });

    it('when called then includes wildcards section', () => {
      expect(result.text).toContain('## Wildcards');
      expect(result.text).toContain('*');
    });

    it('when called then includes vocabulary mapping section', () => {
      expect(result.text).toContain('## Vocabulary Mapping');
      expect(result.text).toContain('Natural Language');
    });

    it('when called then includes query construction section', () => {
      expect(result.text).toContain('## Query Construction');
      expect(result.text).toContain('Golden Rules');
    });

    it('when called then includes recovery section', () => {
      expect(result.text).toContain('## Recovery');
    });

    it('when called then includes quick reference section', () => {
      expect(result.text).toContain('## Quick Reference');
    });
  });

  describe('example searches', () => {
    it('when called then includes what works examples', () => {
      expect(result.text).toContain('What Works');
      expect(result.text).toContain('anticip*');
    });

    it('when called then includes what fails examples', () => {
      expect(result.text).toContain('What Fails');
    });

    it('when called then includes wildcard example', () => {
      expect(result.text).toMatch(/head\*/);
    });

    it('when called then includes exclusion syntax', () => {
      expect(result.text).toContain('Exclusions');
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

/**
 * Unit tests for data formatting utilities
 */

import { describe, it, expect } from 'vitest';
import {
  formatRepertoryResults,
  formatMateriaMedicaResults,
  generateCacheKey,
  truncate,
  formatList,
} from './data-formatter.js';

describe('formatRepertoryResults', () => {
  it('formatRepertoryResults when null response then returns empty result', () => {
    const result = formatRepertoryResults(null);

    expect(result.totalResults).toBe(0);
    expect(result.rubrics).toEqual([]);
    expect(result.remedyStats).toEqual([]);
  });

  it('formatRepertoryResults when valid response then formats correctly', () => {
    const mockApiResponse = {
      totalNumberOfResults: 10,
      results: [
        {
          rubric: { fullPath: 'Head, pain', textt: null },
          repertoryAbbrev: 'kent',
          weightedRemedies: [
            {
              remedy: { nameAbbrev: 'Acon.', nameLong: 'Aconitum napellus' },
              weight: 3,
            },
          ],
        },
      ],
    };

    const result = formatRepertoryResults(mockApiResponse);

    expect(result.totalResults).toBe(10);
    expect(result.rubrics).toHaveLength(1);
    expect(result.rubrics[0].rubric).toBe('Head, pain');
    expect(result.rubrics[0].repertory).toBe('kent');
    expect(result.rubrics[0].remedies[0].name).toBe('Aconitum napellus');
  });

  it('formatRepertoryResults when rubric has textt but no fullPath then uses textt', () => {
    const mockApiResponse = {
      totalNumberOfResults: 1,
      results: [
        {
          rubric: { fullPath: undefined, textt: 'Head, pain, general' },
          repertoryAbbrev: 'kent',
          weightedRemedies: [],
        },
      ],
    };

    const result = formatRepertoryResults(mockApiResponse);

    expect(result.rubrics[0].rubric).toBe('Head, pain, general');
  });

  it('formatRepertoryResults when rubric has neither fullPath nor textt then uses fallback', () => {
    const mockApiResponse = {
      totalNumberOfResults: 1,
      results: [
        {
          rubric: { fullPath: null, textt: null },
          repertoryAbbrev: 'kent',
          weightedRemedies: [],
        },
      ],
    };

    const result = formatRepertoryResults(mockApiResponse);

    expect(result.rubrics[0].rubric).toBe('Untitled rubric');
  });

  it('formatRepertoryResults when remedy has no nameLong then uses nameAbbrev', () => {
    const mockApiResponse = {
      totalNumberOfResults: 1,
      results: [
        {
          rubric: { fullPath: 'Test' },
          repertoryAbbrev: 'kent',
          weightedRemedies: [
            {
              remedy: { nameAbbrev: 'Acon.', nameLong: '' },
              weight: 2,
            },
          ],
        },
      ],
    };

    const result = formatRepertoryResults(mockApiResponse);

    expect(result.rubrics[0].remedies[0].name).toBe('Acon.');
  });

  it('formatRepertoryResults when maxResults specified then limits results', () => {
    const mockApiResponse = {
      totalNumberOfResults: 10,
      results: Array.from({ length: 10 }, (_, i) => ({
        rubric: { fullPath: `Rubric ${i}` },
        repertoryAbbrev: 'kent',
        weightedRemedies: [],
      })),
    };

    const result = formatRepertoryResults(mockApiResponse, { maxResults: 5 });

    expect(result.rubrics).toHaveLength(5);
  });

  it('formatRepertoryResults when includeRemedyStats false then no stats', () => {
    const mockApiResponse = {
      totalNumberOfResults: 1,
      results: [
        {
          rubric: { fullPath: 'Test' },
          repertoryAbbrev: 'kent',
          weightedRemedies: [
            {
              remedy: { nameAbbrev: 'Acon.', nameLong: 'Aconitum' },
              weight: 3,
            },
          ],
        },
      ],
    };

    const result = formatRepertoryResults(mockApiResponse, { includeRemedyStats: false });

    expect(result.remedyStats).toBeUndefined();
  });

  it('formatRepertoryResults when includeRemedyStats true then generates stats', () => {
    const mockApiResponse = {
      totalNumberOfResults: 2,
      results: [
        {
          rubric: { fullPath: 'Rubric 1' },
          repertoryAbbrev: 'kent',
          weightedRemedies: [
            {
              remedy: { nameAbbrev: 'Acon.', nameLong: 'Aconitum' },
              weight: 3,
            },
            {
              remedy: { nameAbbrev: 'Bell.', nameLong: 'Belladonna' },
              weight: 2,
            },
          ],
        },
        {
          rubric: { fullPath: 'Rubric 2' },
          repertoryAbbrev: 'kent',
          weightedRemedies: [
            {
              remedy: { nameAbbrev: 'Acon.', nameLong: 'Aconitum' },
              weight: 2,
            },
          ],
        },
      ],
    };

    const result = formatRepertoryResults(mockApiResponse, { includeRemedyStats: true });

    expect(result.remedyStats).toBeDefined();
    expect(result.remedyStats).toHaveLength(2);
    expect(result.remedyStats![0].name).toBe('Aconitum');
    expect(result.remedyStats![0].count).toBe(2);
    expect(result.remedyStats![0].cumulativeWeight).toBe(5);
  });

  it('formatRepertoryResults when remedies appear in multiple rubrics then aggregates correctly', () => {
    const mockApiResponse = {
      totalNumberOfResults: 3,
      results: [
        {
          rubric: { fullPath: 'R1' },
          repertoryAbbrev: 'kent',
          weightedRemedies: [
            {
              remedy: { nameAbbrev: 'Acon.', nameLong: 'Aconitum' },
              weight: 3,
            },
          ],
        },
        {
          rubric: { fullPath: 'R2' },
          repertoryAbbrev: 'kent',
          weightedRemedies: [
            {
              remedy: { nameAbbrev: 'Acon.', nameLong: 'Aconitum' },
              weight: 2,
            },
          ],
        },
        {
          rubric: { fullPath: 'R3' },
          repertoryAbbrev: 'kent',
          weightedRemedies: [
            {
              remedy: { nameAbbrev: 'Acon.', nameLong: 'Aconitum' },
              weight: 4,
            },
          ],
        },
      ],
    };

    const result = formatRepertoryResults(mockApiResponse);

    expect(result.remedyStats![0].count).toBe(3);
    expect(result.remedyStats![0].cumulativeWeight).toBe(9);
  });

  it('formatRepertoryResults when remedyStats then sorted by cumulative weight', () => {
    const mockApiResponse = {
      totalNumberOfResults: 1,
      results: [
        {
          rubric: { fullPath: 'R1' },
          repertoryAbbrev: 'kent',
          weightedRemedies: [
            { remedy: { nameAbbrev: 'A', nameLong: 'RemedyA' }, weight: 1 },
            { remedy: { nameAbbrev: 'B', nameLong: 'RemedyB' }, weight: 3 },
            { remedy: { nameAbbrev: 'C', nameLong: 'RemedyC' }, weight: 2 },
          ],
        },
      ],
    };

    const result = formatRepertoryResults(mockApiResponse);

    expect(result.remedyStats![0].name).toBe('RemedyB');
    expect(result.remedyStats![1].name).toBe('RemedyC');
    expect(result.remedyStats![2].name).toBe('RemedyA');
  });

  it('formatRepertoryResults when same cumulative weight then sorted by count', () => {
    const mockApiResponse = {
      totalNumberOfResults: 2,
      results: [
        {
          rubric: { fullPath: 'R1' },
          repertoryAbbrev: 'kent',
          weightedRemedies: [
            { remedy: { nameAbbrev: 'A', nameLong: 'RemedyA' }, weight: 3 },
            { remedy: { nameAbbrev: 'B', nameLong: 'RemedyB' }, weight: 1 },
          ],
        },
        {
          rubric: { fullPath: 'R2' },
          repertoryAbbrev: 'kent',
          weightedRemedies: [{ remedy: { nameAbbrev: 'B', nameLong: 'RemedyB' }, weight: 2 }],
        },
      ],
    };

    const result = formatRepertoryResults(mockApiResponse);

    expect(result.remedyStats![0].name).toBe('RemedyB');
    expect(result.remedyStats![0].count).toBe(2);
    expect(result.remedyStats![1].count).toBe(1);
  });
});

describe('formatMateriaMedicaResults', () => {
  it('formatMateriaMedicaResults when null response then returns empty result', () => {
    const result = formatMateriaMedicaResults(null);

    expect(result.totalResults).toBe(0);
    expect(result.results).toEqual([]);
  });

  it('formatMateriaMedicaResults when valid response then formats correctly', () => {
    const mockApiResponse = {
      results: [
        {
          abbrev: 'boericke',
          remedy_id: 1,
          remedy_fullname: 'Aconitum napellus',
          result_sections: [
            {
              heading: 'Mental',
              content: 'Anxiety and fear',
              depth: 1,
            },
          ],
        },
      ],
      numberOfMatchingSectionsPerChapter: [{ hits: 5, remedyId: 1 }],
    };

    const result = formatMateriaMedicaResults(mockApiResponse);

    expect(result.totalResults).toBe(5);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].remedy).toBe('Aconitum napellus');
    expect(result.results[0].remedyId).toBe(1);
    expect(result.results[0].materiamedica).toBe('boericke');
    expect(result.results[0].hitCount).toBe(5);
  });

  it('formatMateriaMedicaResults when section has null fields then converts to defaults', () => {
    const mockApiResponse = {
      results: [
        {
          abbrev: 'boericke',
          remedy_id: 1,
          remedy_fullname: 'Aconitum',
          result_sections: [
            {
              heading: null,
              content: null,
              depth: null,
            },
          ],
        },
      ],
      numberOfMatchingSectionsPerChapter: [],
    };

    const result = formatMateriaMedicaResults(mockApiResponse);

    expect(result.results[0].sections[0].heading).toBeUndefined();
    expect(result.results[0].sections[0].content).toBe('');
    expect(result.results[0].sections[0].depth).toBe(0);
  });

  it('formatMateriaMedicaResults when maxResults specified then limits results', () => {
    const mockApiResponse = {
      results: Array.from({ length: 10 }, (_, i) => ({
        abbrev: 'boericke',
        remedy_id: i,
        remedy_fullname: `Remedy ${i}`,
        result_sections: [],
      })),
      numberOfMatchingSectionsPerChapter: [],
    };

    const result = formatMateriaMedicaResults(mockApiResponse, 5);

    expect(result.results).toHaveLength(5);
  });

  it('formatMateriaMedicaResults when no hit count for remedy then uses section length', () => {
    const mockApiResponse = {
      results: [
        {
          abbrev: 'boericke',
          remedy_id: 1,
          remedy_fullname: 'Aconitum',
          result_sections: [
            { content: 'Section 1' },
            { content: 'Section 2' },
            { content: 'Section 3' },
          ],
        },
      ],
      numberOfMatchingSectionsPerChapter: [],
    };

    const result = formatMateriaMedicaResults(mockApiResponse);

    expect(result.results[0].hitCount).toBe(3);
  });

  it('formatMateriaMedicaResults when totalResults calculates sum of hits', () => {
    const mockApiResponse = {
      results: [],
      numberOfMatchingSectionsPerChapter: [
        { hits: 5, remedyId: 1 },
        { hits: 3, remedyId: 2 },
        { hits: 7, remedyId: 3 },
      ],
    };

    const result = formatMateriaMedicaResults(mockApiResponse);

    expect(result.totalResults).toBe(15);
  });
});

describe('generateCacheKey', () => {
  it('generateCacheKey when simple params then generates key', () => {
    const key = generateCacheKey('test', { param1: 'value1', param2: 'value2' });

    expect(key).toContain('test:');
    expect(key).toContain('param1=value1');
    expect(key).toContain('param2=value2');
  });

  it('generateCacheKey when params have different types then converts to string', () => {
    const key = generateCacheKey('test', {
      string: 'text',
      number: 42,
      boolean: true,
    });

    expect(key).toContain('string=text');
    expect(key).toContain('number=42');
    expect(key).toContain('boolean=true');
  });

  it('generateCacheKey when param is undefined then includes it', () => {
    const key = generateCacheKey('test', { param: undefined });

    expect(key).toContain('param=undefined');
  });

  it('generateCacheKey when params in different order then generates same key', () => {
    const key1 = generateCacheKey('test', { a: '1', b: '2', c: '3' });
    const key2 = generateCacheKey('test', { c: '3', a: '1', b: '2' });

    expect(key1).toBe(key2);
  });

  it('generateCacheKey when no params then only includes prefix', () => {
    const key = generateCacheKey('test', {});

    expect(key).toBe('test:');
  });

  it('generateCacheKey when different prefixes then generates different keys', () => {
    const key1 = generateCacheKey('prefix1', { param: 'value' });
    const key2 = generateCacheKey('prefix2', { param: 'value' });

    expect(key1).not.toBe(key2);
  });
});

describe('truncate', () => {
  it('truncate when text is shorter than max then returns original', () => {
    const text = 'Short text';
    const result = truncate(text, 20);

    expect(result).toBe('Short text');
  });

  it('truncate when text equals max length then returns original', () => {
    const text = 'Exactly ten';
    const result = truncate(text, 11);

    expect(result).toBe('Exactly ten');
  });

  it('truncate when text is longer than max then truncates with ellipsis', () => {
    const text = 'This is a long text that should be truncated';
    const result = truncate(text, 20);

    expect(result).toBe('This is a long te...');
    expect(result.length).toBe(20);
  });

  it('truncate when max length is very small then still adds ellipsis', () => {
    const text = 'Hello';
    const result = truncate(text, 4);

    expect(result).toBe('H...');
  });

  it('truncate when max length is 3 then returns only ellipsis', () => {
    const text = 'Hello';
    const result = truncate(text, 3);

    expect(result).toBe('...');
  });
});

describe('formatList', () => {
  it('formatList when items array then formats with numbers', () => {
    const items = ['Item 1', 'Item 2', 'Item 3'];
    const result = formatList(items);

    expect(result).toBe('1. Item 1\n2. Item 2\n3. Item 3');
  });

  it('formatList when empty array then returns empty string', () => {
    const result = formatList([]);

    expect(result).toBe('');
  });

  it('formatList when single item then formats correctly', () => {
    const result = formatList(['Only item']);

    expect(result).toBe('1. Only item');
  });

  it('formatList when maxItems specified then limits items', () => {
    const items = ['A', 'B', 'C', 'D', 'E'];
    const result = formatList(items, 3);

    expect(result).toContain('1. A');
    expect(result).toContain('2. B');
    expect(result).toContain('3. C');
    expect(result).not.toContain('D');
    expect(result).not.toContain('E');
  });

  it('formatList when maxItems exceeded then adds continuation message', () => {
    const items = ['A', 'B', 'C', 'D', 'E'];
    const result = formatList(items, 3);

    expect(result).toContain('... and 2 more');
  });

  it('formatList when maxItems equals array length then no continuation', () => {
    const items = ['A', 'B', 'C'];
    const result = formatList(items, 3);

    expect(result).not.toContain('more');
  });

  it('formatList when maxItems greater than array length then shows all', () => {
    const items = ['A', 'B'];
    const result = formatList(items, 5);

    expect(result).toBe('1. A\n2. B');
  });
});

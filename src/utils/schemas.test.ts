/**
 * Unit tests for Zod schemas
 */

import { describe, it, expect } from 'vitest';
import {
  SearchRepertoryArgsSchema,
  SearchMateriaMedicaArgsSchema,
  GetRemedyInfoArgsSchema,
  ListRepertoriesArgsSchema,
  ListMateriaMedicasArgsSchema,
  RemedySchema,
  RubricSchema,
  RepertorySearchResultSchema,
  MateriaMedicaSectionSchema,
  MateriaMedicaResultSchema,
  MateriaMedicaSearchResultSchema,
  RepertoryMetadataSchema,
  MateriaMedicaMetadataSchema,
  RemedyInfoSchema,
} from './schemas.js';

describe('SearchRepertoryArgsSchema', () => {
  it('SearchRepertoryArgsSchema when valid minimal input then parses successfully', () => {
    const input = { symptom: 'headache' };
    const result = SearchRepertoryArgsSchema.parse(input);

    expect(result.symptom).toBe('headache');
    expect(result.maxResults).toBe(20);
    expect(result.includeRemedyStats).toBe(true);
  });

  it('SearchRepertoryArgsSchema when valid full input then parses successfully', () => {
    const input = {
      symptom: 'headache worse night',
      repertory: 'kent',
      minWeight: 3,
      maxResults: 50,
      includeRemedyStats: false,
    };
    const result = SearchRepertoryArgsSchema.parse(input);

    expect(result.symptom).toBe('headache worse night');
    expect(result.repertory).toBe('kent');
    expect(result.minWeight).toBe(3);
    expect(result.maxResults).toBe(50);
    expect(result.includeRemedyStats).toBe(false);
  });

  it('SearchRepertoryArgsSchema when symptom has whitespace then trims it', () => {
    const input = { symptom: '  headache  ' };
    const result = SearchRepertoryArgsSchema.parse(input);

    expect(result.symptom).toBe('headache');
  });

  it('SearchRepertoryArgsSchema when symptom is too short then throws error', () => {
    const input = { symptom: 'ab' };

    expect(() => SearchRepertoryArgsSchema.parse(input)).toThrow();
  });

  it('SearchRepertoryArgsSchema when symptom is too long then throws error', () => {
    const input = { symptom: 'a'.repeat(201) };

    expect(() => SearchRepertoryArgsSchema.parse(input)).toThrow();
  });

  it('SearchRepertoryArgsSchema when symptom has invalid characters then throws error', () => {
    const input = { symptom: 'head@ache' };

    expect(() => SearchRepertoryArgsSchema.parse(input)).toThrow();
  });

  it('SearchRepertoryArgsSchema when wildcard in middle of word then throws error', () => {
    const input = { symptom: 'he*d' };

    expect(() => SearchRepertoryArgsSchema.parse(input)).toThrow();
  });

  it('SearchRepertoryArgsSchema when minWeight is out of range then throws error', () => {
    const input1 = { symptom: 'headache', minWeight: 0 };
    const input2 = { symptom: 'headache', minWeight: 5 };

    expect(() => SearchRepertoryArgsSchema.parse(input1)).toThrow();
    expect(() => SearchRepertoryArgsSchema.parse(input2)).toThrow();
  });

  it('SearchRepertoryArgsSchema when maxResults is out of range then throws error', () => {
    const input1 = { symptom: 'headache', maxResults: 0 };
    const input2 = { symptom: 'headache', maxResults: 101 };

    expect(() => SearchRepertoryArgsSchema.parse(input1)).toThrow();
    expect(() => SearchRepertoryArgsSchema.parse(input2)).toThrow();
  });
});

describe('SearchMateriaMedicaArgsSchema', () => {
  it('SearchMateriaMedicaArgsSchema when valid minimal input then parses successfully', () => {
    const input = { symptom: 'fever' };
    const result = SearchMateriaMedicaArgsSchema.parse(input);

    expect(result.symptom).toBe('fever');
    expect(result.maxResults).toBe(10);
  });

  it('SearchMateriaMedicaArgsSchema when valid full input then parses successfully', () => {
    const input = {
      symptom: 'anxiety',
      materiamedica: 'boericke',
      remedy: 'Aconite',
      maxResults: 25,
    };
    const result = SearchMateriaMedicaArgsSchema.parse(input);

    expect(result.symptom).toBe('anxiety');
    expect(result.materiamedica).toBe('boericke');
    expect(result.remedy).toBe('Aconite');
    expect(result.maxResults).toBe(25);
  });

  it('SearchMateriaMedicaArgsSchema when symptom has whitespace then trims it', () => {
    const input = { symptom: '  fever  ' };
    const result = SearchMateriaMedicaArgsSchema.parse(input);

    expect(result.symptom).toBe('fever');
  });

  it('SearchMateriaMedicaArgsSchema when maxResults is out of range then throws error', () => {
    const input1 = { symptom: 'fever', maxResults: 0 };
    const input2 = { symptom: 'fever', maxResults: 51 };

    expect(() => SearchMateriaMedicaArgsSchema.parse(input1)).toThrow();
    expect(() => SearchMateriaMedicaArgsSchema.parse(input2)).toThrow();
  });
});

describe('GetRemedyInfoArgsSchema', () => {
  it('GetRemedyInfoArgsSchema when valid input then parses successfully', () => {
    const input = { remedy: 'Aconite' };
    const result = GetRemedyInfoArgsSchema.parse(input);

    expect(result.remedy).toBe('Aconite');
  });

  it('GetRemedyInfoArgsSchema when remedy is empty then throws error', () => {
    const input = { remedy: '' };

    expect(() => GetRemedyInfoArgsSchema.parse(input)).toThrow();
  });
});

describe('ListRepertoriesArgsSchema', () => {
  it('ListRepertoriesArgsSchema when no language then parses successfully', () => {
    const input = {};
    const result = ListRepertoriesArgsSchema.parse(input);

    expect(result.language).toBeUndefined();
  });

  it('ListRepertoriesArgsSchema when language provided then parses successfully', () => {
    const input = { language: 'en' };
    const result = ListRepertoriesArgsSchema.parse(input);

    expect(result.language).toBe('en');
  });
});

describe('ListMateriaMedicasArgsSchema', () => {
  it('ListMateriaMedicasArgsSchema when no language then parses successfully', () => {
    const input = {};
    const result = ListMateriaMedicasArgsSchema.parse(input);

    expect(result.language).toBeUndefined();
  });

  it('ListMateriaMedicasArgsSchema when language provided then parses successfully', () => {
    const input = { language: 'de' };
    const result = ListMateriaMedicasArgsSchema.parse(input);

    expect(result.language).toBe('de');
  });
});

describe('RemedySchema', () => {
  it('RemedySchema when valid input then parses successfully', () => {
    const input = {
      name: 'Aconitum napellus',
      abbreviation: 'Acon.',
      weight: 3,
    };
    const result = RemedySchema.parse(input);

    expect(result.name).toBe('Aconitum napellus');
    expect(result.abbreviation).toBe('Acon.');
    expect(result.weight).toBe(3);
  });
});

describe('RubricSchema', () => {
  it('RubricSchema when valid input then parses successfully', () => {
    const input = {
      rubric: 'Head, pain, general',
      repertory: 'kent',
      remedies: [{ name: 'Aconite', abbreviation: 'Acon.', weight: 3 }],
    };
    const result = RubricSchema.parse(input);

    expect(result.rubric).toBe('Head, pain, general');
    expect(result.repertory).toBe('kent');
    expect(result.remedies).toHaveLength(1);
  });

  it('RubricSchema when optional fields provided then parses successfully', () => {
    const input = {
      rubric: 'Head, pain',
      repertory: 'kent',
      weight: 2,
      label: 'important',
      remedies: [],
    };
    const result = RubricSchema.parse(input);

    expect(result.weight).toBe(2);
    expect(result.label).toBe('important');
  });
});

describe('RepertorySearchResultSchema', () => {
  it('RepertorySearchResultSchema when valid input then parses successfully', () => {
    const input = {
      totalResults: 42,
      rubrics: [],
    };
    const result = RepertorySearchResultSchema.parse(input);

    expect(result.totalResults).toBe(42);
    expect(result.rubrics).toEqual([]);
  });

  it('RepertorySearchResultSchema when optional fields provided then parses successfully', () => {
    const input = {
      totalResults: 100,
      totalPages: 10,
      currentPage: 1,
      rubrics: [],
      remedyStats: [{ name: 'Aconite', count: 5, cumulativeWeight: 15 }],
    };
    const result = RepertorySearchResultSchema.parse(input);

    expect(result.totalPages).toBe(10);
    expect(result.currentPage).toBe(1);
    expect(result.remedyStats).toHaveLength(1);
  });
});

describe('MateriaMedicaSectionSchema', () => {
  it('MateriaMedicaSectionSchema when minimal input then parses successfully', () => {
    const input = {
      content: 'Anxiety and fear',
    };
    const result = MateriaMedicaSectionSchema.parse(input);

    expect(result.content).toBe('Anxiety and fear');
    expect(result.heading).toBeUndefined();
    expect(result.depth).toBeUndefined();
  });

  it('MateriaMedicaSectionSchema when full input then parses successfully', () => {
    const input = {
      heading: 'Mental Symptoms',
      content: 'Great anxiety',
      depth: 2,
    };
    const result = MateriaMedicaSectionSchema.parse(input);

    expect(result.heading).toBe('Mental Symptoms');
    expect(result.content).toBe('Great anxiety');
    expect(result.depth).toBe(2);
  });
});

describe('MateriaMedicaResultSchema', () => {
  it('MateriaMedicaResultSchema when minimal input then parses successfully', () => {
    const input = {
      remedy: 'Aconite',
      materiamedica: 'boericke',
      sections: [{ content: 'Test content' }],
    };
    const result = MateriaMedicaResultSchema.parse(input);

    expect(result.remedy).toBe('Aconite');
    expect(result.materiamedica).toBe('boericke');
    expect(result.sections).toHaveLength(1);
  });

  it('MateriaMedicaResultSchema when full input then parses successfully', () => {
    const input = {
      remedy: 'Aconite',
      remedyId: 123,
      materiamedica: 'boericke',
      sections: [],
      hitCount: 5,
    };
    const result = MateriaMedicaResultSchema.parse(input);

    expect(result.remedyId).toBe(123);
    expect(result.hitCount).toBe(5);
  });
});

describe('MateriaMedicaSearchResultSchema', () => {
  it('MateriaMedicaSearchResultSchema when valid input then parses successfully', () => {
    const input = {
      totalResults: 10,
      results: [],
    };
    const result = MateriaMedicaSearchResultSchema.parse(input);

    expect(result.totalResults).toBe(10);
    expect(result.results).toEqual([]);
  });
});

describe('RepertoryMetadataSchema', () => {
  it('RepertoryMetadataSchema when minimal input then parses successfully', () => {
    const input = {
      abbreviation: 'kent',
      title: 'Repertory of the Homeopathic Materia Medica',
    };
    const result = RepertoryMetadataSchema.parse(input);

    expect(result.abbreviation).toBe('kent');
    expect(result.title).toBe('Repertory of the Homeopathic Materia Medica');
  });

  it('RepertoryMetadataSchema when full input then parses successfully', () => {
    const input = {
      abbreviation: 'kent',
      title: 'Repertory',
      author: 'James Tyler Kent',
      year: 1905,
      language: 'en',
      edition: '6th',
      publisher: 'Test Publisher',
      license: 'Public Domain',
      remedyCount: 1500,
    };
    const result = RepertoryMetadataSchema.parse(input);

    expect(result.author).toBe('James Tyler Kent');
    expect(result.year).toBe(1905);
    expect(result.language).toBe('en');
    expect(result.edition).toBe('6th');
    expect(result.publisher).toBe('Test Publisher');
    expect(result.license).toBe('Public Domain');
    expect(result.remedyCount).toBe(1500);
  });
});

describe('MateriaMedicaMetadataSchema', () => {
  it('MateriaMedicaMetadataSchema when minimal input then parses successfully', () => {
    const input = {
      abbreviation: 'boericke',
      title: 'Materia Medica with Repertory',
    };
    const result = MateriaMedicaMetadataSchema.parse(input);

    expect(result.abbreviation).toBe('boericke');
    expect(result.title).toBe('Materia Medica with Repertory');
  });

  it('MateriaMedicaMetadataSchema when full input then parses successfully', () => {
    const input = {
      abbreviation: 'boericke',
      title: 'Materia Medica',
      author: 'William Boericke',
      year: 1927,
      language: 'en',
      edition: '9th',
      publisher: 'Test Publisher',
      license: 'Public Domain',
    };
    const result = MateriaMedicaMetadataSchema.parse(input);

    expect(result.author).toBe('William Boericke');
    expect(result.year).toBe(1927);
    expect(result.language).toBe('en');
    expect(result.edition).toBe('9th');
    expect(result.publisher).toBe('Test Publisher');
    expect(result.license).toBe('Public Domain');
  });
});

describe('RemedyInfoSchema', () => {
  it('RemedyInfoSchema when minimal input then parses successfully', () => {
    const input = {
      id: 42,
      nameAbbrev: 'Acon.',
      nameLong: 'Aconitum napellus',
    };
    const result = RemedyInfoSchema.parse(input);

    expect(result.id).toBe(42);
    expect(result.nameAbbrev).toBe('Acon.');
    expect(result.nameLong).toBe('Aconitum napellus');
    expect(result.nameAlt).toBeUndefined();
  });

  it('RemedyInfoSchema when nameAlt provided then parses successfully', () => {
    const input = {
      id: 42,
      nameAbbrev: 'Acon.',
      nameLong: 'Aconitum napellus',
      nameAlt: ['Monkshood', 'Wolfsbane'],
    };
    const result = RemedyInfoSchema.parse(input);

    expect(result.nameAlt).toEqual(['Monkshood', 'Wolfsbane']);
  });
});

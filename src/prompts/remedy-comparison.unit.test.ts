/**
 * Unit tests for remedy-comparison prompt
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  remedyComparisonDefinition,
  buildRemedyComparisonPrompt,
  type RemedyComparisonArgs,
  type PromptResult,
} from './remedy-comparison.js';
import { PROMPT_NAMES, TOOL_NAMES } from '../sdk/constants.js';
import type { ILogger } from '../interfaces/ILogger.js';

describe('remedyComparisonDefinition', () => {
  it('when accessed then has correct name', () => {
    expect(remedyComparisonDefinition.name).toBe(PROMPT_NAMES.REMEDY_COMPARISON);
    expect(remedyComparisonDefinition.name).toBe('remedy-comparison');
  });

  it('when accessed then has non-empty description', () => {
    expect(remedyComparisonDefinition.description).toBeTruthy();
    expect(remedyComparisonDefinition.description.length).toBeGreaterThan(20);
  });

  it('when accessed then description mentions comparison', () => {
    expect(remedyComparisonDefinition.description.toLowerCase()).toContain('compare');
  });

  it('when accessed then has arguments array', () => {
    expect(Array.isArray(remedyComparisonDefinition.arguments)).toBe(true);
    expect(remedyComparisonDefinition.arguments).toHaveLength(1);
  });

  it('when accessed then has remedies argument', () => {
    const arg = remedyComparisonDefinition.arguments?.[0];
    expect(arg?.name).toBe('remedies');
    expect(arg?.required).toBe(true);
    expect(arg?.description).toBeTruthy();
  });
});

describe('buildRemedyComparisonPrompt', () => {
  let mockLogger: ILogger;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
  });

  describe('validation', () => {
    it('when empty remedies then throws error', () => {
      const args: RemedyComparisonArgs = { remedies: '' };

      expect(() => buildRemedyComparisonPrompt(args)).toThrow('At least 2 remedies');
    });

    it('when single remedy then throws error', () => {
      const args: RemedyComparisonArgs = { remedies: 'Aconite' };

      expect(() => buildRemedyComparisonPrompt(args)).toThrow('At least 2 remedies');
    });

    it('when whitespace only remedies then throws error', () => {
      const args: RemedyComparisonArgs = { remedies: '   ,   ' };

      expect(() => buildRemedyComparisonPrompt(args)).toThrow('At least 2 remedies');
    });

    it('when two remedies then succeeds', () => {
      const args: RemedyComparisonArgs = { remedies: 'Aconite,Belladonna' };

      const result = buildRemedyComparisonPrompt(args);

      expect(result).toBeDefined();
      expect(result.name).toBe(PROMPT_NAMES.REMEDY_COMPARISON);
    });
  });

  describe('remedy parsing', () => {
    it('when two remedies then both included', () => {
      const args: RemedyComparisonArgs = { remedies: 'Aconite,Belladonna' };

      const result = buildRemedyComparisonPrompt(args);

      expect(result.messages[0].content.text).toContain('Aconite');
      expect(result.messages[0].content.text).toContain('Belladonna');
    });

    it('when remedies with whitespace then trims', () => {
      const args: RemedyComparisonArgs = { remedies: '  Aconite  ,  Belladonna  ' };

      const result = buildRemedyComparisonPrompt(args);

      expect(result.messages[0].content.text).toContain('Aconite, Belladonna');
    });

    it('when three remedies then all included', () => {
      const args: RemedyComparisonArgs = { remedies: 'Aconite,Belladonna,Gelsemium' };

      const result = buildRemedyComparisonPrompt(args);

      expect(result.messages[0].content.text).toContain('Aconite');
      expect(result.messages[0].content.text).toContain('Belladonna');
      expect(result.messages[0].content.text).toContain('Gelsemium');
    });
  });

  describe('remedy limit', () => {
    it('when more than 6 remedies then limits to 6', () => {
      const args: RemedyComparisonArgs = { remedies: 'A,B,C,D,E,F,G,H' };

      const result = buildRemedyComparisonPrompt(args, mockLogger);

      // Should only include first 6
      expect(result.messages[0].content.text).toContain('A, B, C, D, E, F');
      expect(result.messages[0].content.text).not.toContain(', G');
      expect(result.messages[0].content.text).not.toContain(', H');
    });

    it('when more than 6 remedies then logs warning', () => {
      const args: RemedyComparisonArgs = { remedies: 'A,B,C,D,E,F,G,H' };

      buildRemedyComparisonPrompt(args, mockLogger);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Limiting remedy comparison to 6 remedies')
      );
    });

    it('when exactly 6 remedies then all included', () => {
      const args: RemedyComparisonArgs = { remedies: 'A,B,C,D,E,F' };

      const result = buildRemedyComparisonPrompt(args, mockLogger);

      expect(result.messages[0].content.text).toContain('A, B, C, D, E, F');
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('prompt structure', () => {
    let result: PromptResult;

    beforeEach(() => {
      result = buildRemedyComparisonPrompt({ remedies: 'Aconite,Belladonna' });
    });

    it('when called then returns correct name', () => {
      expect(result.name).toBe(PROMPT_NAMES.REMEDY_COMPARISON);
    });

    it('when called then returns non-empty description', () => {
      expect(result.description).toBeTruthy();
    });

    it('when called then returns single message', () => {
      expect(result.messages).toHaveLength(1);
    });

    it('when called then message has user role', () => {
      expect(result.messages[0].role).toBe('user');
    });

    it('when called then message content has text type', () => {
      expect(result.messages[0].content.type).toBe('text');
    });
  });

  describe('comparison table', () => {
    it('when called then includes table structure', () => {
      const result = buildRemedyComparisonPrompt({ remedies: 'Aconite,Belladonna' });
      const text = result.messages[0].content.text;

      expect(text).toContain('|');
      expect(text).toContain('Aspect');
    });

    it('when called then includes key comparison aspects', () => {
      const result = buildRemedyComparisonPrompt({ remedies: 'Aconite,Belladonna' });
      const text = result.messages[0].content.text;

      expect(text).toContain('Mental');
      expect(text).toContain('Physical');
      expect(text).toContain('Better From');
      expect(text).toContain('Worse From');
    });
  });

  describe('workflow steps', () => {
    let text: string;

    beforeEach(() => {
      const result = buildRemedyComparisonPrompt({ remedies: 'Aconite,Belladonna' });
      text = result.messages[0].content.text;
    });

    it('when called then includes get basic information step', () => {
      expect(text).toContain('Get Basic Information');
    });

    it('when called then includes search materia medica step', () => {
      expect(text).toContain('Search Materia Medica');
    });

    it('when called then includes create comparison table step', () => {
      expect(text).toContain('Create Comparison Table');
    });

    it('when called then includes analysis step', () => {
      expect(text).toContain('Analysis');
    });

    it('when called then includes summary step', () => {
      expect(text).toContain('Summary');
    });
  });

  describe('tool references', () => {
    let text: string;

    beforeEach(() => {
      const result = buildRemedyComparisonPrompt({ remedies: 'Aconite,Belladonna' });
      text = result.messages[0].content.text;
    });

    it('when called then references get_remedy_info tool', () => {
      expect(text).toContain(TOOL_NAMES.GET_REMEDY_INFO);
    });

    it('when called then references search_materia_medica tool', () => {
      expect(text).toContain(TOOL_NAMES.SEARCH_MATERIA_MEDICA);
    });
  });

  describe('disclaimer', () => {
    it('when called then includes educational disclaimer', () => {
      const result = buildRemedyComparisonPrompt({ remedies: 'Aconite,Belladonna' });
      const text = result.messages[0].content.text.toLowerCase();

      expect(text).toContain('educational');
    });

    it('when called then mentions practitioner', () => {
      const result = buildRemedyComparisonPrompt({ remedies: 'Aconite,Belladonna' });
      const text = result.messages[0].content.text.toLowerCase();

      expect(text).toContain('practitioner');
    });
  });

  it('when no logger provided then still works', () => {
    const args: RemedyComparisonArgs = { remedies: 'Aconite,Belladonna' };

    const result = buildRemedyComparisonPrompt(args);

    expect(result).toBeDefined();
  });
});

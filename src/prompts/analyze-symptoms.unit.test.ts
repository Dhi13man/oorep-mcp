/**
 * Unit tests for analyze-symptoms prompt
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeSymptomsDefinition,
  buildAnalyzeSymptomsPrompt,
  type AnalyzeSymptomsArgs,
  type PromptResult,
} from './analyze-symptoms.js';
import { PROMPT_NAMES, TOOL_NAMES } from '../sdk/constants.js';

describe('analyzeSymptomsDefinition', () => {
  it('when accessed then has correct name', () => {
    expect(analyzeSymptomsDefinition.name).toBe(PROMPT_NAMES.ANALYZE_SYMPTOMS);
    expect(analyzeSymptomsDefinition.name).toBe('analyze-symptoms');
  });

  it('when accessed then has non-empty description', () => {
    expect(analyzeSymptomsDefinition.description).toBeTruthy();
    expect(analyzeSymptomsDefinition.description.length).toBeGreaterThan(20);
  });

  it('when accessed then description mentions symptom analysis', () => {
    expect(analyzeSymptomsDefinition.description.toLowerCase()).toContain('symptom');
    expect(analyzeSymptomsDefinition.description.toLowerCase()).toContain('analysis');
  });

  it('when accessed then has arguments array', () => {
    expect(Array.isArray(analyzeSymptomsDefinition.arguments)).toBe(true);
    expect(analyzeSymptomsDefinition.arguments).toHaveLength(1);
  });

  it('when accessed then has symptom_description argument', () => {
    const arg = analyzeSymptomsDefinition.arguments?.[0];
    expect(arg?.name).toBe('symptom_description');
    expect(arg?.required).toBe(false);
    expect(arg?.description).toBeTruthy();
  });
});

describe('buildAnalyzeSymptomsPrompt', () => {
  describe('without args', () => {
    let result: PromptResult;

    beforeEach(() => {
      result = buildAnalyzeSymptomsPrompt();
    });

    it('when called then returns correct name', () => {
      expect(result.name).toBe(PROMPT_NAMES.ANALYZE_SYMPTOMS);
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

    it('when called then message content is non-empty', () => {
      expect(result.messages[0].content.text).toBeTruthy();
      expect(result.messages[0].content.text.length).toBeGreaterThan(100);
    });

    it('when called then does not include initial symptom text', () => {
      expect(result.messages[0].content.text).not.toContain('Initial symptom:');
    });
  });

  describe('with symptom_description', () => {
    it('when symptom provided then includes in message', () => {
      const args: AnalyzeSymptomsArgs = { symptom_description: 'headache worse at night' };

      const result = buildAnalyzeSymptomsPrompt(args);

      expect(result.messages[0].content.text).toContain('Initial symptom:');
      expect(result.messages[0].content.text).toContain('headache worse at night');
    });

    it('when symptom provided then includes analysis instruction', () => {
      const args: AnalyzeSymptomsArgs = { symptom_description: 'test symptom' };

      const result = buildAnalyzeSymptomsPrompt(args);

      expect(result.messages[0].content.text).toContain('analyze this symptom');
    });

    it('when empty symptom provided then does not include initial symptom', () => {
      const args: AnalyzeSymptomsArgs = { symptom_description: '' };

      const result = buildAnalyzeSymptomsPrompt(args);

      expect(result.messages[0].content.text).not.toContain('Initial symptom:');
    });

    it('when undefined args then does not include initial symptom', () => {
      const result = buildAnalyzeSymptomsPrompt(undefined);

      expect(result.messages[0].content.text).not.toContain('Initial symptom:');
    });
  });

  describe('workflow steps', () => {
    let text: string;

    beforeEach(() => {
      const result = buildAnalyzeSymptomsPrompt();
      text = result.messages[0].content.text;
    });

    it('when called then includes gather complaint step', () => {
      expect(text).toContain('Gather Chief Complaint');
    });

    it('when called then includes search repertory step', () => {
      expect(text).toContain('Search Repertory');
    });

    it('when called then includes modalities step', () => {
      expect(text).toContain('Modalities');
    });

    it('when called then includes refine search step', () => {
      expect(text).toContain('Refine Search');
    });

    it('when called then includes present remedies step', () => {
      expect(text).toContain('Present Top Remedies');
    });

    it('when called then includes detailed information step', () => {
      expect(text).toContain('Detailed Information');
    });

    it('when called then includes important reminders', () => {
      expect(text).toContain('Important Reminders');
    });
  });

  describe('tool references', () => {
    let text: string;

    beforeEach(() => {
      const result = buildAnalyzeSymptomsPrompt();
      text = result.messages[0].content.text;
    });

    it('when called then references search_repertory tool', () => {
      expect(text).toContain(TOOL_NAMES.SEARCH_REPERTORY);
    });

    it('when called then references get_remedy_info tool', () => {
      expect(text).toContain(TOOL_NAMES.GET_REMEDY_INFO);
    });

    it('when called then references search_materia_medica tool', () => {
      expect(text).toContain(TOOL_NAMES.SEARCH_MATERIA_MEDICA);
    });
  });

  describe('practitioner disclaimer', () => {
    it('when called then includes practitioner recommendation', () => {
      const result = buildAnalyzeSymptomsPrompt();
      const text = result.messages[0].content.text.toLowerCase();

      expect(text).toContain('practitioner');
    });

    it('when called then mentions informational purpose', () => {
      const result = buildAnalyzeSymptomsPrompt();
      const text = result.messages[0].content.text.toLowerCase();

      expect(text).toContain('informational');
    });
  });

  it('when called multiple times then returns same structure', () => {
    const result1 = buildAnalyzeSymptomsPrompt();
    const result2 = buildAnalyzeSymptomsPrompt();

    expect(result1.name).toBe(result2.name);
    expect(result1.messages.length).toBe(result2.messages.length);
    expect(result1.messages[0].content.text).toBe(result2.messages[0].content.text);
  });
});

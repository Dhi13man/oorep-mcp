/**
 * Unit tests for repertorization-workflow prompt
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  repertorizationWorkflowDefinition,
  buildRepertorizationWorkflowPrompt,
  type PromptResult,
} from './repertorization-workflow.js';
import { PROMPT_NAMES, TOOL_NAMES } from '../sdk/constants.js';

describe('repertorizationWorkflowDefinition', () => {
  it('when accessed then has correct name', () => {
    expect(repertorizationWorkflowDefinition.name).toBe(PROMPT_NAMES.REPERTORIZATION_WORKFLOW);
    expect(repertorizationWorkflowDefinition.name).toBe('repertorization-workflow');
  });

  it('when accessed then has non-empty description', () => {
    expect(repertorizationWorkflowDefinition.description).toBeTruthy();
    expect(repertorizationWorkflowDefinition.description.length).toBeGreaterThan(20);
  });

  it('when accessed then description mentions repertorization', () => {
    expect(repertorizationWorkflowDefinition.description.toLowerCase()).toContain(
      'repertorization'
    );
  });

  it('when accessed then description mentions case taking', () => {
    expect(repertorizationWorkflowDefinition.description.toLowerCase()).toContain('case');
  });

  it('when accessed then has empty arguments array', () => {
    expect(Array.isArray(repertorizationWorkflowDefinition.arguments)).toBe(true);
    expect(repertorizationWorkflowDefinition.arguments).toHaveLength(0);
  });
});

describe('buildRepertorizationWorkflowPrompt', () => {
  let result: PromptResult;

  beforeEach(() => {
    result = buildRepertorizationWorkflowPrompt();
  });

  describe('prompt structure', () => {
    it('when called then returns correct name', () => {
      expect(result.name).toBe(PROMPT_NAMES.REPERTORIZATION_WORKFLOW);
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
      expect(result.messages[0].content.text.length).toBeGreaterThan(500);
    });
  });

  describe('workflow steps', () => {
    let text: string;

    beforeEach(() => {
      text = result.messages[0].content.text;
    });

    it('when called then includes step 1 chief complaint', () => {
      expect(text).toContain('STEP 1');
      expect(text).toContain('Chief Complaint');
    });

    it('when called then includes step 2 detailed symptom gathering', () => {
      expect(text).toContain('STEP 2');
      expect(text).toContain('Detailed Symptom Gathering');
    });

    it('when called then includes step 3 initial repertorization', () => {
      expect(text).toContain('STEP 3');
      expect(text).toContain('Initial Repertorization');
    });

    it('when called then includes step 4 cross-reference', () => {
      expect(text).toContain('STEP 4');
      expect(text).toContain('Cross-Reference');
    });

    it('when called then includes step 5 differentiation', () => {
      expect(text).toContain('STEP 5');
      expect(text).toContain('Differentiation');
    });

    it('when called then includes step 6 final remedy selection', () => {
      expect(text).toContain('STEP 6');
      expect(text).toContain('Final Remedy Selection');
    });

    it('when called then includes step 7 recommendations', () => {
      expect(text).toContain('STEP 7');
      expect(text).toContain('Recommendations');
    });
  });

  describe('symptom gathering details', () => {
    let text: string;

    beforeEach(() => {
      text = result.messages[0].content.text;
    });

    it('when called then includes location question', () => {
      expect(text).toContain('Location');
    });

    it('when called then includes sensation question', () => {
      expect(text).toContain('Sensation');
    });

    it('when called then includes modalities', () => {
      expect(text).toContain('Modalities');
      expect(text).toContain('BETTER');
      expect(text).toContain('WORSE');
    });

    it('when called then includes time question', () => {
      expect(text).toContain('Time');
    });

    it('when called then includes concomitants question', () => {
      expect(text).toContain('Concomitants');
    });
  });

  describe('tool references', () => {
    let text: string;

    beforeEach(() => {
      text = result.messages[0].content.text;
    });

    it('when called then references search_repertory tool', () => {
      expect(text).toContain(TOOL_NAMES.SEARCH_REPERTORY);
    });

    it('when called then references search_materia_medica tool', () => {
      expect(text).toContain(TOOL_NAMES.SEARCH_MATERIA_MEDICA);
    });

    it('when called then references get_remedy_info tool', () => {
      expect(text).toContain(TOOL_NAMES.GET_REMEDY_INFO);
    });
  });

  describe('guidelines', () => {
    let text: string;

    beforeEach(() => {
      text = result.messages[0].content.text;
    });

    it('when called then includes important guidelines section', () => {
      expect(text).toContain('Important Guidelines');
    });

    it('when called then mentions characteristic symptoms', () => {
      expect(text.toLowerCase()).toContain('characteristic');
    });

    it('when called then mentions totality', () => {
      expect(text.toLowerCase()).toContain('totality');
    });
  });

  describe('practitioner disclaimer', () => {
    let text: string;

    beforeEach(() => {
      text = result.messages[0].content.text.toLowerCase();
    });

    it('when called then mentions practitioner', () => {
      expect(text).toContain('practitioner');
    });

    it('when called then mentions educational', () => {
      expect(text).toContain('educational');
    });

    it('when called then mentions professional case management', () => {
      expect(text).toContain('professional');
    });
  });

  describe('differentiation questions', () => {
    let text: string;

    beforeEach(() => {
      text = result.messages[0].content.text;
    });

    it('when called then includes mental/emotional state', () => {
      expect(text).toContain('Mental');
      expect(text).toContain('emotional');
    });

    it('when called then includes general characteristics', () => {
      expect(text).toContain('hot/cold');
    });

    it('when called then includes sleep patterns', () => {
      expect(text).toContain('Sleep');
    });

    it('when called then includes food desires', () => {
      expect(text).toContain('Food');
    });
  });

  it('when called multiple times then returns same structure', () => {
    const result1 = buildRepertorizationWorkflowPrompt();
    const result2 = buildRepertorizationWorkflowPrompt();

    expect(result1.name).toBe(result2.name);
    expect(result1.messages.length).toBe(result2.messages.length);
    expect(result1.messages[0].content.text).toBe(result2.messages[0].content.text);
  });
});

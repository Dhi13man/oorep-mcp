/**
 * Unit tests for SDK prompt functions
 */

import { describe, it, expect } from 'vitest';
import { listPrompts, getPrompt } from './prompts.js';

describe('listPrompts', () => {
  it('returns all available prompt definitions', () => {
    const prompts = listPrompts();

    expect(prompts).toHaveLength(3);
    expect(prompts.map((p) => p.name)).toContain('analyze-symptoms');
    expect(prompts.map((p) => p.name)).toContain('remedy-comparison');
    expect(prompts.map((p) => p.name)).toContain('repertorization-workflow');
  });

  it('includes arguments metadata for each prompt', () => {
    const prompts = listPrompts();
    const comparison = prompts.find((p) => p.name === 'remedy-comparison');

    expect(comparison).toBeDefined();
    expect(comparison!.arguments).toHaveLength(1);
    expect(comparison!.arguments![0].name).toBe('remedies');
    expect(comparison!.arguments![0].required).toBe(true);
  });

  it('marks repertorization-workflow as having no arguments', () => {
    const prompts = listPrompts();
    const workflow = prompts.find((p) => p.name === 'repertorization-workflow');

    expect(workflow).toBeDefined();
    expect(workflow!.arguments).toHaveLength(0);
  });
});

describe('getPrompt', () => {
  it('returns analyze-symptoms prompt without args', () => {
    const result = getPrompt('analyze-symptoms');

    expect(result.name).toBe('analyze-symptoms');
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[0].content.text).toContain('Gather Chief Complaint');
    expect(result.messages[0].content.text).toContain('Search Repertory');
  });

  it('returns analyze-symptoms prompt with initial symptom', () => {
    const result = getPrompt('analyze-symptoms', {
      symptom_description: 'throbbing headache',
    });

    expect(result.messages[0].content.text).toContain('throbbing headache');
    expect(result.messages[0].content.text).toContain('Initial symptom:');
  });

  it('returns remedy-comparison prompt with remedies', () => {
    const result = getPrompt('remedy-comparison', {
      remedies: 'Aconite,Belladonna,Gelsemium',
    });

    expect(result.name).toBe('remedy-comparison');
    expect(result.messages[0].content.text).toContain('Aconite, Belladonna, Gelsemium');
    expect(result.messages[0].content.text).toContain('Comparison Table');
  });

  it('throws error for remedy-comparison without remedies', () => {
    expect(() => getPrompt('remedy-comparison', {} as any)).toThrow(
      'remedies argument is required'
    );
  });

  it('throws error for remedy-comparison with only one remedy', () => {
    expect(() => getPrompt('remedy-comparison', { remedies: 'Aconite' })).toThrow(
      'At least 2 remedies are required'
    );
  });

  it('returns repertorization-workflow prompt', () => {
    const result = getPrompt('repertorization-workflow');

    expect(result.name).toBe('repertorization-workflow');
    expect(result.messages[0].content.text).toContain('STEP 1: Chief Complaint');
    expect(result.messages[0].content.text).toContain('STEP 7: Recommendations');
    expect(result.messages[0].content.text).toContain('Detailed Symptom Gathering');
  });
});

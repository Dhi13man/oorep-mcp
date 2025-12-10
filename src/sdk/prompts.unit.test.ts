/**
 * Unit tests for OOREP SDK Prompt Definitions
 */

import { describe, it, expect } from 'vitest';
import {
  promptDefinitions,
  getPromptDefinition,
  getPromptNames,
  PROMPT_NAMES,
  type OOREPPromptDefinition,
} from './prompts.js';

describe('promptDefinitions', () => {
  it('when accessed then contains all three prompts', () => {
    // Assert
    expect(promptDefinitions).toHaveLength(3);
  });

  it.each([
    PROMPT_NAMES.ANALYZE_SYMPTOMS,
    PROMPT_NAMES.REMEDY_COMPARISON,
    PROMPT_NAMES.REPERTORIZATION_WORKFLOW,
  ])('when accessed then contains prompt %s', (name) => {
    // Act
    const prompt = promptDefinitions.find((p) => p.name === name);

    // Assert
    expect(prompt).toBeDefined();
  });

  describe('prompt structure validation', () => {
    it.each(promptDefinitions.map((p) => [p.name, p]))(
      'when prompt %s then has required fields',
      (_name, prompt) => {
        // Assert
        expect(prompt.name).toBeDefined();
        expect(typeof prompt.name).toBe('string');
        expect(prompt.description).toBeDefined();
        expect(typeof prompt.description).toBe('string');
        expect(prompt.arguments).toBeDefined();
        expect(Array.isArray(prompt.arguments)).toBe(true);
      }
    );

    it.each(promptDefinitions.map((p) => [p.name, p]))(
      'when prompt %s then arguments have correct structure',
      (_name, prompt) => {
        // Assert
        prompt.arguments.forEach((arg) => {
          expect(arg.name).toBeDefined();
          expect(typeof arg.name).toBe('string');
          expect(arg.description).toBeDefined();
          expect(typeof arg.description).toBe('string');
          expect(typeof arg.required).toBe('boolean');
        });
      }
    );
  });

  describe('analyze-symptoms prompt', () => {
    const prompt = promptDefinitions.find((p) => p.name === PROMPT_NAMES.ANALYZE_SYMPTOMS)!;

    it('when accessed then has correct name', () => {
      // Assert
      expect(prompt.name).toBe('analyze-symptoms');
    });

    it('when accessed then has one optional argument', () => {
      // Assert
      expect(prompt.arguments).toHaveLength(1);
      expect(prompt.arguments[0].name).toBe('symptom_description');
      expect(prompt.arguments[0].required).toBe(false);
    });

    it('when accessed then description mentions symptom analysis', () => {
      // Assert
      expect(prompt.description.toLowerCase()).toContain('symptom');
      expect(prompt.description.toLowerCase()).toContain('analysis');
    });
  });

  describe('remedy-comparison prompt', () => {
    const prompt = promptDefinitions.find((p) => p.name === PROMPT_NAMES.REMEDY_COMPARISON)!;

    it('when accessed then has correct name', () => {
      // Assert
      expect(prompt.name).toBe('remedy-comparison');
    });

    it('when accessed then has one required argument', () => {
      // Assert
      expect(prompt.arguments).toHaveLength(1);
      expect(prompt.arguments[0].name).toBe('remedies');
      expect(prompt.arguments[0].required).toBe(true);
    });

    it('when accessed then description mentions comparison', () => {
      // Assert
      expect(prompt.description.toLowerCase()).toContain('compare');
    });
  });

  describe('repertorization-workflow prompt', () => {
    const prompt = promptDefinitions.find((p) => p.name === PROMPT_NAMES.REPERTORIZATION_WORKFLOW)!;

    it('when accessed then has correct name', () => {
      // Assert
      expect(prompt.name).toBe('repertorization-workflow');
    });

    it('when accessed then has no arguments', () => {
      // Assert
      expect(prompt.arguments).toHaveLength(0);
    });

    it('when accessed then description mentions workflow', () => {
      // Assert
      expect(prompt.description.toLowerCase()).toContain('workflow');
    });
  });
});

describe('getPromptDefinition', () => {
  it.each([
    PROMPT_NAMES.ANALYZE_SYMPTOMS,
    PROMPT_NAMES.REMEDY_COMPARISON,
    PROMPT_NAMES.REPERTORIZATION_WORKFLOW,
  ])('when valid prompt name %s then returns prompt definition', (name) => {
    // Act
    const prompt = getPromptDefinition(name);

    // Assert
    expect(prompt).toBeDefined();
    expect(prompt?.name).toBe(name);
  });

  it('when unknown prompt name then returns undefined', () => {
    // Act
    const prompt = getPromptDefinition('nonexistent-prompt');

    // Assert
    expect(prompt).toBeUndefined();
  });

  it('when valid prompt name then returns complete definition', () => {
    // Act
    const prompt = getPromptDefinition(PROMPT_NAMES.ANALYZE_SYMPTOMS);

    // Assert
    expect(prompt).toMatchObject<Partial<OOREPPromptDefinition>>({
      name: PROMPT_NAMES.ANALYZE_SYMPTOMS,
      description: expect.any(String),
      arguments: expect.any(Array),
    });
  });
});

describe('getPromptNames', () => {
  it('when called then returns array of all prompt names', () => {
    // Act
    const names = getPromptNames();

    // Assert
    expect(names).toHaveLength(3);
    expect(names).toContain(PROMPT_NAMES.ANALYZE_SYMPTOMS);
    expect(names).toContain(PROMPT_NAMES.REMEDY_COMPARISON);
    expect(names).toContain(PROMPT_NAMES.REPERTORIZATION_WORKFLOW);
  });

  it('when called then returns strings only', () => {
    // Act
    const names = getPromptNames();

    // Assert
    names.forEach((name) => {
      expect(typeof name).toBe('string');
    });
  });

  it('when called then returns unique names', () => {
    // Act
    const names = getPromptNames();
    const uniqueNames = new Set(names);

    // Assert
    expect(uniqueNames.size).toBe(names.length);
  });

  it('when called then all names follow kebab-case convention', () => {
    // Act
    const names = getPromptNames();

    // Assert
    names.forEach((name) => {
      expect(name).toMatch(/^[a-z]+(-[a-z]+)*$/);
    });
  });
});

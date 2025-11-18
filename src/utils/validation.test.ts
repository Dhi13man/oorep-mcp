/**
 * Unit tests for input validation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  validateWildcard,
  validateSymptom,
  validateRemedyName,
  validateLanguage,
} from './validation.js';
import { ValidationError } from './errors.js';

describe('validateWildcard', () => {
  describe('when wildcard is valid', () => {
    it.each([
      ['test*', 'wildcard at end'],
      ['*test', 'wildcard at beginning'],
      ['test', 'no wildcard'],
      ['test test', 'no wildcard with spaces'],
      ['*', 'only wildcard'],
      ['* test', 'wildcard at beginning with space'],
      ['test *', 'wildcard at end with space'],
    ])('validateWildcard when %s then does not throw', (input: string) => {
      expect(() => validateWildcard(input)).not.toThrow();
    });
  });

  describe('when wildcard is in middle of word', () => {
    it.each([
      ['te*st', 'middle of single word'],
      ['test*ing', 'between word parts'],
      ['a*b*c', 'multiple wildcards in middle'],
    ])('validateWildcard when %s then throws ValidationError', (input: string) => {
      expect(() => validateWildcard(input)).toThrow(ValidationError);
    });
  });

  describe('when multiple consecutive wildcards', () => {
    it.each([
      ['**', 'double wildcard'],
      ['test**', 'double wildcard at end'],
      ['**test', 'double wildcard at beginning'],
      ['***', 'triple wildcard'],
    ])('validateWildcard when %s then throws ValidationError', (input: string) => {
      expect(() => validateWildcard(input)).toThrow(ValidationError);
    });
  });
});

describe('validateSymptom', () => {
  describe('when symptom is valid', () => {
    it.each([
      ['headache', 'simple word'],
      ['head ache', 'with space'],
      ['head-ache', 'with hyphen'],
      ['headache*', 'with wildcard'],
      ['head*', 'short with wildcard'],
      ['"exact phrase"', 'with quotes'],
      ['a'.repeat(200), 'max length 200'],
      ['abc', 'min length 3'],
      ['head123', 'with numbers'],
      ['HeAdAcHe', 'mixed case'],
    ])('validateSymptom when %s then does not throw', (input: string) => {
      expect(() => validateSymptom(input)).not.toThrow();
    });
  });

  describe('when symptom is empty or whitespace', () => {
    it.each([
      ['', 'empty string'],
      ['   ', 'only whitespace'],
      ['\t\n', 'tabs and newlines'],
    ])('validateSymptom when %s then throws ValidationError', (input: string) => {
      expect(() => validateSymptom(input)).toThrow(ValidationError);
    });
  });

  describe('when symptom is too short', () => {
    it.each([
      ['ab', '2 characters'],
      ['a', '1 character'],
      ['  a  ', '1 character with spaces'],
    ])('validateSymptom when %s then throws ValidationError', (input: string) => {
      expect(() => validateSymptom(input)).toThrow(ValidationError);
    });
  });

  describe('when symptom is too long', () => {
    it('validateSymptom when 201 characters then throws ValidationError', () => {
      const longSymptom = 'a'.repeat(201);
      expect(() => validateSymptom(longSymptom)).toThrow(ValidationError);
    });
  });

  describe('when symptom contains invalid characters', () => {
    it.each([
      ['head@ache', 'at symbol'],
      ['head#ache', 'hash'],
      ['head!ache', 'exclamation'],
      ['head$ache', 'dollar'],
      ['head%ache', 'percent'],
      ['headache.', 'period'],
      ['headache,', 'comma'],
    ])('validateSymptom when %s then throws ValidationError', (input: string) => {
      expect(() => validateSymptom(input)).toThrow(ValidationError);
    });
  });

  describe('when symptom has wildcard in middle', () => {
    it('validateSymptom when wildcard in middle then throws ValidationError', () => {
      expect(() => validateSymptom('he*d')).toThrow(ValidationError);
    });
  });

  describe('when symptom has multiple consecutive wildcards', () => {
    it('validateSymptom when double wildcard then throws ValidationError', () => {
      expect(() => validateSymptom('head**')).toThrow(ValidationError);
    });
  });
});

describe('validateRemedyName', () => {
  describe('when remedy name is valid', () => {
    it.each([
      ['Aconite', 'simple name'],
      ['Aconitum napellus', 'with space'],
      ['Acon.', 'with period'],
      ['Nat-mur', 'with hyphen'],
      ['Calc-carb (30C)', 'with parentheses'],
      ['a'.repeat(100), 'max length 100'],
      ['a', 'min length 1'],
      ['Remedy123', 'with numbers'],
    ])('validateRemedyName when %s then does not throw', (input: string) => {
      expect(() => validateRemedyName(input)).not.toThrow();
    });
  });

  describe('when remedy name is empty or whitespace', () => {
    it.each([
      ['', 'empty string'],
      ['   ', 'only whitespace'],
      ['\t', 'tab'],
    ])('validateRemedyName when %s then throws ValidationError', (input: string) => {
      expect(() => validateRemedyName(input)).toThrow(ValidationError);
    });
  });

  describe('when remedy name is too long', () => {
    it('validateRemedyName when 101 characters then throws ValidationError', () => {
      const longRemedy = 'a'.repeat(101);
      expect(() => validateRemedyName(longRemedy)).toThrow(ValidationError);
    });
  });

  describe('when remedy name contains invalid characters', () => {
    it.each([
      ['Aconite*', 'asterisk'],
      ['Aconite@', 'at symbol'],
      ['Aconite#', 'hash'],
      ['Aconite!', 'exclamation'],
      ['Aconite$', 'dollar'],
      ['Aconite%', 'percent'],
      ['Aconite"', 'quote'],
    ])('validateRemedyName when %s then throws ValidationError', (input: string) => {
      expect(() => validateRemedyName(input)).toThrow(ValidationError);
    });
  });
});

describe('validateLanguage', () => {
  describe('when language code is valid', () => {
    it.each([
      ['en', 'two letter lowercase'],
      ['de', 'two letter German'],
      ['fr', 'two letter French'],
      ['eng', 'three letter'],
      ['deu', 'three letter German'],
      ['EN', 'two letter uppercase'],
      ['En', 'mixed case'],
    ])('validateLanguage when %s then does not throw', (input: string) => {
      expect(() => validateLanguage(input)).not.toThrow();
    });
  });

  describe('when language code is invalid', () => {
    it.each([
      ['e', 'one letter'],
      ['engl', 'four letters'],
      ['en-US', 'with hyphen'],
      ['e1', 'with number'],
      ['', 'empty string'],
      ['123', 'only numbers'],
    ])('validateLanguage when %s then throws ValidationError', (input: string) => {
      expect(() => validateLanguage(input)).toThrow(ValidationError);
    });
  });
});

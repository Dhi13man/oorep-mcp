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

describe('Security Tests', () => {
  describe('null byte handling', () => {
    it('validateSymptom when contains null byte then throws ValidationError', () => {
      const maliciousInput = 'head\x00ache';
      expect(() => validateSymptom(maliciousInput)).toThrow(ValidationError);
    });

    it('validateRemedyName when contains null byte then throws ValidationError', () => {
      const maliciousInput = 'Acon\x00ite';
      expect(() => validateRemedyName(maliciousInput)).toThrow(ValidationError);
    });

    it('validateLanguage when contains null byte then throws ValidationError', () => {
      const maliciousInput = 'en\x00';
      expect(() => validateLanguage(maliciousInput)).toThrow(ValidationError);
    });
  });

  describe('control character handling', () => {
    it.each([
      ['\x01', 'SOH control character'],
      ['\x02', 'STX control character'],
      ['\x03', 'ETX control character'],
      ['\x07', 'BEL control character'],
      ['\x08', 'backspace'],
      ['\x1B', 'escape'],
      ['\x7F', 'DEL control character'],
    ])('validateSymptom when contains %s then throws ValidationError', (char: string) => {
      const input = `head${char}ache`;
      expect(() => validateSymptom(input)).toThrow(ValidationError);
    });

    // These whitespace control characters are allowed by \s in regex
    it.each([
      ['\x0B', 'vertical tab'],
      ['\x0C', 'form feed'],
      ['\r', 'carriage return'],
    ])('validateSymptom when contains %s then allows (matched by \\s)', (char: string) => {
      const input = `head${char}ache`;
      // These are valid whitespace characters matched by \s
      expect(() => validateSymptom(input)).not.toThrow();
    });
  });

  describe('unicode normalization', () => {
    it('validateSymptom when contains combining characters then still validates', () => {
      // "café" with combining acute accent
      const input = 'cafe\u0301';
      // This contains special unicode, should be rejected by invalid char check
      expect(() => validateSymptom(input)).toThrow(ValidationError);
    });

    it('validateSymptom when contains zero-width characters then throws', () => {
      const input = 'head\u200Bache'; // zero-width space
      expect(() => validateSymptom(input)).toThrow(ValidationError);
    });

    it('validateSymptom when contains right-to-left override then throws', () => {
      const input = 'head\u202Eache'; // right-to-left override
      expect(() => validateSymptom(input)).toThrow(ValidationError);
    });
  });

  describe('injection prevention', () => {
    it.each([
      ['<script>alert(1)</script>', 'XSS script tag'],
      ['javascript:alert(1)', 'javascript protocol'],
      ["'; DROP TABLE users; --", 'SQL injection'],
      ['{{constructor.constructor}}', 'prototype pollution'],
      ['${process.env.SECRET}', 'template injection'],
      ['$(command)', 'command substitution'],
      ['`command`', 'backtick command'],
    ])('validateSymptom when %s then throws ValidationError', (input: string) => {
      expect(() => validateSymptom(input)).toThrow(ValidationError);
    });

    it.each([
      ['../../../etc/passwd', 'path traversal'],
      ['..\\..\\..\\windows\\system32', 'windows path traversal'],
      ['file:///etc/passwd', 'file protocol'],
    ])('validateRemedyName when %s then throws ValidationError', (input: string) => {
      expect(() => validateRemedyName(input)).toThrow(ValidationError);
    });
  });

  describe('length-based attacks', () => {
    it('validateSymptom when very long repeating pattern then throws at max length', () => {
      const longInput = 'abcdefghij'.repeat(21); // 210 characters
      expect(() => validateSymptom(longInput)).toThrow(ValidationError);
    });

    it('validateSymptom when max length boundary then passes', () => {
      const maxInput = 'a'.repeat(200);
      expect(() => validateSymptom(maxInput)).not.toThrow();
    });

    it('validateRemedyName when max length boundary then passes', () => {
      const maxInput = 'a'.repeat(100);
      expect(() => validateRemedyName(maxInput)).not.toThrow();
    });
  });

  describe('whitespace edge cases', () => {
    it('validateSymptom when only non-breaking spaces then throws', () => {
      const input = '\u00A0\u00A0\u00A0'; // non-breaking spaces
      expect(() => validateSymptom(input)).toThrow(ValidationError);
    });

    it('validateSymptom when normal newline then allows', () => {
      const input = 'head\nache';
      // Newlines are valid whitespace matched by \s
      expect(() => validateSymptom(input)).not.toThrow();
    });

    it('validateSymptom when multiple spaces then allows', () => {
      const input = 'head   ache';
      expect(() => validateSymptom(input)).not.toThrow();
    });
  });
});

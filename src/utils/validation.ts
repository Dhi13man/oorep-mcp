/**
 * Input validation utilities
 */

import { ValidationError } from './errors.js';

/**
 * Validate wildcard usage in search terms
 * OOREP allows wildcards (*) but with restrictions
 */
export function validateWildcard(symptom: string): void {
  // Check for wildcard in the middle of a word
  const middleWildcard = /\w\*\w/;
  if (middleWildcard.test(symptom)) {
    throw new ValidationError(
      'Wildcard (*) is not allowed in the middle of a word. Use it at the beginning or end only.'
    );
  }

  // Multiple consecutive wildcards
  if (symptom.includes('**')) {
    throw new ValidationError('Multiple consecutive wildcards are not allowed');
  }
}

/**
 * Validate search symptom input
 * Note: Character validation is intentionally minimal - the OOREP API handles sanitization server-side.
 * This allows Unicode characters, accented letters, and special formatting that LLMs may generate.
 */
export function validateSymptom(symptom: string): void {
  const trimmed = symptom.trim();

  if (!trimmed || trimmed.length === 0) {
    throw new ValidationError('Symptom cannot be empty');
  }

  if (trimmed.length < 3) {
    throw new ValidationError('Symptom must be at least 3 characters long');
  }

  if (trimmed.length > 200) {
    throw new ValidationError('Symptom must not exceed 200 characters');
  }
}

/**
 * Validate remedy name
 */
export function validateRemedyName(remedy: string): void {
  if (!remedy || remedy.trim().length === 0) {
    throw new ValidationError('Remedy name cannot be empty');
  }

  if (remedy.length > 100) {
    throw new ValidationError('Remedy name is too long');
  }

  // Allow alphanumeric, spaces, hyphens, dots, and parentheses
  const invalidChars = /[^a-zA-Z0-9\s\-.()]/;
  if (invalidChars.test(remedy)) {
    throw new ValidationError(
      'Remedy name contains invalid characters. Only letters, numbers, spaces, hyphens, dots, and parentheses are allowed.'
    );
  }
}

/**
 * Validate language code
 */
export function validateLanguage(language: string): void {
  // Simple validation for language codes (2-3 letter codes)
  if (!/^[a-z]{2,3}$/i.test(language)) {
    throw new ValidationError('Language must be a 2-3 letter language code (e.g., "en", "de")');
  }
}

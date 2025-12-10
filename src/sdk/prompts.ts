/**
 * Prompt definitions for OOREP in various formats
 *
 * These definitions can be used to build custom integrations
 * with different AI SDKs.
 */

import { PROMPT_NAMES } from './constants.js';

// Re-export for convenience
export type { PromptName } from './constants.js';
export { PROMPT_NAMES, ALL_PROMPT_NAMES } from './constants.js';

/**
 * Argument definition for a prompt
 */
export interface OOREPPromptArgument {
  name: string;
  description: string;
  required: boolean;
}

/**
 * Generic prompt definition that can be converted to various formats
 */
export interface OOREPPromptDefinition {
  name: string;
  description: string;
  arguments: OOREPPromptArgument[];
}

/**
 * All OOREP prompt definitions
 */
export const promptDefinitions: OOREPPromptDefinition[] = [
  {
    name: PROMPT_NAMES.ANALYZE_SYMPTOMS,
    description:
      'Guide AI through structured symptom analysis workflow for homeopathic case taking. ' +
      'Helps systematically analyze symptoms and find relevant remedies.',
    arguments: [
      {
        name: 'symptom_description',
        description: 'Optional initial symptom description to start the analysis',
        required: false,
      },
    ],
  },
  {
    name: PROMPT_NAMES.REMEDY_COMPARISON,
    description:
      'Compare multiple homeopathic remedies side-by-side to identify the best match. ' +
      'Useful for differential diagnosis between similar remedies.',
    arguments: [
      {
        name: 'remedies',
        description:
          'Comma-separated list of remedy names to compare (e.g., "Aconite,Belladonna,Gelsemium")',
        required: true,
      },
    ],
  },
  {
    name: PROMPT_NAMES.REPERTORIZATION_WORKFLOW,
    description:
      'Step-by-step case taking and repertorization workflow for comprehensive case analysis. ' +
      'Guides through symptom gathering, repertorization, and remedy selection.',
    arguments: [],
  },
];

/**
 * Get a prompt definition by name
 */
export function getPromptDefinition(name: string): OOREPPromptDefinition | undefined {
  return promptDefinitions.find((prompt) => prompt.name === name);
}

/**
 * Get all prompt names
 */
export function getPromptNames(): string[] {
  return promptDefinitions.map((prompt) => prompt.name);
}

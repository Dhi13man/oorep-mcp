/**
 * Prompt Registry
 *
 * Provides access to MCP prompts for the OOREP server.
 */

import { PROMPT_NAMES, type PromptName } from '../sdk/constants.js';
import { logger } from '../utils/logger.js';

import {
  analyzeSymptomsDefinition,
  buildAnalyzeSymptomsPrompt,
  type AnalyzeSymptomsArgs,
  type PromptMessage,
  type PromptResult,
  type PromptDefinition,
} from './analyze-symptoms.js';
import {
  remedyComparisonDefinition,
  buildRemedyComparisonPrompt,
  type RemedyComparisonArgs,
} from './remedy-comparison.js';
import {
  repertorizationWorkflowDefinition,
  buildRepertorizationWorkflowPrompt,
} from './repertorization-workflow.js';

export type {
  AnalyzeSymptomsArgs,
  RemedyComparisonArgs,
  PromptMessage,
  PromptResult,
  PromptDefinition,
};

// Re-export build functions for use in SDK client
export { buildAnalyzeSymptomsPrompt } from './analyze-symptoms.js';
export { buildRemedyComparisonPrompt } from './remedy-comparison.js';
export { buildRepertorizationWorkflowPrompt } from './repertorization-workflow.js';

const promptDefinitions: PromptDefinition[] = [
  analyzeSymptomsDefinition,
  remedyComparisonDefinition,
  repertorizationWorkflowDefinition,
];

export class PromptRegistry {
  getDefinitions(): PromptDefinition[] {
    return promptDefinitions;
  }

  /**
   * Get a prompt by name with optional arguments
   *
   * @param name - The prompt name to retrieve
   * @param args - Optional arguments to customize the prompt
   * @returns Promise resolving to the prompt messages
   * @throws {Error} If the prompt name is not recognized
   * @throws {Error} If remedy-comparison prompt receives fewer than 2 remedies
   */
  async getPrompt(
    name: string,
    args?: Record<string, string>
  ): Promise<{ messages: PromptMessage[] }> {
    logger.info('Getting prompt', { name, args });

    switch (name as PromptName) {
      case PROMPT_NAMES.ANALYZE_SYMPTOMS: {
        const result = buildAnalyzeSymptomsPrompt({
          symptom_description: args?.symptom_description,
        });
        return { messages: result.messages };
      }

      case PROMPT_NAMES.REMEDY_COMPARISON: {
        const result = buildRemedyComparisonPrompt(
          { remedies: args?.remedies ?? '' },
          logger
        );
        return { messages: result.messages };
      }

      case PROMPT_NAMES.REPERTORIZATION_WORKFLOW: {
        const result = buildRepertorizationWorkflowPrompt();
        return { messages: result.messages };
      }

      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  }
}

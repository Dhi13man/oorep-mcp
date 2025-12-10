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

const promptDefinitions: PromptDefinition[] = [
  analyzeSymptomsDefinition,
  remedyComparisonDefinition,
  repertorizationWorkflowDefinition,
];

export class PromptRegistry {
  getDefinitions(): PromptDefinition[] {
    return promptDefinitions;
  }

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

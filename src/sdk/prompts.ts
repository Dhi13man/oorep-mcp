/**
 * Prompt definitions and access for OOREP SDK
 *
 * This module provides:
 * - Prompt definitions (metadata) for all OOREP prompts
 * - Functions to build prompt messages
 * - Functions to list available prompts
 *
 * These can be used to build custom integrations with different AI SDKs.
 */

import { PROMPT_NAMES, type PromptName } from './constants.js';
import { NotFoundError } from '../utils/errors.js';
import { ConsoleLogger } from '../utils/logger.js';
import type { ILogger } from '../interfaces/ILogger.js';

// Re-export for convenience
export type { PromptName } from './constants.js';
export { PROMPT_NAMES, ALL_PROMPT_NAMES } from './constants.js';

// Re-export types from prompts module
export type {
  AnalyzeSymptomsArgs,
  RemedyComparisonArgs,
  PromptMessage,
  PromptResult,
  PromptDefinition,
} from '../prompts/index.js';

// Import build functions and definitions from prompts module
import {
  buildAnalyzeSymptomsPrompt,
  buildRemedyComparisonPrompt,
  buildRepertorizationWorkflowPrompt,
  analyzeSymptomsDefinition,
  remedyComparisonDefinition,
  repertorizationWorkflowDefinition,
  type AnalyzeSymptomsArgs,
  type RemedyComparisonArgs,
  type PromptResult,
  type PromptDefinition,
} from '../prompts/index.js';

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
 * All OOREP prompt definitions (imported from source modules to avoid duplication)
 */
export const promptDefinitions: OOREPPromptDefinition[] = [
  analyzeSymptomsDefinition,
  remedyComparisonDefinition,
  repertorizationWorkflowDefinition,
].map((def) => ({
  name: def.name,
  description: def.description,
  arguments: def.arguments ?? [],
}));

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

/**
 * List all available prompts with their metadata
 *
 * @example
 * ```typescript
 * import { listPrompts } from 'oorep-mcp';
 *
 * const prompts = listPrompts();
 * console.log(prompts);
 * // [{ name: 'analyze-symptoms', description: '...', arguments: [...] }, ...]
 * ```
 */
export function listPrompts(): PromptDefinition[] {
  return promptDefinitions.map((def) => ({
    name: def.name as PromptName,
    description: def.description,
    arguments: def.arguments,
  }));
}

/**
 * Get a prompt workflow by name
 *
 * Available prompts:
 * - `analyze-symptoms` - Guided workflow for systematic symptom analysis (CLAMS method)
 * - `remedy-comparison` - Compare multiple remedies side-by-side
 * - `repertorization-workflow` - Step-by-step case taking and repertorization (7 steps)
 *
 * @param name - The prompt name
 * @param args - Optional arguments for the prompt
 * @param logger - Optional logger for debug output
 * @returns The prompt result with messages
 * @throws {NotFoundError} If the prompt name is not recognized
 * @throws {Error} If remedy-comparison prompt is missing required 'remedies' argument
 *
 * @example
 * ```typescript
 * import { getPrompt } from 'oorep-mcp';
 *
 * // Get the repertorization workflow
 * const workflow = getPrompt('repertorization-workflow');
 * console.log(workflow.messages[0].content.text);
 *
 * // Compare remedies
 * const comparison = getPrompt('remedy-comparison', {
 *   remedies: 'Aconite,Belladonna,Gelsemium'
 * });
 *
 * // Analyze symptoms with initial description
 * const analysis = getPrompt('analyze-symptoms', {
 *   symptom_description: 'throbbing headache worse from light'
 * });
 * ```
 */
export function getPrompt(name: 'analyze-symptoms', args?: AnalyzeSymptomsArgs): PromptResult;
export function getPrompt(name: 'remedy-comparison', args: RemedyComparisonArgs): PromptResult;
export function getPrompt(name: 'repertorization-workflow'): PromptResult;
export function getPrompt(
  name: PromptName,
  args?: AnalyzeSymptomsArgs | RemedyComparisonArgs,
  logger?: ILogger
): PromptResult {
  const log = logger ?? new ConsoleLogger('warn');

  switch (name) {
    case PROMPT_NAMES.ANALYZE_SYMPTOMS:
      return buildAnalyzeSymptomsPrompt(args as AnalyzeSymptomsArgs | undefined);

    case PROMPT_NAMES.REMEDY_COMPARISON: {
      const compArgs = args as RemedyComparisonArgs | undefined;
      if (!compArgs?.remedies) {
        throw new Error('remedies argument is required for remedy-comparison prompt');
      }
      return buildRemedyComparisonPrompt(compArgs, log);
    }

    case PROMPT_NAMES.REPERTORIZATION_WORKFLOW:
      return buildRepertorizationWorkflowPrompt();

    default: {
      const _exhaustive: never = name;
      throw new NotFoundError(`Unknown prompt: ${_exhaustive}`, 'prompt', name);
    }
  }
}

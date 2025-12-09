/**
 * Prompt registration and exports
 *
 * This module provides MCP prompt access by delegating to OOREPSDKClient.
 * The SDK is the single source of truth for all prompt logic.
 */

import { OOREPSDKClient } from '../sdk/client.js';
import { ALL_PROMPT_NAMES, PROMPT_NAMES, type PromptName } from '../sdk/constants.js';
import { logger } from '../utils/logger.js';

export interface PromptDefinition {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
}

export interface PromptMessage {
  role: 'user' | 'assistant';
  content: {
    type: 'text';
    text: string;
  };
}

export class PromptRegistry {
  private sdk: OOREPSDKClient;

  constructor() {
    // Prompts are static content - no API calls needed, so minimal config
    this.sdk = new OOREPSDKClient();
  }

  getDefinitions(): PromptDefinition[] {
    return this.sdk.listPrompts();
  }

  async getPrompt(
    name: string,
    args?: Record<string, string>
  ): Promise<{ messages: PromptMessage[] }> {
    logger.info('Getting prompt', { name, args });

    // Validate prompt name using constants
    if (!ALL_PROMPT_NAMES.includes(name as PromptName)) {
      throw new Error(`Prompt not found: ${name}`);
    }

    // Delegate to SDK based on prompt type
    const promptName = name as PromptName;

    // SDK getPrompt has overloaded signatures, handle each case
    let result;
    switch (promptName) {
      case PROMPT_NAMES.ANALYZE_SYMPTOMS:
        result = await this.sdk.getPrompt(PROMPT_NAMES.ANALYZE_SYMPTOMS, {
          symptom_description: args?.symptom_description,
        });
        break;
      case PROMPT_NAMES.REMEDY_COMPARISON:
        if (!args?.remedies) {
          throw new Error('remedies argument is required for remedy-comparison prompt');
        }
        result = await this.sdk.getPrompt(PROMPT_NAMES.REMEDY_COMPARISON, {
          remedies: args.remedies,
        });
        break;
      case PROMPT_NAMES.REPERTORIZATION_WORKFLOW:
        result = await this.sdk.getPrompt(PROMPT_NAMES.REPERTORIZATION_WORKFLOW);
        break;
    }

    return { messages: result.messages };
  }
}

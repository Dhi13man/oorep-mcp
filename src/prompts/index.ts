/**
 * Prompt registration and exports
 *
 * This module provides MCP prompt access by delegating to OOREPSDKClient.
 * The SDK is the single source of truth for all prompt logic.
 */

import { OOREPSDKClient, type PromptName } from '../sdk/client.js';
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

    // Validate prompt name
    const validNames: PromptName[] = ['analyze-symptoms', 'remedy-comparison', 'repertorization-workflow'];
    if (!validNames.includes(name as PromptName)) {
      throw new Error(`Prompt not found: ${name}`);
    }

    // Delegate to SDK based on prompt type
    const promptName = name as PromptName;

    // SDK getPrompt has overloaded signatures, handle each case
    let result;
    switch (promptName) {
      case 'analyze-symptoms':
        result = await this.sdk.getPrompt('analyze-symptoms', {
          symptom_description: args?.symptom_description,
        });
        break;
      case 'remedy-comparison':
        if (!args?.remedies) {
          throw new Error('remedies argument is required for remedy-comparison prompt');
        }
        result = await this.sdk.getPrompt('remedy-comparison', {
          remedies: args.remedies,
        });
        break;
      case 'repertorization-workflow':
        result = await this.sdk.getPrompt('repertorization-workflow');
        break;
    }

    return { messages: result.messages };
  }
}

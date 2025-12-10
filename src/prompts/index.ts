import { OOREPSDKClient } from '../sdk/client.js';
import { PROMPT_NAMES, type PromptName } from '../sdk/constants.js';
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

    // Switch required to satisfy SDK's strict overload signatures
    let result;
    switch (name as PromptName) {
      case PROMPT_NAMES.ANALYZE_SYMPTOMS:
        result = await this.sdk.getPrompt(PROMPT_NAMES.ANALYZE_SYMPTOMS, {
          symptom_description: args?.symptom_description,
        });
        break;
      case PROMPT_NAMES.REMEDY_COMPARISON:
        result = await this.sdk.getPrompt(PROMPT_NAMES.REMEDY_COMPARISON, {
          remedies: args?.remedies ?? '',
        });
        break;
      case PROMPT_NAMES.REPERTORIZATION_WORKFLOW:
        result = await this.sdk.getPrompt(PROMPT_NAMES.REPERTORIZATION_WORKFLOW);
        break;
      default:
        throw new Error(`Unknown prompt: ${name}`);
    }

    return { messages: result.messages };
  }
}

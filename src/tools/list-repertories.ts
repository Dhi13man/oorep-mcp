/**
 * Tool: list_available_repertories
 * Get list of all accessible repertories with metadata
 */

import { OOREPSDKClient, type OOREPSDKConfig } from '../sdk/client.js';
import { ListRepertoriesArgsSchema, type RepertoryMetadata } from '../utils/schemas.js';
import { sanitizeError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type { OOREPConfig } from '../config.js';

export class ListRepertoriesTool {
  private client: OOREPSDKClient;

  constructor(config: OOREPConfig) {
    const sdkConfig: OOREPSDKConfig = {
      baseUrl: config.baseUrl,
      timeoutMs: config.timeoutMs,
      cacheTtlMs: config.cacheTtlMs,
      defaultRepertory: config.defaultRepertory,
      defaultMateriaMedica: config.defaultMateriaMedica,
    };
    this.client = new OOREPSDKClient(sdkConfig);
  }

  async execute(args: unknown): Promise<{ repertories: RepertoryMetadata[] }> {
    try {
      // Validate and parse arguments
      const validatedArgs = ListRepertoriesArgsSchema.parse(args);
      logger.info('Executing list_available_repertories', validatedArgs);

      // Use SDK client (handles caching, validation, deduplication)
      const repertories = await this.client.listRepertories({
        language: validatedArgs.language,
      });

      logger.info('Repertories list retrieved', {
        count: repertories.length,
        language: validatedArgs.language || 'all',
      });

      return { repertories };
    } catch (error) {
      logger.error('Error in list_available_repertories', error);
      throw sanitizeError(error);
    }
  }

  destroy(): void {
    this.client.destroy();
  }
}

export const listRepertoriesToolDefinition = {
  name: 'list_available_repertories',
  description:
    'Get a complete list of all available homeopathic repertories with their metadata including ' +
    'title, author, and language. Useful for discovering which repertories are available for searching.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      language: {
        type: 'string',
        description:
          'Optional: Filter repertories by language code (e.g., "en" for English, "de" for German). ' +
          'If not specified, returns all repertories.',
        pattern: '^[a-z]{2,3}$',
      },
    },
  },
};

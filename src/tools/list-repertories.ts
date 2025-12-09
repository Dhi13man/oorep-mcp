/**
 * Tool: list_available_repertories
 * Get list of all accessible repertories with metadata
 */

import type { IOOREPSDKClient } from '../interfaces/IOOREPSDKClient.js';
import {
  z,
  ListRepertoriesArgsSchema,
  RepertoryMetadataSchema,
  zodToOutputSchema,
  type RepertoryMetadata,
} from '../utils/schemas.js';
import { sanitizeError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export class ListRepertoriesTool {
  constructor(private client: IOOREPSDKClient) {}

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
  outputSchema: zodToOutputSchema(
    z.object({
      repertories: z.array(RepertoryMetadataSchema),
    })
  ),
};

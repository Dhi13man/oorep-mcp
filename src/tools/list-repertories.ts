/**
 * Tool: list_available_repertories
 * Get list of all accessible repertories with metadata
 */

import { OOREPClient } from '../lib/oorep-client.js';
import { Cache } from '../lib/cache.js';
import { validateLanguage } from '../utils/validation.js';
import { ListRepertoriesArgsSchema, type RepertoryMetadata } from '../utils/schemas.js';
import { sanitizeError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type { OOREPConfig } from '../config.js';

export class ListRepertoriesTool {
  private client: OOREPClient;
  private cache: Cache<RepertoryMetadata[]>;

  constructor(config: OOREPConfig) {
    this.client = new OOREPClient(config);
    // Cache for 5 minutes (metadata changes rarely)
    this.cache = new Cache<RepertoryMetadata[]>(300000);
  }

  async execute(args: unknown): Promise<{ repertories: RepertoryMetadata[] }> {
    try {
      // Validate and parse arguments
      const validatedArgs = ListRepertoriesArgsSchema.parse(args);
      logger.info('Executing list_available_repertories', validatedArgs);

      // Additional validation
      if (validatedArgs.language) {
        validateLanguage(validatedArgs.language);
      }

      const cacheKey = `repertories:${validatedArgs.language || 'all'}`;

      // Check cache
      const cached = this.cache.get(cacheKey);
      if (cached) {
        logger.info('Returning cached repertories list');
        return { repertories: cached };
      }

      // Fetch from OOREP API
      const apiRepertories = await this.client.getAvailableRepertories();

      // Transform to metadata format
      let repertories: RepertoryMetadata[] = apiRepertories.map((rep) => {
        const base = {
          abbreviation: rep.abbreviation,
          title: rep.title,
          author: rep.author,
          language: rep.language,
        };
        return {
          ...base,
          ...(rep.year !== undefined ? { year: rep.year } : {}),
          ...(rep.edition !== undefined ? { edition: rep.edition } : {}),
          ...(rep.publisher !== undefined ? { publisher: rep.publisher } : {}),
          ...(rep.license !== undefined ? { license: rep.license } : {}),
          ...(rep.remedyCount !== undefined ? { remedyCount: rep.remedyCount } : {}),
        };
      });

      // Filter by language if specified
      if (validatedArgs.language) {
        const lang = validatedArgs.language.toLowerCase();
        repertories = repertories.filter(
          (rep) => rep.language?.toLowerCase() === lang
        );
      }

      // Cache the result
      this.cache.set(cacheKey, repertories);

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
};

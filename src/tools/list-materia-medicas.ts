/**
 * Tool: list_available_materia_medicas
 * Get list of all accessible materia medicas with metadata
 */

import { OOREPClient } from '../lib/oorep-client.js';
import { Cache } from '../lib/cache.js';
import { validateLanguage } from '../utils/validation.js';
import { ListMateriaMedicasArgsSchema, type MateriaMedicaMetadata } from '../utils/schemas.js';
import { sanitizeError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type { OOREPConfig } from '../config.js';

export class ListMateriaMedicasTool {
  private client: OOREPClient;
  private cache: Cache<MateriaMedicaMetadata[]>;

  constructor(config: OOREPConfig) {
    this.client = new OOREPClient(config);
    // Cache for 5 minutes (metadata changes rarely)
    this.cache = new Cache<MateriaMedicaMetadata[]>(300000);
  }

  async execute(args: unknown): Promise<{ materiaMedicas: MateriaMedicaMetadata[] }> {
    try {
      // Validate and parse arguments
      const validatedArgs = ListMateriaMedicasArgsSchema.parse(args);
      logger.info('Executing list_available_materia_medicas', validatedArgs);

      // Additional validation
      if (validatedArgs.language) {
        validateLanguage(validatedArgs.language);
      }

      const cacheKey = `materia-medicas:${validatedArgs.language || 'all'}`;

      // Check cache
      const cached = this.cache.get(cacheKey);
      if (cached) {
        logger.info('Returning cached materia medicas list');
        return { materiaMedicas: cached };
      }

      // Fetch from OOREP API
      const apiMateriaMedicas = await this.client.getAvailableMateriaMedicas();

      // Transform to metadata format
      let materiaMedicas: MateriaMedicaMetadata[] = apiMateriaMedicas.map((mm) => {
        const meta: MateriaMedicaMetadata = {
          abbreviation: mm.abbreviation,
          title: mm.title,
          author: mm.author,
          language: mm.language,
        };
        if (mm.year !== undefined) meta.year = mm.year;
        if (mm.edition !== undefined) meta.edition = mm.edition;
        if (mm.publisher !== undefined) meta.publisher = mm.publisher;
        if (mm.license !== undefined) meta.license = mm.license;
        return meta;
      });

      // Filter by language if specified
      if (validatedArgs.language) {
        const lang = validatedArgs.language.toLowerCase();
        materiaMedicas = materiaMedicas.filter(
          (mm) => mm.language?.toLowerCase() === lang
        );
      }

      // Cache the result
      this.cache.set(cacheKey, materiaMedicas);

      logger.info('Materia medicas list retrieved', {
        count: materiaMedicas.length,
        language: validatedArgs.language || 'all',
      });

      return { materiaMedicas };
    } catch (error) {
      logger.error('Error in list_available_materia_medicas', error);
      throw sanitizeError(error);
    }
  }
}

export const listMateriaMedicasToolDefinition = {
  name: 'list_available_materia_medicas',
  description:
    'Get a complete list of all available homeopathic materia medicas with their metadata including ' +
    'title, author, and language. Useful for discovering which materia medicas are available for searching.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      language: {
        type: 'string',
        description:
          'Optional: Filter materia medicas by language code (e.g., "en" for English, "de" for German). ' +
          'If not specified, returns all materia medicas.',
        pattern: '^[a-z]{2,3}$',
      },
    },
  },
};

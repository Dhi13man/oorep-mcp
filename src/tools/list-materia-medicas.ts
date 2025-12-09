/**
 * Tool: list_available_materia_medicas
 * Get list of all accessible materia medicas with metadata
 */

import type { IOOREPSDKClient } from '../interfaces/IOOREPSDKClient.js';
import {
  z,
  ListMateriaMedicasArgsSchema,
  MateriaMedicaMetadataSchema,
  zodToOutputSchema,
  type MateriaMedicaMetadata,
} from '../utils/schemas.js';
import { sanitizeError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export class ListMateriaMedicasTool {
  constructor(private client: IOOREPSDKClient) {}

  async execute(args: unknown): Promise<{ materiaMedicas: MateriaMedicaMetadata[] }> {
    try {
      // Validate and parse arguments
      const validatedArgs = ListMateriaMedicasArgsSchema.parse(args);
      logger.info('Executing list_available_materia_medicas', validatedArgs);

      // Use SDK client (handles caching, validation, deduplication)
      const materiaMedicas = await this.client.listMateriaMedicas({
        language: validatedArgs.language,
      });

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
  outputSchema: zodToOutputSchema(
    z.object({
      materiaMedicas: z.array(MateriaMedicaMetadataSchema),
    })
  ),
};

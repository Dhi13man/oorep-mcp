/**
 * Tool: list_available_materia_medicas
 * Get list of all accessible materia medicas with metadata
 */

import { OOREPSDKClient, type OOREPSDKConfig } from '../sdk/client.js';
import { ListMateriaMedicasArgsSchema, type MateriaMedicaMetadata } from '../utils/schemas.js';
import { sanitizeError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type { OOREPConfig } from '../config.js';

export class ListMateriaMedicasTool {
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

  destroy(): void {
    this.client.destroy();
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

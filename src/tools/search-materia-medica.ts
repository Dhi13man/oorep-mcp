/**
 * Tool: search_materia_medica
 * Search materia medica texts for symptoms and return matching remedy sections
 */

import type { IOOREPSDKClient } from '../interfaces/IOOREPSDKClient.js';
import {
  SearchMateriaMedicaArgsSchema,
  MateriaMedicaSearchResultSchema,
  zodToOutputSchema,
  type MateriaMedicaSearchResult,
} from '../utils/schemas.js';
import { sanitizeError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { TOOL_NAMES } from '../sdk/constants.js';

export class SearchMateriaMedicaTool {
  constructor(private client: IOOREPSDKClient) {}

  async execute(args: unknown): Promise<MateriaMedicaSearchResult> {
    try {
      // Validate and parse arguments
      const validatedArgs = SearchMateriaMedicaArgsSchema.parse(args);
      logger.info('Executing search_materia_medica', validatedArgs);

      // Use SDK client (handles caching, validation, deduplication, formatting)
      const result = await this.client.searchMateriaMedica({
        symptom: validatedArgs.symptom,
        materiamedica: validatedArgs.materiamedica,
        remedy: validatedArgs.remedy,
        maxResults: validatedArgs.maxResults,
      });

      logger.info('Materia medica search completed', {
        totalResults: result.totalResults,
        remedies: result.results.length,
      });

      return result;
    } catch (error) {
      logger.error('Error in search_materia_medica', error);
      throw sanitizeError(error);
    }
  }
}

export const searchMateriaMedicaToolDefinition = {
  name: TOOL_NAMES.SEARCH_MATERIA_MEDICA,
  description:
    'Search materia medica texts for symptoms and return matching remedy sections. ' +
    'Materia medicas provide detailed descriptions of remedy characteristics, symptoms, and clinical applications. ' +
    'Useful for in-depth remedy study and comparison.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      symptom: {
        type: 'string',
        description:
          'Search term for symptoms or characteristics (3-200 characters). ' +
          'Examples: "fever", "anxiety", "headache worse night"',
        minLength: 3,
        maxLength: 200,
      },
      materiamedica: {
        type: 'string',
        description:
          'Optional: Filter by specific materia medica abbreviation (e.g., "hering", "clarke", "boericke"). ' +
          'If not specified, uses the configured default materia medica (OOREP_MCP_DEFAULT_MATERIA_MEDICA, default "boericke").',
      },
      remedy: {
        type: 'string',
        description:
          'Optional: Filter results to a specific remedy (e.g., "Aconite", "Belladonna"). ' +
          'Useful for focused remedy study.',
      },
      maxResults: {
        type: 'number',
        description: 'Optional: Maximum number of remedy results to return (1-50). Default: 10',
        minimum: 1,
        maximum: 50,
        default: 10,
      },
    },
    required: ['symptom'],
  },
  outputSchema: zodToOutputSchema(MateriaMedicaSearchResultSchema),
};

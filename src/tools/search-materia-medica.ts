/**
 * Tool: search_materia_medica
 * Search materia medica texts for symptoms and return matching remedy sections
 */

import { OOREPClient } from '../lib/oorep-client.js';
import { Cache, RequestDeduplicator } from '../lib/cache.js';
import { formatMateriaMedicaResults, generateCacheKey } from '../lib/data-formatter.js';
import { validateSymptom, validateRemedyName } from '../utils/validation.js';
import { SearchMateriaMedicaArgsSchema, type MateriaMedicaSearchResult } from '../utils/schemas.js';
import { sanitizeError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type { OOREPConfig } from '../config.js';

export class SearchMateriaMedicaTool {
  private client: OOREPClient;
  private cache: Cache<MateriaMedicaSearchResult>;
  private deduplicator: RequestDeduplicator;
  private readonly defaultMateriaMedica: string;

  constructor(config: OOREPConfig) {
    this.client = new OOREPClient(config);
    this.cache = new Cache<MateriaMedicaSearchResult>(config.cacheTtlMs);
    this.deduplicator = new RequestDeduplicator();
    this.defaultMateriaMedica = config.defaultMateriaMedica;
  }

  async execute(args: unknown): Promise<MateriaMedicaSearchResult> {
    try {
      // Validate and parse arguments
      const validatedArgs = SearchMateriaMedicaArgsSchema.parse(args);
      logger.info('Executing search_materia_medica', validatedArgs);

      // Additional validation
      validateSymptom(validatedArgs.symptom);
      if (validatedArgs.remedy) {
        validateRemedyName(validatedArgs.remedy);
      }

      const resolvedMateriaMedica =
        validatedArgs.materiamedica?.trim() || this.defaultMateriaMedica;

      // Generate cache key
      const cacheKey = generateCacheKey('mm', {
        symptom: validatedArgs.symptom,
        materiamedica: resolvedMateriaMedica,
        remedy: validatedArgs.remedy,
        maxResults: validatedArgs.maxResults,
      });

      // Check cache
      const cached = this.cache.get(cacheKey);
      if (cached) {
        logger.info('Returning cached materia medica results');
        return cached;
      }

      // Deduplicate concurrent requests
      const result = await this.deduplicator.deduplicate(cacheKey, async () => {
        // Fetch from OOREP API
        const apiResponse = await this.client.lookupMateriaMedica({
          symptom: validatedArgs.symptom,
          materiamedica: resolvedMateriaMedica,
          remedy: validatedArgs.remedy,
        });

        // Format results
        const formatted = formatMateriaMedicaResults(apiResponse, validatedArgs.maxResults);

        // Cache the result
        this.cache.set(cacheKey, formatted);

        return formatted;
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
  name: 'search_materia_medica',
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
};

/**
 * Tool: get_remedy_info
 * Retrieve comprehensive information about a specific homeopathic remedy
 */

import { OOREPClient } from '../lib/oorep-client.js';
import { Cache, RequestDeduplicator } from '../lib/cache.js';
import { generateCacheKey } from '../lib/data-formatter.js';
import { validateRemedyName } from '../utils/validation.js';
import { GetRemedyInfoArgsSchema, type RemedyInfo } from '../utils/schemas.js';
import { sanitizeError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type { OOREPConfig } from '../config.js';

export class GetRemedyInfoTool {
  private client: OOREPClient;
  private cache: Cache<RemedyInfo>;
  private deduplicator: RequestDeduplicator;

  constructor(config: OOREPConfig) {
    this.client = new OOREPClient(config);
    this.cache = new Cache<RemedyInfo>(config.cacheTtlMs);
    this.deduplicator = new RequestDeduplicator();
  }

  async execute(args: unknown): Promise<RemedyInfo> {
    try {
      // Validate and parse arguments
      const validatedArgs = GetRemedyInfoArgsSchema.parse(args);
      logger.info('Executing get_remedy_info', validatedArgs);

      // Additional validation
      validateRemedyName(validatedArgs.remedy);

      // Generate cache key
      const cacheKey = generateCacheKey('remedy', {
        remedy: validatedArgs.remedy,
        includeMateriaMedica: validatedArgs.includeMateriaMedica,
        includeRepertory: validatedArgs.includeRepertory,
      });

      // Check cache
      const cached = this.cache.get(cacheKey);
      if (cached) {
        logger.info('Returning cached remedy info');
        return cached;
      }

      // Deduplicate concurrent requests
      const result = await this.deduplicator.deduplicate(cacheKey, async () => {
        // Get all available remedies to find the matching one
        const remedies = await this.client.getAvailableRemedies();

        // Find remedy (case-insensitive, match abbreviation or long name)
        const remedy = remedies.find(
          (r) =>
            r.nameAbbrev.toLowerCase() === validatedArgs.remedy.toLowerCase() ||
            r.nameLong.toLowerCase() === validatedArgs.remedy.toLowerCase() ||
            r.nameAlt?.some((alt) => alt.toLowerCase() === validatedArgs.remedy.toLowerCase())
        );

        if (!remedy) {
          throw new Error(
            `Remedy "${validatedArgs.remedy}" not found. Please check the spelling or use list_available_repertories to see available remedies.`
          );
        }

        // Build remedy info
        const remedyInfo: RemedyInfo = {
          id: remedy.id,
          nameAbbrev: remedy.nameAbbrev,
          nameLong: remedy.nameLong,
          nameAlt: remedy.nameAlt,
        };

        // Optionally fetch repertory entries and materia medica sections
        // Note: This would require additional API calls
        // For now, we'll return basic info
        // TODO: Implement fetching repertory entries and MM sections if API supports it

        if (validatedArgs.includeRepertory) {
          // Placeholder for repertory entries
          remedyInfo.repertoryEntries = [];
          logger.warn('Including repertory entries is not yet implemented');
        }

        if (validatedArgs.includeMateriaMedica) {
          // Placeholder for materia medica sections
          remedyInfo.materiaMedicaSections = [];
          logger.warn('Including materia medica sections is not yet implemented');
        }

        // Cache the result
        this.cache.set(cacheKey, remedyInfo);

        return remedyInfo;
      });

      logger.info('Remedy info retrieved', {
        remedy: result.nameAbbrev,
        id: result.id,
      });

      return result;
    } catch (error) {
      logger.error('Error in get_remedy_info', error);
      throw sanitizeError(error);
    }
  }
}

export const getRemedyInfoToolDefinition = {
  name: 'get_remedy_info',
  description:
    'Retrieve comprehensive information about a specific homeopathic remedy including ' +
    'its full name, abbreviations, alternative names, and optionally its repertory entries ' +
    'and materia medica sections. Useful for learning about individual remedies.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      remedy: {
        type: 'string',
        description:
          'Remedy name or abbreviation (e.g., "Aconite", "Acon.", "Aconitum napellus"). ' +
          'Case-insensitive.',
        minLength: 1,
      },
      includeMateriaMedica: {
        type: 'boolean',
        description:
          'Optional: Include materia medica sections for this remedy. Default: false. ' +
          'Note: This may return large amounts of text.',
        default: false,
      },
      includeRepertory: {
        type: 'boolean',
        description:
          'Optional: Include repertory entries for this remedy. Default: false. ' +
          'Note: This may return large amounts of data.',
        default: false,
      },
    },
    required: ['remedy'],
  },
};

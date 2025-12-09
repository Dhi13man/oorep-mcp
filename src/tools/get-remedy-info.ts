/**
 * Tool: get_remedy_info
 * Retrieve comprehensive information about a specific homeopathic remedy
 */

import type { IOOREPSDKClient } from '../interfaces/IOOREPSDKClient.js';
import {
  GetRemedyInfoArgsSchema,
  RemedyInfoSchema,
  zodToOutputSchema,
  type RemedyInfo,
} from '../utils/schemas.js';
import { sanitizeError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export class GetRemedyInfoTool {
  constructor(private client: IOOREPSDKClient) {}

  async execute(args: unknown): Promise<RemedyInfo> {
    try {
      // Validate and parse arguments
      const validatedArgs = GetRemedyInfoArgsSchema.parse(args);
      logger.info('Executing get_remedy_info', validatedArgs);

      // Use SDK client (handles caching, validation, deduplication, partial matching)
      const result = await this.client.getRemedyInfo({
        remedy: validatedArgs.remedy,
      });

      // SDK returns null if not found, MCP tool should throw error
      if (!result) {
        throw new Error(
          `Remedy "${validatedArgs.remedy}" not found. Check the spelling or use the list_available_remedies tool to see available remedies.`
        );
      }

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
    'its full name, abbreviations, and alternative names. Useful for learning about individual remedies.',
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
    },
    required: ['remedy'],
  },
  outputSchema: zodToOutputSchema(RemedyInfoSchema),
};

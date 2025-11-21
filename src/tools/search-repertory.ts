/**
 * Tool: search_repertory
 * Search for symptoms in homeopathic repertories and return matching rubrics with remedies
 */

import { OOREPSDKClient, type OOREPSDKConfig } from '../sdk/client.js';
import {
  SearchRepertoryArgsSchema,
  RepertorySearchResultSchema,
  zodToOutputSchema,
  type RepertorySearchResult,
} from '../utils/schemas.js';
import { sanitizeError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type { OOREPConfig } from '../config.js';

export class SearchRepertoryTool {
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

  async execute(args: unknown): Promise<RepertorySearchResult> {
    try {
      // Validate and parse arguments
      const validatedArgs = SearchRepertoryArgsSchema.parse(args);
      logger.info('Executing search_repertory', validatedArgs);

      // Use SDK client (handles caching, validation, deduplication, formatting)
      const result = await this.client.searchRepertory({
        symptom: validatedArgs.symptom,
        repertory: validatedArgs.repertory,
        minWeight: validatedArgs.minWeight,
        maxResults: validatedArgs.maxResults,
        includeRemedyStats: validatedArgs.includeRemedyStats,
      });

      logger.info('Repertory search completed', {
        totalResults: result.totalResults,
        rubrics: result.rubrics.length,
      });

      return result;
    } catch (error) {
      logger.error('Error in search_repertory', error);
      throw sanitizeError(error);
    }
  }

  destroy(): void {
    this.client.destroy();
  }
}

export const searchRepertoryToolDefinition = {
  name: 'search_repertory',
  description:
    'Search for symptoms in homeopathic repertories and return matching rubrics with remedies. ' +
    'Supports wildcards (*), exclusions (-), and exact phrases ("). ' +
    'Returns rubrics sorted by relevance with remedies and their weights.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      symptom: {
        type: 'string',
        description:
          'Search term for symptoms (3-200 characters). ' +
          'Supports wildcards (*), exclusions (-term), and exact phrases ("phrase"). ' +
          'Examples: "headache", "head*", "fever -night", \'"worse from cold"\'',
        minLength: 3,
        maxLength: 200,
      },
      repertory: {
        type: 'string',
        description:
          'Optional: Filter by specific repertory abbreviation (e.g., "kent", "boger"). ' +
          'If not specified, uses the configured default repertory (OOREP_MCP_DEFAULT_REPERTORY, default "publicum").',
      },
      minWeight: {
        type: 'number',
        description:
          'Optional: Minimum remedy weight/grade to include (1-4). ' +
          'Higher weights indicate stronger associations. ' +
          '1=slight, 2=moderate, 3=strong, 4=very strong',
        minimum: 1,
        maximum: 4,
      },
      maxResults: {
        type: 'number',
        description: 'Optional: Maximum number of results to return (1-100). Default: 20',
        minimum: 1,
        maximum: 100,
        default: 20,
      },
      includeRemedyStats: {
        type: 'boolean',
        description:
          'Optional: Include aggregate remedy statistics showing which remedies appear most frequently. Default: true',
        default: true,
      },
    },
    required: ['symptom'],
  },
  outputSchema: zodToOutputSchema(RepertorySearchResultSchema),
};

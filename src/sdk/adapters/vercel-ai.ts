/**
 * Vercel AI SDK Adapter
 *
 * Provides tools for use with the Vercel AI SDK (ai package).
 * Works with any AI provider supported by the AI SDK (OpenAI, Anthropic, Google, etc.)
 *
 * @example
 * ```typescript
 * import { generateText } from 'ai';
 * import { openai } from '@ai-sdk/openai';
 * import { createOOREPClient } from 'oorep-mcp/sdk';
 * import { createOOREPTools } from 'oorep-mcp/sdk/vercel-ai';
 *
 * const client = createOOREPClient();
 * const tools = createOOREPTools(client);
 *
 * const result = await generateText({
 *   model: openai('gpt-5'),
 *   tools,
 *   prompt: 'Find remedies for throbbing headache worse from motion'
 * });
 * ```
 */

import { z } from '../../utils/schemas.js';
import type { OOREPSDKClient } from '../client.js';

/**
 * Vercel AI SDK tool type
 * This matches the structure expected by the AI SDK
 */
export interface VercelAITool<TInput, TOutput> {
  description: string;
  parameters: z.ZodType<TInput>;
  execute: (args: TInput) => Promise<TOutput>;
}

/**
 * Create OOREP tools for use with Vercel AI SDK
 *
 * @param client - OOREP SDK client instance
 * @returns Object containing all OOREP tools
 *
 * @example
 * ```typescript
 * import { generateText } from 'ai';
 * import { openai } from '@ai-sdk/openai';
 *
 * const tools = createOOREPTools(client);
 *
 * const result = await generateText({
 *   model: openai('gpt-5'),
 *   tools,
 *   prompt: 'What remedies help with headache?'
 * });
 * ```
 */
export function createOOREPTools(client: OOREPSDKClient) {
  return {
    search_repertory: {
      description:
        'Search for symptoms in homeopathic repertories. Returns matching rubrics with remedies and their weights.',
      parameters: z.object({
        symptom: z
          .string()
          .describe('The symptom to search for. Supports wildcards (*) at end of words.'),
        repertory: z
          .string()
          .optional()
          .describe('Repertory abbreviation (e.g., "kent", "publicum")'),
        minWeight: z.number().min(1).max(4).optional().describe('Minimum remedy weight (1-4)'),
        maxResults: z.number().min(1).max(100).optional().default(20).describe('Maximum results'),
        includeRemedyStats: z
          .boolean()
          .optional()
          .default(true)
          .describe('Include remedy statistics'),
      }),
      execute: async (args: {
        symptom: string;
        repertory?: string;
        minWeight?: number;
        maxResults?: number;
        includeRemedyStats?: boolean;
      }) => client.searchRepertory(args),
    },

    search_materia_medica: {
      description: 'Search materia medica texts for remedy descriptions and symptoms.',
      parameters: z.object({
        symptom: z.string().describe('The symptom to search for'),
        materiamedica: z
          .string()
          .optional()
          .describe('Materia medica abbreviation (e.g., "boericke")'),
        remedy: z.string().optional().describe('Filter to specific remedy'),
        maxResults: z.number().min(1).max(50).optional().default(10).describe('Maximum results'),
      }),
      execute: async (args: {
        symptom: string;
        materiamedica?: string;
        remedy?: string;
        maxResults?: number;
      }) => client.searchMateriaMedica(args),
    },

    get_remedy_info: {
      description: 'Get detailed information about a specific homeopathic remedy.',
      parameters: z.object({
        remedy: z.string().describe('Remedy name or abbreviation'),
      }),
      execute: async (args: { remedy: string }) => client.getRemedyInfo(args),
    },

    list_available_repertories: {
      description: 'List all available homeopathic repertories.',
      parameters: z.object({
        language: z.string().optional().describe('Filter by language code (e.g., "en")'),
      }),
      execute: async (args: { language?: string }) => client.listRepertories(args),
    },

    list_available_materia_medicas: {
      description: 'List all available materia medica texts.',
      parameters: z.object({
        language: z.string().optional().describe('Filter by language code (e.g., "en")'),
      }),
      execute: async (args: { language?: string }) => client.listMateriaMedicas(args),
    },
  };
}

/**
 * Type for the tools object returned by createOOREPTools
 */
export type OOREPTools = ReturnType<typeof createOOREPTools>;

/**
 * Get specific tools from the full set
 *
 * @param client - OOREP SDK client instance
 * @param toolNames - Array of tool names to include
 * @returns Filtered tools object
 *
 * @example
 * ```typescript
 * const tools = getOOREPTools(client, ['search_repertory', 'get_remedy_info']);
 * ```
 */
export function getOOREPTools<K extends keyof OOREPTools>(
  client: OOREPSDKClient,
  toolNames: K[]
): Pick<OOREPTools, K> {
  const allTools = createOOREPTools(client);
  const result = {} as Pick<OOREPTools, K>;

  for (const name of toolNames) {
    result[name] = allTools[name];
  }

  return result;
}

/**
 * Create a single tool for more granular usage
 *
 * @example
 * ```typescript
 * const searchTool = createSearchRepertoryTool(client);
 * ```
 */
export function createSearchRepertoryTool(client: OOREPSDKClient) {
  return createOOREPTools(client).search_repertory;
}

export function createSearchMateriaMedicaTool(client: OOREPSDKClient) {
  return createOOREPTools(client).search_materia_medica;
}

export function createGetRemedyInfoTool(client: OOREPSDKClient) {
  return createOOREPTools(client).get_remedy_info;
}

export function createListRepertoriesTool(client: OOREPSDKClient) {
  return createOOREPTools(client).list_available_repertories;
}

export function createListMateriaMedicasTool(client: OOREPSDKClient) {
  return createOOREPTools(client).list_available_materia_medicas;
}

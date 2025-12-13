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
import type { OOREPClient } from '../client.js';
import type { ResourceContent } from '../resources.js';
import type { PromptResult } from '../prompts.js';
import { TOOL_NAMES } from '../constants.js';

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
export function createOOREPTools(client: OOREPClient) {
  return {
    [TOOL_NAMES.SEARCH_REPERTORY]: {
      description:
        'Search for symptoms in homeopathic repertories. Returns matching rubrics with remedies and their weights.',
      parameters: z.object({
        symptom: z
          .string()
          .describe('The symptom to search for. Supports wildcards (*) at end of words.'),
        repertory: z
          .string()
          .optional()
          .describe('Repertory abbreviation. Use list_available_repertories to discover options.'),
        minWeight: z.number().min(1).max(4).optional().describe('Minimum remedy weight (1-4)'),
        maxResults: z
          .number()
          .min(1)
          .max(500)
          .optional()
          .describe('Maximum results. Defaults to client config maxResults when omitted.'),
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

    [TOOL_NAMES.SEARCH_MATERIA_MEDICA]: {
      description: 'Search materia medica texts for remedy descriptions and symptoms.',
      parameters: z.object({
        symptom: z.string().describe('The symptom to search for'),
        materiamedica: z
          .string()
          .optional()
          .describe(
            'Materia medica abbreviation. Use list_available_materia_medicas to discover options.'
          ),
        remedy: z.string().optional().describe('Filter to specific remedy'),
        maxResults: z
          .number()
          .min(1)
          .max(500)
          .optional()
          .describe('Maximum results. Defaults to client config maxResults when omitted.'),
      }),
      execute: async (args: {
        symptom: string;
        materiamedica?: string;
        remedy?: string;
        maxResults?: number;
      }) => client.searchMateriaMedica(args),
    },

    [TOOL_NAMES.GET_REMEDY_INFO]: {
      description: 'Get detailed information about a specific homeopathic remedy.',
      parameters: z.object({
        remedy: z.string().describe('Remedy name or abbreviation'),
      }),
      execute: async (args: { remedy: string }) => client.getRemedyInfo(args),
    },

    [TOOL_NAMES.LIST_REPERTORIES]: {
      description: 'List all available homeopathic repertories.',
      parameters: z.object({
        language: z.string().optional().describe('Filter by language code (e.g., "en")'),
      }),
      execute: async (args: { language?: string }) => client.listRepertories(args),
    },

    [TOOL_NAMES.LIST_MATERIA_MEDICAS]: {
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
  client: OOREPClient,
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
export function createSearchRepertoryTool(client: OOREPClient) {
  return createOOREPTools(client).search_repertory;
}

export function createSearchMateriaMedicaTool(client: OOREPClient) {
  return createOOREPTools(client).search_materia_medica;
}

export function createGetRemedyInfoTool(client: OOREPClient) {
  return createOOREPTools(client).get_remedy_info;
}

export function createListRepertoriesTool(client: OOREPClient) {
  return createOOREPTools(client).list_available_repertories;
}

export function createListMateriaMedicasTool(client: OOREPClient) {
  return createOOREPTools(client).list_available_materia_medicas;
}

/**
 * Vercel AI SDK system message format for resources
 */
export interface VercelAIResourceMessage {
  role: 'system';
  content: string;
}

/**
 * Format a resource as a Vercel AI SDK system message
 *
 * Use this to inject resources (like search syntax help) into conversations
 * as system context.
 *
 * @param resource - Resource content from client.getResource()
 * @returns Vercel AI SDK-compatible system message
 *
 * @example
 * ```typescript
 * const searchSyntax = await client.getResource('oorep://help/search-syntax');
 * const systemMessage = vercelAIFormatResourceAsSystemMessage(searchSyntax);
 *
 * const result = await generateText({
 *   model: openai('gpt-5-mini'),
 *   system: systemMessage.content,
 *   messages: [{ role: 'user', content: 'Find headache remedies' }],
 *   tools,
 * });
 * ```
 */
export function vercelAIFormatResourceAsSystemMessage(
  resource: ResourceContent
): VercelAIResourceMessage {
  return {
    role: 'system',
    content: resource.text,
  };
}

/**
 * Format multiple resources as a combined context string
 *
 * Useful when you need to combine multiple resources into a single system message
 * or when integrating with other context management systems.
 *
 * @param resources - Array of resource contents
 * @returns Combined string with resource headers
 *
 * @example
 * ```typescript
 * const [searchHelp, remedies] = await Promise.all([
 *   client.getResource('oorep://help/search-syntax'),
 *   client.getResource('oorep://remedies/list'),
 * ]);
 * const context = vercelAIFormatResourcesAsContext([searchHelp, remedies]);
 * ```
 */
export function vercelAIFormatResourcesAsContext(resources: ResourceContent[]): string {
  return resources.map((r) => `## Resource: ${r.uri}\n\n${r.text}`).join('\n\n---\n\n');
}

/**
 * Vercel AI SDK message format (CoreMessage compatible)
 */
export interface VercelAIMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Convert an OOREP prompt to Vercel AI SDK messages
 *
 * Transforms PromptResult messages into the CoreMessage format expected by
 * Vercel AI SDK's generateText, streamText, and other functions.
 *
 * @param prompt - Prompt result from client.getPrompt()
 * @returns Array of Vercel AI SDK-compatible messages
 *
 * @example
 * ```typescript
 * const workflow = await client.getPrompt('repertorization-workflow');
 * const messages = convertPromptToVercelAI(workflow);
 *
 * const result = await generateText({
 *   model: openai('gpt-5-mini'),
 *   messages,
 *   tools,
 * });
 * ```
 */
export function convertPromptToVercelAI(prompt: PromptResult): VercelAIMessage[] {
  return prompt.messages.map((msg) => ({
    role: msg.role,
    content: msg.content.text,
  }));
}

/**
 * Get the system instruction string from a resource
 *
 * Convenience function for Vercel AI SDK's `system` parameter which takes
 * a string directly.
 *
 * @param resource - Resource content from client.getResource()
 * @returns Plain text content suitable for the `system` parameter
 *
 * @example
 * ```typescript
 * const searchSyntax = await client.getResource('oorep://help/search-syntax');
 * const systemInstruction = vercelAIGetSystemInstruction(searchSyntax);
 *
 * const result = await generateText({
 *   model: openai('gpt-5-mini'),
 *   system: systemInstruction,
 *   messages: [{ role: 'user', content: 'Find headache remedies' }],
 *   tools,
 * });
 * ```
 */
export function vercelAIGetSystemInstruction(resource: ResourceContent): string {
  return resource.text;
}

/**
 * Combine a system instruction with prompt messages for use with generateText
 *
 * Returns an object with both `system` and `messages` properties that can be
 * spread into generateText/streamText options.
 *
 * @param resource - Resource to use as system context
 * @param prompt - Prompt workflow
 * @returns Object with system and messages properties
 *
 * @example
 * ```typescript
 * const searchSyntax = await client.getResource('oorep://help/search-syntax');
 * const workflow = await client.getPrompt('analyze-symptoms', { symptom_description: 'headache' });
 * const { system, messages } = vercelAICombinePromptWithContext(searchSyntax, workflow);
 *
 * const result = await generateText({
 *   model: openai('gpt-5-mini'),
 *   system,
 *   messages,
 *   tools,
 * });
 * ```
 */
export function vercelAICombinePromptWithContext(
  resource: ResourceContent,
  prompt: PromptResult
): { system: string; messages: VercelAIMessage[] } {
  return {
    system: resource.text,
    messages: convertPromptToVercelAI(prompt),
  };
}

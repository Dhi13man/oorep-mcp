/**
 * LangChain Adapter
 *
 * Provides tools for use with LangChain.js and LangGraph.js.
 *
 * @example
 * ```typescript
 * import { ChatOpenAI } from '@langchain/openai';
 * import { createReactAgent } from '@langchain/langgraph/prebuilt';
 * import { createOOREPClient } from 'oorep-mcp/sdk';
 * import { createLangChainTools } from 'oorep-mcp/sdk/langchain';
 *
 * const client = createOOREPClient();
 * const tools = createLangChainTools(client);
 * const model = new ChatOpenAI({ model: 'gpt-4' });
 * const agent = createReactAgent({ llm: model, tools });
 *
 * const result = await agent.invoke({
 *   messages: [{ role: 'user', content: 'Find remedies for headache' }]
 * });
 * ```
 */

import { z } from 'zod';
import type { OOREPSDKClient } from '../client.js';

/**
 * LangChain-compatible tool interface
 *
 * This structure is compatible with LangChain's DynamicStructuredTool
 */
export interface LangChainToolDefinition {
  name: string;
  description: string;
  schema: z.ZodObject<Record<string, z.ZodType>>;
  func: (args: Record<string, unknown>) => Promise<string>;
}

/**
 * Create OOREP tools for use with LangChain
 *
 * These tools return JSON strings which is the expected format
 * for LangChain tool results.
 *
 * @param client - OOREP SDK client instance
 * @returns Array of LangChain-compatible tool definitions
 *
 * @example
 * ```typescript
 * import { DynamicStructuredTool } from '@langchain/core/tools';
 *
 * const toolDefs = createLangChainTools(client);
 * const tools = toolDefs.map(def => new DynamicStructuredTool(def));
 * ```
 */
export function createLangChainTools(client: OOREPSDKClient): LangChainToolDefinition[] {
  return [
    {
      name: 'search_repertory',
      description: 'Search for symptoms in homeopathic repertories. Returns matching rubrics with remedies and their weights.',
      schema: z.object({
        symptom: z.string().describe('The symptom to search for'),
        repertory: z.string().optional().describe('Repertory abbreviation'),
        minWeight: z.number().optional().describe('Minimum remedy weight (1-4)'),
        maxResults: z.number().optional().describe('Maximum results'),
        includeRemedyStats: z.boolean().optional().describe('Include remedy statistics'),
      }),
      func: async (args: Record<string, unknown>) => {
        const result = await client.searchRepertory({
          symptom: args.symptom as string,
          repertory: args.repertory as string | undefined,
          minWeight: args.minWeight as number | undefined,
          maxResults: args.maxResults as number | undefined,
          includeRemedyStats: args.includeRemedyStats as boolean | undefined,
        });
        return JSON.stringify(result, null, 2);
      },
    },
    {
      name: 'search_materia_medica',
      description: 'Search materia medica texts for remedy descriptions and symptoms.',
      schema: z.object({
        symptom: z.string().describe('The symptom to search for'),
        materiamedica: z.string().optional().describe('Materia medica abbreviation'),
        remedy: z.string().optional().describe('Filter to specific remedy'),
        maxResults: z.number().optional().describe('Maximum results'),
      }),
      func: async (args: Record<string, unknown>) => {
        const result = await client.searchMateriaMedica({
          symptom: args.symptom as string,
          materiamedica: args.materiamedica as string | undefined,
          remedy: args.remedy as string | undefined,
          maxResults: args.maxResults as number | undefined,
        });
        return JSON.stringify(result, null, 2);
      },
    },
    {
      name: 'get_remedy_info',
      description: 'Get detailed information about a specific homeopathic remedy.',
      schema: z.object({
        remedy: z.string().describe('Remedy name or abbreviation'),
      }),
      func: async (args: Record<string, unknown>) => {
        const result = await client.getRemedyInfo({
          remedy: args.remedy as string,
        });
        return JSON.stringify(result, null, 2);
      },
    },
    {
      name: 'list_available_repertories',
      description: 'List all available homeopathic repertories.',
      schema: z.object({
        language: z.string().optional().describe('Filter by language code'),
      }),
      func: async (args: Record<string, unknown>) => {
        const result = await client.listRepertories({
          language: args.language as string | undefined,
        });
        return JSON.stringify(result, null, 2);
      },
    },
    {
      name: 'list_available_materia_medicas',
      description: 'List all available materia medica texts.',
      schema: z.object({
        language: z.string().optional().describe('Filter by language code'),
      }),
      func: async (args: Record<string, unknown>) => {
        const result = await client.listMateriaMedicas({
          language: args.language as string | undefined,
        });
        return JSON.stringify(result, null, 2);
      },
    },
  ];
}

/**
 * Get specific LangChain tools by name
 *
 * @param client - OOREP SDK client instance
 * @param toolNames - Array of tool names to include
 * @returns Filtered array of tool definitions
 */
export function getLangChainTools(
  client: OOREPSDKClient,
  toolNames: string[]
): LangChainToolDefinition[] {
  const allTools = createLangChainTools(client);
  return allTools.filter((tool) => toolNames.includes(tool.name));
}

/**
 * Create tools ready for use with LangGraph agents
 *
 * This is a convenience function that creates an object format
 * that can be spread directly into agent configurations.
 *
 * @example
 * ```typescript
 * const toolsForAgent = createLangGraphTools(client);
 * // Use with LangGraph
 * ```
 */
export function createLangGraphTools(client: OOREPSDKClient) {
  const tools = createLangChainTools(client);

  return {
    tools,
    toolsByName: tools.reduce(
      (acc, tool) => {
        acc[tool.name] = tool;
        return acc;
      },
      {} as Record<string, LangChainToolDefinition>
    ),
  };
}

/**
 * Type guard to check if a value is a LangChainToolDefinition
 */
export function isLangChainToolDefinition(value: unknown): value is LangChainToolDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    'description' in value &&
    'schema' in value &&
    'func' in value
  );
}

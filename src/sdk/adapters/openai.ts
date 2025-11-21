/**
 * OpenAI Function Calling Adapter
 *
 * Provides tool definitions and execution helpers for use with
 * the OpenAI SDK's function calling / tool use features.
 *
 * @example
 * ```typescript
 * import OpenAI from 'openai';
 * import { createOOREPClient } from 'oorep-mcp/sdk';
 * import { openAITools, executeOpenAITool } from 'oorep-mcp/sdk/openai';
 *
 * const openai = new OpenAI();
 * const oorep = createOOREPClient();
 *
 * const response = await openai.chat.completions.create({
 *   model: 'gpt-4',
 *   messages: [{ role: 'user', content: 'Find remedies for headache' }],
 *   tools: openAITools
 * });
 *
 * // Handle tool calls
 * for (const call of response.choices[0].message.tool_calls ?? []) {
 *   const result = await executeOpenAITool(oorep, call.function.name, call.function.arguments);
 *   console.log(result);
 * }
 * ```
 */

import type { OOREPSDKClient } from '../client.js';
import { toolDefinitions } from '../tools.js';

/**
 * OpenAI tool definition format
 */
export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}

/**
 * Tool definitions in OpenAI function calling format
 */
export const openAITools: OpenAITool[] = toolDefinitions.map((tool) => ({
  type: 'function',
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  },
}));

/**
 * Get OpenAI tool definitions for specific tools
 *
 * @param toolNames - Array of tool names to include (if empty, returns all)
 */
export function getOpenAITools(toolNames?: string[]): OpenAITool[] {
  if (!toolNames || toolNames.length === 0) {
    return openAITools;
  }
  return openAITools.filter((tool) => toolNames.includes(tool.function.name));
}

/**
 * Execute an OOREP tool from an OpenAI function call
 *
 * @param client - OOREP SDK client instance
 * @param functionName - Name of the function to execute
 * @param argumentsJson - JSON string of function arguments
 * @returns Tool result as a JSON-serializable object
 */
export async function executeOpenAITool(
  client: OOREPSDKClient,
  functionName: string,
  argumentsJson: string
): Promise<unknown> {
  const args = JSON.parse(argumentsJson);
  return executeOOREPTool(client, functionName, args);
}

/**
 * Execute an OOREP tool with parsed arguments
 *
 * @param client - OOREP SDK client instance
 * @param toolName - Name of the tool to execute
 * @param args - Parsed tool arguments
 * @returns Tool result
 */
export async function executeOOREPTool(
  client: OOREPSDKClient,
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (toolName) {
    case 'search_repertory':
      return client.searchRepertory({
        symptom: args.symptom as string,
        repertory: args.repertory as string | undefined,
        minWeight: args.minWeight as number | undefined,
        maxResults: args.maxResults as number | undefined,
        includeRemedyStats: args.includeRemedyStats as boolean | undefined,
      });

    case 'search_materia_medica':
      return client.searchMateriaMedica({
        symptom: args.symptom as string,
        materiamedica: args.materiamedica as string | undefined,
        remedy: args.remedy as string | undefined,
        maxResults: args.maxResults as number | undefined,
      });

    case 'get_remedy_info':
      return client.getRemedyInfo({
        remedy: args.remedy as string,
      });

    case 'list_available_repertories':
      return client.listRepertories({
        language: args.language as string | undefined,
      });

    case 'list_available_materia_medicas':
      return client.listMateriaMedicas({
        language: args.language as string | undefined,
      });

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

/**
 * Create a tool executor function bound to a specific client
 *
 * @example
 * ```typescript
 * const executor = createToolExecutor(client);
 * const result = await executor('search_repertory', '{"symptom": "headache"}');
 * ```
 */
export function createToolExecutor(client: OOREPSDKClient) {
  return (functionName: string, argumentsJson: string) =>
    executeOpenAITool(client, functionName, argumentsJson);
}

/**
 * Format tool result for OpenAI message
 *
 * @param result - Tool execution result
 * @returns Formatted string for OpenAI tool message content
 */
export function formatToolResult(result: unknown): string {
  return JSON.stringify(result, null, 2);
}

/**
 * Helper to process OpenAI tool calls in a response
 *
 * @example
 * ```typescript
 * const response = await openai.chat.completions.create({ ... });
 * const toolMessages = await processToolCalls(client, response.choices[0].message.tool_calls);
 * ```
 */
export async function processToolCalls(
  client: OOREPSDKClient,
  toolCalls:
    | Array<{
        id: string;
        function: {
          name: string;
          arguments: string;
        };
      }>
    | undefined
): Promise<
  Array<{
    tool_call_id: string;
    role: 'tool';
    content: string;
  }>
> {
  if (!toolCalls || toolCalls.length === 0) {
    return [];
  }

  const results = await Promise.all(
    toolCalls.map(async (call) => {
      try {
        const result = await executeOpenAITool(client, call.function.name, call.function.arguments);
        return {
          tool_call_id: call.id,
          role: 'tool' as const,
          content: formatToolResult(result),
        };
      } catch (error) {
        return {
          tool_call_id: call.id,
          role: 'tool' as const,
          content: JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
          }),
        };
      }
    })
  );

  return results;
}

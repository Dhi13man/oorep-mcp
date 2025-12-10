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
 *   model: 'gpt-5',
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

import type { OOREPSDKClient, ResourceContent, PromptResult } from '../client.js';
import { toolDefinitions } from '../tools.js';
import { TOOL_NAMES } from '../constants.js';
import { NotFoundError } from '../../utils/errors.js';

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
 * @throws {SyntaxError} If argumentsJson is not valid JSON
 * @throws {NotFoundError} If functionName is not a recognized tool name
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
 * @throws {NotFoundError} If toolName is not a recognized tool name
 */
export async function executeOOREPTool(
  client: OOREPSDKClient,
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (toolName) {
    case TOOL_NAMES.SEARCH_REPERTORY:
      return client.searchRepertory({
        symptom: args.symptom as string,
        repertory: args.repertory as string | undefined,
        minWeight: args.minWeight as number | undefined,
        maxResults: args.maxResults as number | undefined,
        includeRemedyStats: args.includeRemedyStats as boolean | undefined,
      });

    case TOOL_NAMES.SEARCH_MATERIA_MEDICA:
      return client.searchMateriaMedica({
        symptom: args.symptom as string,
        materiamedica: args.materiamedica as string | undefined,
        remedy: args.remedy as string | undefined,
        maxResults: args.maxResults as number | undefined,
      });

    case TOOL_NAMES.GET_REMEDY_INFO:
      return client.getRemedyInfo({
        remedy: args.remedy as string,
      });

    case TOOL_NAMES.LIST_REPERTORIES:
      return client.listRepertories({
        language: args.language as string | undefined,
      });

    case TOOL_NAMES.LIST_MATERIA_MEDICAS:
      return client.listMateriaMedicas({
        language: args.language as string | undefined,
      });

    default:
      throw new NotFoundError(`Unknown tool: ${toolName}`, 'tool', toolName);
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

/**
 * OpenAI system message format for resources
 */
export interface OpenAIResourceMessage {
  role: 'system';
  content: string;
}

/**
 * Format a resource as an OpenAI system message
 *
 * Use this to inject resources (like search syntax help) into conversations
 * as system context.
 *
 * @param resource - Resource content from client.getResource()
 * @returns OpenAI-compatible system message
 *
 * @example
 * ```typescript
 * const searchSyntax = await client.getResource('oorep://help/search-syntax');
 * const systemMessage = openAIFormatResourceAsSystemMessage(searchSyntax);
 *
 * const response = await openai.chat.completions.create({
 *   model: 'gpt-5-mini',
 *   messages: [systemMessage, { role: 'user', content: 'Find headache remedies' }],
 *   tools: openAITools,
 * });
 * ```
 */
export function openAIFormatResourceAsSystemMessage(
  resource: ResourceContent
): OpenAIResourceMessage {
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
 * const context = openAIFormatResourcesAsContext([searchHelp, remedies]);
 * ```
 */
export function openAIFormatResourcesAsContext(resources: ResourceContent[]): string {
  return resources.map((r) => `## Resource: ${r.uri}\n\n${r.text}`).join('\n\n---\n\n');
}

/**
 * OpenAI chat completion message format
 */
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Convert an OOREP prompt to OpenAI chat completion messages
 *
 * Transforms PromptResult messages into the format expected by
 * OpenAI's chat completions API.
 *
 * @param prompt - Prompt result from client.getPrompt()
 * @returns Array of OpenAI-compatible messages
 *
 * @example
 * ```typescript
 * const workflow = await client.getPrompt('repertorization-workflow');
 * const messages = convertPromptToOpenAI(workflow);
 *
 * const response = await openai.chat.completions.create({
 *   model: 'gpt-5-mini',
 *   messages,
 *   tools: openAITools,
 * });
 * ```
 */
export function convertPromptToOpenAI(prompt: PromptResult): OpenAIMessage[] {
  return prompt.messages.map((msg) => ({
    role: msg.role,
    content: msg.content.text,
  }));
}

/**
 * Convert an OOREP prompt to OpenAI messages with a system context prefix
 *
 * Convenience function that combines a resource (as system message) with
 * a prompt workflow.
 *
 * @param resource - Resource to use as system context
 * @param prompt - Prompt workflow
 * @returns Array of OpenAI-compatible messages starting with system context
 *
 * @example
 * ```typescript
 * const searchSyntax = await client.getResource('oorep://help/search-syntax');
 * const workflow = await client.getPrompt('analyze-symptoms', { symptom_description: 'headache' });
 * const messages = openAIConvertPromptWithContext(searchSyntax, workflow);
 *
 * const response = await openai.chat.completions.create({
 *   model: 'gpt-5-mini',
 *   messages,
 *   tools: openAITools,
 * });
 * ```
 */
export function openAIConvertPromptWithContext(
  resource: ResourceContent,
  prompt: PromptResult
): OpenAIMessage[] {
  return [openAIFormatResourceAsSystemMessage(resource), ...convertPromptToOpenAI(prompt)];
}

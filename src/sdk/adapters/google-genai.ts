/**
 * Google Gemini (@google/genai) adapter for OOREP MCP tools
 *
 * Provides tool definitions compatible with Google's Generative AI SDK.
 * Uses FunctionDeclaration format with parametersJsonSchema.
 *
 * @example
 * ```typescript
 * import { GoogleGenAI } from '@google/genai';
 * import { geminiTools, createGeminiToolExecutors, executeGeminiFunctionCall } from 'oorep-mcp/sdk/adapters/google-genai';
 * import { OOREPSDKClient } from 'oorep-mcp/sdk/client';
 *
 * const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
 * const client = new OOREPSDKClient({ baseUrl: 'https://api.oorep.com' });
 * const executors = createGeminiToolExecutors(client);
 *
 * const response = await ai.models.generateContent({
 *   model: 'gemini-2.5-flash',
 *   contents: 'Search for headache remedies in homeopathy',
 *   config: { tools: geminiTools },
 * });
 *
 * // Handle function calls from response
 * if (response.functionCalls && response.functionCalls.length > 0) {
 *   const result = await executeGeminiFunctionCall(executors, response.functionCalls[0]);
 * }
 * ```
 */

import { toolDefinitions, type OOREPToolDefinition } from '../tools.js';
import type { OOREPSDKClient } from '../client.js';
import type { ResourceContent } from '../resources.js';
import type { PromptResult } from '../prompts.js';
import { TOOL_NAMES, type ToolName } from '../constants.js';
import type {
  SearchRepertoryArgs,
  SearchMateriaMedicaArgs,
  GetRemedyInfoArgs,
  ListRepertoriesArgs,
  ListMateriaMedicasArgs,
} from '../../utils/schemas.js';

/**
 * Fields that Gemini's function calling API does not support.
 * These are stripped from schemas to prevent 400 Bad Request errors.
 *
 * @see https://github.com/modelcontextprotocol/servers/issues/1624
 * @see https://github.com/googleapis/python-genai/issues/699
 */
const UNSUPPORTED_SCHEMA_FIELDS = ['default', 'exclusiveMinimum', 'exclusiveMaximum'] as const;

/**
 * Sanitize a JSON Schema for Gemini compatibility.
 * Removes fields that Gemini's API doesn't support.
 */
function sanitizeSchemaForGemini(
  parameters: OOREPToolDefinition['parameters']
): GeminiFunctionDeclaration['parametersJsonSchema'] {
  const sanitizedProperties: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(parameters.properties)) {
    const sanitizedValue = { ...value };
    for (const field of UNSUPPORTED_SCHEMA_FIELDS) {
      delete (sanitizedValue as Record<string, unknown>)[field];
    }
    sanitizedProperties[key] = sanitizedValue;
  }

  return {
    type: 'object',
    properties: sanitizedProperties,
    required: parameters.required,
  };
}

/**
 * Google Gemini function declaration format
 */
export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parametersJsonSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

/**
 * Google Gemini tool format (wraps function declarations)
 */
export interface GeminiTool {
  functionDeclarations: GeminiFunctionDeclaration[];
}

/**
 * Function call from Gemini response
 */
export interface GeminiFunctionCall {
  name: string;
  args: Record<string, unknown>;
}

/**
 * Static function declarations for Google Gemini
 *
 * These are the individual function definitions without the wrapper.
 * Schemas are sanitized to remove fields unsupported by Gemini's API.
 */
export const geminiFunctionDeclarations: GeminiFunctionDeclaration[] = toolDefinitions.map(
  (tool) => ({
    name: tool.name,
    description: tool.description,
    parametersJsonSchema: sanitizeSchemaForGemini(tool.parameters),
  })
);

/**
 * Pre-formatted tools array for GenerativeModel config
 *
 * Pass this directly to the `tools` parameter when creating a model or generating content.
 */
export const geminiTools: GeminiTool[] = [
  {
    functionDeclarations: geminiFunctionDeclarations,
  },
];

/**
 * Tool executor function type
 */
export type GeminiToolExecutor<TArgs = unknown, TResult = unknown> = (
  args: TArgs
) => Promise<TResult>;

/**
 * Map of tool executors keyed by tool name
 */
export type GeminiToolExecutors = {
  [K in ToolName]: GeminiToolExecutor<
    K extends typeof TOOL_NAMES.SEARCH_REPERTORY
      ? SearchRepertoryArgs
      : K extends typeof TOOL_NAMES.SEARCH_MATERIA_MEDICA
        ? SearchMateriaMedicaArgs
        : K extends typeof TOOL_NAMES.GET_REMEDY_INFO
          ? GetRemedyInfoArgs
          : K extends typeof TOOL_NAMES.LIST_REPERTORIES
            ? ListRepertoriesArgs
            : K extends typeof TOOL_NAMES.LIST_MATERIA_MEDICAS
              ? ListMateriaMedicasArgs
              : never
  >;
};

/**
 * Create tool executors for handling Gemini function calls
 *
 * @param client - Configured OOREP SDK client instance
 * @returns Map of tool name to executor function
 */
export function createGeminiToolExecutors(client: OOREPSDKClient): GeminiToolExecutors {
  return {
    [TOOL_NAMES.SEARCH_REPERTORY]: (args: SearchRepertoryArgs) => client.searchRepertory(args),
    [TOOL_NAMES.SEARCH_MATERIA_MEDICA]: (args: SearchMateriaMedicaArgs) =>
      client.searchMateriaMedica(args),
    [TOOL_NAMES.GET_REMEDY_INFO]: (args: GetRemedyInfoArgs) => client.getRemedyInfo(args),
    [TOOL_NAMES.LIST_REPERTORIES]: (args: ListRepertoriesArgs) => client.listRepertories(args),
    [TOOL_NAMES.LIST_MATERIA_MEDICAS]: (args: ListMateriaMedicasArgs) =>
      client.listMateriaMedicas(args),
  };
}

/**
 * Execute a function call from a Gemini response
 *
 * @param executors - Tool executors created by createGeminiToolExecutors
 * @param functionCall - Function call object from Gemini response
 * @returns Promise resolving to the function result
 * @throws Error if function name is unknown
 *
 * @example
 * ```typescript
 * const functionCall = response.candidates[0].content.parts[0].functionCall;
 * if (functionCall) {
 *   const result = await executeGeminiFunctionCall(executors, {
 *     name: functionCall.name,
 *     args: functionCall.args,
 *   });
 * }
 * ```
 */
export async function executeGeminiFunctionCall(
  executors: GeminiToolExecutors,
  functionCall: GeminiFunctionCall
): Promise<unknown> {
  const executor = executors[functionCall.name as ToolName];

  if (!executor) {
    throw new Error(
      `Unknown function: ${functionCall.name}. ` +
        `Available functions: ${Object.keys(executors).join(', ')}`
    );
  }

  return executor(functionCall.args as never);
}

/**
 * Format a resource as a system instruction string for Gemini
 *
 * Gemini uses a `systemInstruction` parameter that takes a plain string.
 * This function extracts the text content from a resource for direct use.
 *
 * @param resource - Resource content from client.getResource()
 * @returns Plain text content for the systemInstruction parameter
 *
 * @example
 * ```typescript
 * const searchSyntax = await client.getResource('oorep://help/search-syntax');
 * const systemInstruction = geminiFormatResourceAsSystemInstruction(searchSyntax);
 *
 * const response = await ai.models.generateContent({
 *   model: 'gemini-2.5-flash',
 *   systemInstruction,
 *   contents: 'Find remedies for headache',
 *   config: { tools: geminiTools },
 * });
 * ```
 */
export function geminiFormatResourceAsSystemInstruction(resource: ResourceContent): string {
  return resource.text;
}

/**
 * Format multiple resources as a combined system instruction
 *
 * Useful when you need to combine multiple resources into a single system instruction.
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
 * const systemInstruction = geminiFormatResourcesAsContext([searchHelp, remedies]);
 * ```
 */
export function geminiFormatResourcesAsContext(resources: ResourceContent[]): string {
  return resources.map((r) => `## Resource: ${r.uri}\n\n${r.text}`).join('\n\n---\n\n');
}

/**
 * Gemini Content part format
 */
export interface GeminiPart {
  text: string;
}

/**
 * Gemini Content format for a single message
 */
export interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

/**
 * Convert an OOREP prompt to Gemini Content format
 *
 * Transforms PromptResult messages into the Content array format expected by
 * Gemini's generateContent and chat APIs.
 *
 * Note: Gemini uses 'model' instead of 'assistant' for AI responses.
 *
 * @param prompt - Prompt result from client.getPrompt()
 * @returns Array of Gemini Content objects
 *
 * @example
 * ```typescript
 * const workflow = await client.getPrompt('repertorization-workflow');
 * const contents = convertPromptToGemini(workflow);
 *
 * const response = await ai.models.generateContent({
 *   model: 'gemini-2.5-flash',
 *   contents,
 *   config: { tools: geminiTools },
 * });
 * ```
 */
export function convertPromptToGemini(prompt: PromptResult): GeminiContent[] {
  return prompt.messages.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content.text }],
  }));
}

/**
 * Convert an OOREP prompt to Gemini format with system instruction
 *
 * Convenience function that returns both the system instruction and contents
 * in a format ready for Gemini's generateContent.
 *
 * @param resource - Resource to use as system context
 * @param prompt - Prompt workflow
 * @returns Object with systemInstruction and contents for Gemini API
 *
 * @example
 * ```typescript
 * const searchSyntax = await client.getResource('oorep://help/search-syntax');
 * const workflow = await client.getPrompt('analyze-symptoms', { symptom_description: 'headache' });
 * const { systemInstruction, contents } = geminiConvertPromptWithContext(searchSyntax, workflow);
 *
 * const response = await ai.models.generateContent({
 *   model: 'gemini-2.5-flash',
 *   systemInstruction,
 *   contents,
 *   config: { tools: geminiTools },
 * });
 * ```
 */
export function geminiConvertPromptWithContext(
  resource: ResourceContent,
  prompt: PromptResult
): { systemInstruction: string; contents: GeminiContent[] } {
  return {
    systemInstruction: resource.text,
    contents: convertPromptToGemini(prompt),
  };
}

/**
 * Create a chat history from a prompt for use with Gemini's chat API
 *
 * @param prompt - Prompt result from client.getPrompt()
 * @returns History array suitable for ai.chats.create({ history: ... })
 *
 * @example
 * ```typescript
 * const workflow = await client.getPrompt('repertorization-workflow');
 * const history = geminiCreateChatHistory(workflow);
 *
 * const chat = ai.chats.create({
 *   model: 'gemini-2.5-flash',
 *   history,
 *   config: { tools: geminiTools },
 * });
 * ```
 */
export function geminiCreateChatHistory(prompt: PromptResult): GeminiContent[] {
  return convertPromptToGemini(prompt);
}

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
 *   model: 'gemini-2.0-flash',
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
 * Map of tool executors
 */
export interface GeminiToolExecutors {
  search_repertory: GeminiToolExecutor<SearchRepertoryArgs>;
  search_materia_medica: GeminiToolExecutor<SearchMateriaMedicaArgs>;
  get_remedy_info: GeminiToolExecutor<GetRemedyInfoArgs>;
  list_available_repertories: GeminiToolExecutor<ListRepertoriesArgs>;
  list_available_materia_medicas: GeminiToolExecutor<ListMateriaMedicasArgs>;
}

/**
 * Create tool executors for handling Gemini function calls
 *
 * @param client - Configured OOREP SDK client instance
 * @returns Map of tool name to executor function
 */
export function createGeminiToolExecutors(client: OOREPSDKClient): GeminiToolExecutors {
  return {
    search_repertory: (args: SearchRepertoryArgs) => client.searchRepertory(args),
    search_materia_medica: (args: SearchMateriaMedicaArgs) => client.searchMateriaMedica(args),
    get_remedy_info: (args: GetRemedyInfoArgs) => client.getRemedyInfo(args),
    list_available_repertories: (args: ListRepertoriesArgs) => client.listRepertories(args),
    list_available_materia_medicas: (args: ListMateriaMedicasArgs) =>
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
  const executor = executors[functionCall.name as keyof GeminiToolExecutors];

  if (!executor) {
    throw new Error(
      `Unknown function: ${functionCall.name}. ` +
        `Available functions: ${Object.keys(executors).join(', ')}`
    );
  }

  return executor(functionCall.args as never);
}

/**
 * Tool name constants for type-safe tool references
 */
export const GEMINI_TOOL_NAMES = {
  SEARCH_REPERTORY: 'search_repertory',
  SEARCH_MATERIA_MEDICA: 'search_materia_medica',
  GET_REMEDY_INFO: 'get_remedy_info',
  LIST_AVAILABLE_REPERTORIES: 'list_available_repertories',
  LIST_AVAILABLE_MATERIA_MEDICAS: 'list_available_materia_medicas',
} as const;

/**
 * Type for tool names
 */
export type GeminiToolName = (typeof GEMINI_TOOL_NAMES)[keyof typeof GEMINI_TOOL_NAMES];

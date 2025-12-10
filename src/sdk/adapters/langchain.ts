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
 * const model = new ChatOpenAI({ model: 'gpt-5' });
 * const agent = createReactAgent({ llm: model, tools });
 *
 * const result = await agent.invoke({
 *   messages: [{ role: 'user', content: 'Find remedies for headache' }]
 * });
 * ```
 */

import { z } from '../../utils/schemas.js';
import type { OOREPSDKClient, ResourceContent, PromptResult } from '../client.js';

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
      description:
        'Search for symptoms in homeopathic repertories. Returns matching rubrics with remedies and their weights.',
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

// ==========================================================================
// Resource Adapters
// ==========================================================================

/**
 * LangChain SystemMessage-compatible format
 *
 * This interface matches LangChain's SystemMessage structure so it can be
 * used directly with LangChain agents and chains.
 */
export interface LangChainSystemMessage {
  type: 'system';
  content: string;
}

/**
 * LangChain HumanMessage-compatible format
 */
export interface LangChainHumanMessage {
  type: 'human';
  content: string;
}

/**
 * LangChain AIMessage-compatible format
 */
export interface LangChainAIMessage {
  type: 'ai';
  content: string;
}

/**
 * Union type for all LangChain message types we produce
 */
export type LangChainMessage = LangChainSystemMessage | LangChainHumanMessage | LangChainAIMessage;

/**
 * LangChain Document-compatible format for RAG and retrieval
 */
export interface LangChainDocument {
  pageContent: string;
  metadata: {
    uri: string;
    mimeType: string;
    source: 'oorep-mcp';
  };
}

/**
 * Format a resource as a LangChain SystemMessage-compatible object
 *
 * Use this to inject resources (like search syntax help) into conversations
 * as system context. The returned object can be passed to LangChain's
 * SystemMessage constructor or used directly with compatible APIs.
 *
 * @param resource - Resource content from client.getResource()
 * @returns LangChain SystemMessage-compatible object
 *
 * @example
 * ```typescript
 * import { SystemMessage } from '@langchain/core/messages';
 *
 * const searchSyntax = await client.getResource('oorep://help/search-syntax');
 * const sysMsg = langChainFormatResourceAsSystemMessage(searchSyntax);
 * const systemMessage = new SystemMessage(sysMsg.content);
 * ```
 */
export function langChainFormatResourceAsSystemMessage(resource: ResourceContent): LangChainSystemMessage {
  return {
    type: 'system',
    content: resource.text,
  };
}

/**
 * Format a resource as a LangChain Document for RAG/retrieval use cases
 *
 * This is useful when you want to include resources in a vector store
 * or use them with LangChain's retrieval-augmented generation patterns.
 *
 * @param resource - Resource content from client.getResource()
 * @returns LangChain Document-compatible object
 *
 * @example
 * ```typescript
 * import { Document } from '@langchain/core/documents';
 *
 * const searchSyntax = await client.getResource('oorep://help/search-syntax');
 * const doc = langChainFormatResourceAsDocument(searchSyntax);
 * // Use with vector stores or retrievers
 * ```
 */
export function langChainFormatResourceAsDocument(resource: ResourceContent): LangChainDocument {
  return {
    pageContent: resource.text,
    metadata: {
      uri: resource.uri,
      mimeType: resource.mimeType,
      source: 'oorep-mcp',
    },
  };
}

/**
 * Format multiple resources as LangChain Documents
 *
 * @param resources - Array of resource contents
 * @returns Array of LangChain Document-compatible objects
 *
 * @example
 * ```typescript
 * const resources = await Promise.all([
 *   client.getResource('oorep://help/search-syntax'),
 *   client.getResource('oorep://remedies/list'),
 * ]);
 * const documents = langChainFormatResourcesAsDocuments(resources);
 * ```
 */
export function langChainFormatResourcesAsDocuments(resources: ResourceContent[]): LangChainDocument[] {
  return resources.map(langChainFormatResourceAsDocument);
}

/**
 * Format multiple resources as a combined context string
 *
 * Useful when you need to combine multiple resources into a single system message.
 *
 * @param resources - Array of resource contents
 * @returns Combined string with resource headers
 */
export function langChainFormatResourcesAsContext(resources: ResourceContent[]): string {
  return resources
    .map((r) => `## Resource: ${r.uri}\n\n${r.text}`)
    .join('\n\n---\n\n');
}

// ==========================================================================
// Prompt Adapters
// ==========================================================================

/**
 * Convert an OOREP prompt to LangChain message format
 *
 * Transforms PromptResult messages into objects compatible with LangChain's
 * message classes (HumanMessage, AIMessage).
 *
 * @param prompt - Prompt result from client.getPrompt()
 * @returns Array of LangChain message-compatible objects
 *
 * @example
 * ```typescript
 * import { HumanMessage, AIMessage } from '@langchain/core/messages';
 *
 * const workflow = await client.getPrompt('repertorization-workflow');
 * const messageData = convertPromptToLangChain(workflow);
 *
 * // Convert to actual LangChain message instances
 * const messages = messageData.map(msg =>
 *   msg.type === 'human' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
 * );
 * ```
 */
export function convertPromptToLangChain(
  prompt: PromptResult
): Array<LangChainHumanMessage | LangChainAIMessage> {
  return prompt.messages.map((msg) => {
    if (msg.role === 'user') {
      return {
        type: 'human' as const,
        content: msg.content.text,
      };
    } else {
      return {
        type: 'ai' as const,
        content: msg.content.text,
      };
    }
  });
}

/**
 * Convert an OOREP prompt to LangChain messages with system context
 *
 * Convenience function that combines a resource (as system message) with
 * a prompt workflow.
 *
 * @param resource - Resource to use as system context
 * @param prompt - Prompt workflow
 * @returns Array of LangChain message-compatible objects starting with system
 *
 * @example
 * ```typescript
 * import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
 *
 * const searchSyntax = await client.getResource('oorep://help/search-syntax');
 * const workflow = await client.getPrompt('analyze-symptoms');
 * const messageData = langChainConvertPromptWithContext(searchSyntax, workflow);
 *
 * // Convert to actual LangChain message instances
 * const messages = messageData.map(msg => {
 *   switch (msg.type) {
 *     case 'system': return new SystemMessage(msg.content);
 *     case 'human': return new HumanMessage(msg.content);
 *     case 'ai': return new AIMessage(msg.content);
 *   }
 * });
 * ```
 */
export function langChainConvertPromptWithContext(
  resource: ResourceContent,
  prompt: PromptResult
): LangChainMessage[] {
  return [
    langChainFormatResourceAsSystemMessage(resource),
    ...convertPromptToLangChain(prompt),
  ];
}

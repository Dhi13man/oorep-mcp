/**
 * OOREP MCP Server
 * Main server implementation that registers tools, resources, and prompts
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { getConfig } from './config.js';
import { ToolRegistry } from './tools/index.js';
import { ResourceRegistry } from './resources/index.js';
import { PromptRegistry } from './prompts/index.js';
import { logger, LogLevel } from './utils/logger.js';
import { sanitizeError } from './utils/errors.js';
// Import package.json for version info - TypeScript will handle this correctly during compilation
import packageJson from '../package.json' with { type: 'json' };

export interface ServerContext {
  server: Server;
  toolRegistry: ToolRegistry;
  resourceRegistry: ResourceRegistry;
  promptRegistry: PromptRegistry;
}

export async function createServer(): Promise<ServerContext> {
  // Load configuration
  const config = getConfig();
  logger.setLevel(config.logLevel as LogLevel);

  // Initialize registries
  const toolRegistry = new ToolRegistry(config);
  const resourceRegistry = new ResourceRegistry(config);
  const promptRegistry = new PromptRegistry();

  // Create MCP server
  const server = new Server(
    {
      name: 'oorep-mcp',
      version: packageJson.version,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  // Register tool list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug('Handling list_tools request');
    const tools = toolRegistry.getDefinitions();
    return { tools };
  });

  // Register tool execution handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    logger.debug('Handling call_tool request', { tool: request.params.name });

    try {
      const result = await toolRegistry.executeTool(request.params.name, request.params.arguments);

      // Get tool definition to check for outputSchema
      const toolDef = toolRegistry.getDefinitions().find((t) => t.name === request.params.name);

      // Build response with both content and structuredContent for MCP compliance
      const response: {
        content: Array<{ type: string; text: string }>;
        structuredContent?: Record<string, unknown>;
      } = {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };

      // Include structuredContent when tool has outputSchema (MCP 2025-06-18 spec)
      if (toolDef?.outputSchema) {
        response.structuredContent = result as Record<string, unknown>;
      }

      return response;
    } catch (error) {
      logger.error('Tool execution failed', error);
      const sanitized = sanitizeError(error);

      // Return error with isError flag for MCP compliance
      // This allows LLMs to see and potentially self-correct
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${sanitized.message}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Register resource list handler
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    logger.debug('Handling list_resources request');
    const resources = resourceRegistry.getDefinitions();
    return { resources };
  });

  // Register resource read handler
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    logger.debug('Handling read_resource request', { uri: request.params.uri });

    try {
      const resource = await resourceRegistry.getResource(request.params.uri);
      return resource;
    } catch (error) {
      logger.error('Resource read failed', error);
      const sanitized = sanitizeError(error);
      throw new Error(sanitized.message);
    }
  });

  // Register prompt list handler
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    logger.debug('Handling list_prompts request');
    const prompts = promptRegistry.getDefinitions();
    return { prompts };
  });

  // Register prompt get handler
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    logger.debug('Handling get_prompt request', { prompt: request.params.name });

    try {
      const prompt = await promptRegistry.getPrompt(request.params.name, request.params.arguments);
      return prompt;
    } catch (error) {
      logger.error('Prompt get failed', error);
      const sanitized = sanitizeError(error);
      throw new Error(sanitized.message);
    }
  });

  logger.info('OOREP MCP Server initialized', {
    tools: toolRegistry.getDefinitions().length,
    resources: resourceRegistry.getDefinitions().length,
    prompts: promptRegistry.getDefinitions().length,
  });

  return { server, toolRegistry, resourceRegistry, promptRegistry };
}

export async function runServer() {
  logger.info('Starting OOREP MCP Server...');

  try {
    const { server, toolRegistry, resourceRegistry } = await createServer();
    const transport = new StdioServerTransport();

    // Set up graceful shutdown handlers
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      try {
        // Clean up registries
        await toolRegistry.destroy();
        await resourceRegistry.destroy();
        // PromptRegistry is stateless, no cleanup needed

        await server.close();
        logger.info('Server closed successfully');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    await server.connect(transport);

    logger.info('OOREP MCP Server running on stdio');
  } catch (error) {
    logger.error('Failed to start OOREP MCP Server', error);
    process.exit(1);
  }
}

/**
 * Tool registration and exports
 *
 * This module manages MCP tools by delegating to a shared OOREPClient instance.
 * The SDK is the single source of truth for all tool logic.
 */

import type { OOREPConfig } from '../config.js';
import { OOREPClient, type OOREPSDKConfig } from '../sdk/client.js';
import { logger } from '../utils/logger.js';
import { NotFoundError } from '../utils/errors.js';
import { SearchRepertoryTool, searchRepertoryToolDefinition } from './search-repertory.js';
import {
  SearchMateriaMedicaTool,
  searchMateriaMedicaToolDefinition,
} from './search-materia-medica.js';
import { GetRemedyInfoTool, getRemedyInfoToolDefinition } from './get-remedy-info.js';
import { ListRepertoriesTool, listRepertoriesToolDefinition } from './list-repertories.js';
import {
  ListMateriaMedicasTool,
  listMateriaMedicasToolDefinition,
} from './list-materia-medicas.js';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  outputSchema?: {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

export interface ToolHandler {
  execute(args: unknown): Promise<unknown>;
}

export class ToolRegistry {
  private tools = new Map<string, ToolHandler>();
  private definitions: ToolDefinition[] = [];
  private sdk: OOREPClient;

  constructor(config: OOREPConfig) {
    // Create single shared SDK instance for all tools
    const sdkConfig: OOREPSDKConfig = {
      baseUrl: config.baseUrl,
      timeoutMs: config.timeoutMs,
      cacheTtlMs: config.cacheTtlMs,
      maxResults: config.maxResults,
      remoteUser: config.remoteUser,
      defaultRepertory: config.defaultRepertory,
      defaultMateriaMedica: config.defaultMateriaMedica,
      logger,
    };
    this.sdk = new OOREPClient(sdkConfig);
    this.registerAllTools();
  }

  private registerAllTools(): void {
    // Register all tools with shared SDK instance
    this.registerTool(searchRepertoryToolDefinition, new SearchRepertoryTool(this.sdk));
    this.registerTool(searchMateriaMedicaToolDefinition, new SearchMateriaMedicaTool(this.sdk));
    this.registerTool(getRemedyInfoToolDefinition, new GetRemedyInfoTool(this.sdk));
    this.registerTool(listRepertoriesToolDefinition, new ListRepertoriesTool(this.sdk));
    this.registerTool(listMateriaMedicasToolDefinition, new ListMateriaMedicasTool(this.sdk));
  }

  private registerTool(definition: ToolDefinition, handler: ToolHandler): void {
    this.tools.set(definition.name, handler);
    this.definitions.push(definition);
  }

  getTool(name: string): ToolHandler | undefined {
    return this.tools.get(name);
  }

  getDefinitions(): ToolDefinition[] {
    return this.definitions;
  }

  /**
   * Execute a tool by name with the provided arguments
   *
   * @param name - The tool name to execute
   * @param args - The arguments to pass to the tool
   * @returns Promise resolving to the tool result
   * @throws {NotFoundError} If the tool name is not found
   */
  async executeTool(name: string, args: unknown): Promise<unknown> {
    const tool = this.getTool(name);
    if (!tool) {
      throw new NotFoundError(`Tool "${name}" not found`, 'tool', name);
    }
    return tool.execute(args);
  }

  /**
   * Clean up resources - destroys the shared SDK instance
   */
  async destroy(): Promise<void> {
    await this.sdk.destroy();
  }
}

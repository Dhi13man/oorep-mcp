/**
 * Tool registration and exports
 */

import type { OOREPConfig } from '../config.js';
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
}

export interface ToolHandler {
  execute(args: unknown): Promise<unknown>;
}

export class ToolRegistry {
  private tools = new Map<string, ToolHandler>();
  private definitions: ToolDefinition[] = [];

  constructor(private config: OOREPConfig) {
    this.registerAllTools();
  }

  private registerAllTools(): void {
    // Register search_repertory
    this.registerTool(searchRepertoryToolDefinition, new SearchRepertoryTool(this.config));

    // Register search_materia_medica
    this.registerTool(searchMateriaMedicaToolDefinition, new SearchMateriaMedicaTool(this.config));

    // Register get_remedy_info
    this.registerTool(getRemedyInfoToolDefinition, new GetRemedyInfoTool(this.config));

    // Register list_available_repertories
    this.registerTool(listRepertoriesToolDefinition, new ListRepertoriesTool(this.config));

    // Register list_available_materia_medicas
    this.registerTool(listMateriaMedicasToolDefinition, new ListMateriaMedicasTool(this.config));
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

  async executeTool(name: string, args: unknown): Promise<unknown> {
    const tool = this.getTool(name);
    if (!tool) {
      throw new Error(`Tool "${name}" not found`);
    }
    return tool.execute(args);
  }
}

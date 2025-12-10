/**
 * Tool definitions for OOREP in various formats
 *
 * These definitions can be used to build custom integrations
 * with different AI SDKs.
 */

import { TOOL_NAMES } from './constants.js';

// Re-export for convenience
export type { ToolName } from './constants.js';
export { TOOL_NAMES, ALL_TOOL_NAMES } from './constants.js';

/**
 * Generic tool definition that can be converted to various formats
 */
export interface OOREPToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<
      string,
      {
        type: string;
        description: string;
        enum?: string[];
        minimum?: number;
        maximum?: number;
        default?: unknown;
      }
    >;
    required: string[];
  };
}

/**
 * All OOREP tool definitions
 */
export const toolDefinitions: OOREPToolDefinition[] = [
  {
    name: TOOL_NAMES.SEARCH_REPERTORY,
    description:
      'Search for symptoms in homeopathic repertories. Returns matching rubrics with remedies and their weights. Useful for finding remedies associated with specific symptoms.',
    parameters: {
      type: 'object',
      properties: {
        symptom: {
          type: 'string',
          description:
            'The symptom to search for. Supports wildcards (*) at end of words and exclusions with quotes. Example: "head*" or "headache -migraine"',
        },
        repertory: {
          type: 'string',
          description:
            'Repertory abbreviation to search in (e.g., "kent", "publicum"). If not specified, uses the default repertory.',
        },
        minWeight: {
          type: 'number',
          description:
            'Minimum remedy weight/grade to include (1-4). Higher weights indicate stronger associations.',
          minimum: 1,
          maximum: 4,
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of rubrics to return',
          minimum: 1,
          maximum: 100,
          default: 20,
        },
        includeRemedyStats: {
          type: 'boolean',
          description: 'Include aggregated remedy statistics across all matching rubrics',
          default: true,
        },
      },
      required: ['symptom'],
    },
  },
  {
    name: TOOL_NAMES.SEARCH_MATERIA_MEDICA,
    description:
      'Search materia medica texts for remedy descriptions and symptoms. Returns sections from materia medica books that match the search term.',
    parameters: {
      type: 'object',
      properties: {
        symptom: {
          type: 'string',
          description: 'The symptom or term to search for in materia medica texts',
        },
        materiamedica: {
          type: 'string',
          description:
            'Materia medica abbreviation to search in (e.g., "boericke", "kent"). If not specified, uses the default.',
        },
        remedy: {
          type: 'string',
          description: 'Filter results to a specific remedy name or abbreviation',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results to return',
          minimum: 1,
          maximum: 50,
          default: 10,
        },
      },
      required: ['symptom'],
    },
  },
  {
    name: TOOL_NAMES.GET_REMEDY_INFO,
    description:
      'Get detailed information about a specific homeopathic remedy including its full name, abbreviation, and alternative names.',
    parameters: {
      type: 'object',
      properties: {
        remedy: {
          type: 'string',
          description:
            'Remedy name or abbreviation to look up (case-insensitive). Examples: "acon", "Aconitum", "bell"',
        },
      },
      required: ['remedy'],
    },
  },
  {
    name: TOOL_NAMES.LIST_REPERTORIES,
    description:
      'List all available homeopathic repertories with their metadata including title, author, and language.',
    parameters: {
      type: 'object',
      properties: {
        language: {
          type: 'string',
          description:
            'Filter repertories by language code (e.g., "en" for English, "de" for German)',
        },
      },
      required: [],
    },
  },
  {
    name: TOOL_NAMES.LIST_MATERIA_MEDICAS,
    description:
      'List all available materia medica texts with their metadata including title, author, and language.',
    parameters: {
      type: 'object',
      properties: {
        language: {
          type: 'string',
          description:
            'Filter materia medicas by language code (e.g., "en" for English, "de" for German)',
        },
      },
      required: [],
    },
  },
];

/**
 * Get a tool definition by name
 */
export function getToolDefinition(name: string): OOREPToolDefinition | undefined {
  return toolDefinitions.find((tool) => tool.name === name);
}

/**
 * Get all tool names
 */
export function getToolNames(): string[] {
  return toolDefinitions.map((tool) => tool.name);
}

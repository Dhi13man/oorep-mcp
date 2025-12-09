/**
 * OOREP SDK Constants - Single Source of Truth
 *
 * This file defines all constant values for tools, resources, and prompts.
 * All other modules should import from here to ensure consistency.
 */

// ============================================================================
// Tool Names
// ============================================================================

/**
 * Tool name constants - use these instead of hardcoded strings
 */
export const TOOL_NAMES = {
  SEARCH_REPERTORY: 'search_repertory',
  SEARCH_MATERIA_MEDICA: 'search_materia_medica',
  GET_REMEDY_INFO: 'get_remedy_info',
  LIST_REPERTORIES: 'list_available_repertories',
  LIST_MATERIA_MEDICAS: 'list_available_materia_medicas',
} as const;

/**
 * Array of all tool names for iteration
 */
export const ALL_TOOL_NAMES = Object.values(TOOL_NAMES);

/**
 * Type representing valid tool names
 */
export type ToolName = (typeof TOOL_NAMES)[keyof typeof TOOL_NAMES];

// ============================================================================
// Resource URIs
// ============================================================================

/**
 * Resource URI constants - use these instead of hardcoded strings
 */
export const RESOURCE_URIS = {
  REMEDIES_LIST: 'oorep://remedies/list',
  REPERTORIES_LIST: 'oorep://repertories/list',
  MATERIA_MEDICAS_LIST: 'oorep://materia-medicas/list',
  SEARCH_SYNTAX_HELP: 'oorep://help/search-syntax',
} as const;

/**
 * Array of all resource URIs for iteration
 */
export const ALL_RESOURCE_URIS = Object.values(RESOURCE_URIS);

/**
 * Type representing valid resource URIs
 */
export type ResourceUri = (typeof RESOURCE_URIS)[keyof typeof RESOURCE_URIS];

// ============================================================================
// Prompt Names
// ============================================================================

/**
 * Prompt name constants - use these instead of hardcoded strings
 */
export const PROMPT_NAMES = {
  ANALYZE_SYMPTOMS: 'analyze-symptoms',
  REMEDY_COMPARISON: 'remedy-comparison',
  REPERTORIZATION_WORKFLOW: 'repertorization-workflow',
} as const;

/**
 * Array of all prompt names for iteration
 */
export const ALL_PROMPT_NAMES = Object.values(PROMPT_NAMES);

/**
 * Type representing valid prompt names
 */
export type PromptName = (typeof PROMPT_NAMES)[keyof typeof PROMPT_NAMES];

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default configuration values
 */
export const DEFAULTS = {
  BASE_URL: 'https://www.oorep.com',
  TIMEOUT_MS: 30000,
  CACHE_TTL_MS: 300000, // 5 minutes
  MAX_RESULTS: 100,
  LOG_LEVEL: 'info',
  REPERTORY: 'publicum',
  MATERIA_MEDICA: 'boericke',
} as const;

// ============================================================================
// MIME Types
// ============================================================================

/**
 * MIME type constants for resources
 */
export const MIME_TYPES = {
  JSON: 'application/json',
  MARKDOWN: 'text/markdown',
} as const;

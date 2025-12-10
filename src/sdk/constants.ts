export const TOOL_NAMES = {
  SEARCH_REPERTORY: 'search_repertory',
  SEARCH_MATERIA_MEDICA: 'search_materia_medica',
  GET_REMEDY_INFO: 'get_remedy_info',
  LIST_REPERTORIES: 'list_available_repertories',
  LIST_MATERIA_MEDICAS: 'list_available_materia_medicas',
} as const;

export const ALL_TOOL_NAMES = Object.values(TOOL_NAMES);
export type ToolName = (typeof TOOL_NAMES)[keyof typeof TOOL_NAMES];

export const RESOURCE_URIS = {
  REMEDIES_LIST: 'oorep://remedies/list',
  REPERTORIES_LIST: 'oorep://repertories/list',
  MATERIA_MEDICAS_LIST: 'oorep://materia-medicas/list',
  SEARCH_SYNTAX_HELP: 'oorep://help/search-syntax',
} as const;

export const ALL_RESOURCE_URIS = Object.values(RESOURCE_URIS);
export type ResourceUri = (typeof RESOURCE_URIS)[keyof typeof RESOURCE_URIS];

export const PROMPT_NAMES = {
  ANALYZE_SYMPTOMS: 'analyze-symptoms',
  REMEDY_COMPARISON: 'remedy-comparison',
  REPERTORIZATION_WORKFLOW: 'repertorization-workflow',
} as const;

export const ALL_PROMPT_NAMES = Object.values(PROMPT_NAMES);
export type PromptName = (typeof PROMPT_NAMES)[keyof typeof PROMPT_NAMES];

export const DEFAULTS = {
  BASE_URL: 'https://www.oorep.com',
  TIMEOUT_MS: 30000,
  CACHE_TTL_MS: 300000,
  MAX_RESULTS: 100,
  LOG_LEVEL: 'info',
  REPERTORY: 'publicum',
  MATERIA_MEDICA: 'boericke',
} as const;

export const MIME_TYPES = {
  JSON: 'application/json',
  MARKDOWN: 'text/markdown',
} as const;

/**
 * Interface for OOREP SDK Client
 *
 * This interface defines the public API of OOREPSDKClient, enabling:
 * - Dependency injection for tools and registries
 * - Easy mocking in unit tests without type casting
 * - Swappable implementations (e.g., mock client for testing)
 */

import type {
  RepertorySearchResult,
  MateriaMedicaSearchResult,
  RemedyInfo,
  RepertoryMetadata,
  MateriaMedicaMetadata,
} from '../utils/schemas.js';

import type {
  ResourceUri,
  ResourceContent,
  PromptName,
  PromptResult,
  AnalyzeSymptomsArgs,
  RemedyComparisonArgs,
} from '../sdk/client.js';

/**
 * Search repertory arguments
 */
export interface SearchRepertoryArgs {
  symptom: string;
  repertory?: string;
  minWeight?: number;
  maxResults?: number;
  includeRemedyStats?: boolean;
}

/**
 * Search materia medica arguments
 */
export interface SearchMateriaMedicaArgs {
  symptom: string;
  materiamedica?: string;
  remedy?: string;
  maxResults?: number;
}

/**
 * Get remedy info arguments
 */
export interface GetRemedyInfoArgs {
  remedy: string;
}

/**
 * List repertories/materia medicas arguments
 */
export interface ListByLanguageArgs {
  language?: string;
}

/**
 * Resource definition returned by listResources()
 */
export interface ResourceDefinition {
  uri: ResourceUri;
  name: string;
  description: string;
  mimeType: string;
}

/**
 * Prompt definition returned by listPrompts()
 */
export interface PromptDefinition {
  name: PromptName;
  description: string;
  arguments?: Array<{ name: string; description: string; required: boolean }>;
}

/**
 * Interface for OOREP SDK Client
 *
 * Implementations:
 * - OOREPSDKClient: Production implementation with caching and deduplication
 * - Mock implementations: For unit testing
 */
export interface IOOREPSDKClient {
  // Tool methods
  searchRepertory(args: SearchRepertoryArgs): Promise<RepertorySearchResult>;
  searchMateriaMedica(args: SearchMateriaMedicaArgs): Promise<MateriaMedicaSearchResult>;
  getRemedyInfo(args: GetRemedyInfoArgs): Promise<RemedyInfo | null>;
  listRepertories(args?: ListByLanguageArgs): Promise<RepertoryMetadata[]>;
  listMateriaMedicas(args?: ListByLanguageArgs): Promise<MateriaMedicaMetadata[]>;

  // Resource methods
  listResources(): ResourceDefinition[];
  getResource(uri: ResourceUri): Promise<ResourceContent>;

  // Prompt methods
  listPrompts(): PromptDefinition[];
  getPrompt(name: 'analyze-symptoms', args?: AnalyzeSymptomsArgs): Promise<PromptResult>;
  getPrompt(name: 'remedy-comparison', args: RemedyComparisonArgs): Promise<PromptResult>;
  getPrompt(name: 'repertorization-workflow'): Promise<PromptResult>;
  getPrompt(
    name: PromptName,
    args?: AnalyzeSymptomsArgs | RemedyComparisonArgs
  ): Promise<PromptResult>;

  // Lifecycle methods
  clearCache(): Promise<void>;
  destroy(): Promise<void>;
}

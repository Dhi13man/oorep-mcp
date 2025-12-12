/**
 * Interface for OOREP Client
 *
 * This interface defines the public API of OOREPClient, enabling:
 * - Dependency injection for tools and registries
 * - Easy mocking in unit tests without type casting
 * - Swappable implementations (e.g., mock client for testing)
 *
 * Note: Resource and prompt access are now standalone functions exported
 * from the main `oorep-mcp` package.
 */

import type {
  RepertorySearchResult,
  MateriaMedicaSearchResult,
  RemedyInfo,
  RepertoryMetadata,
  MateriaMedicaMetadata,
} from '../utils/schemas.js';

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
 * Interface for OOREP Client
 *
 * Implementations:
 * - OOREPClient: Production implementation with caching and deduplication
 * - Mock implementations: For unit testing
 */
export interface IOOREPClient {
  // Tool methods
  searchRepertory(args: SearchRepertoryArgs): Promise<RepertorySearchResult>;
  searchMateriaMedica(args: SearchMateriaMedicaArgs): Promise<MateriaMedicaSearchResult>;
  getRemedyInfo(args: GetRemedyInfoArgs): Promise<RemedyInfo | null>;
  listRepertories(args?: ListByLanguageArgs): Promise<RepertoryMetadata[]>;
  listMateriaMedicas(args?: ListByLanguageArgs): Promise<MateriaMedicaMetadata[]>;

  // Lifecycle methods
  clearCache(): Promise<void>;
  destroy(): Promise<void>;
}

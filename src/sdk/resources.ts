/**
 * Resource definitions and access for OOREP SDK
 *
 * This module provides:
 * - Resource definitions (metadata) for all OOREP resources
 * - Functions to fetch resource content
 * - Functions to list available resources
 *
 * These can be used to build custom integrations with different AI SDKs.
 */

import { RESOURCE_URIS, type ResourceUri } from './constants.js';
import type { OOREPHttpClient } from '../lib/oorep-client.js';
import { NotFoundError } from '../utils/errors.js';

// Re-export for convenience
export type { ResourceUri } from './constants.js';
export { RESOURCE_URIS, ALL_RESOURCE_URIS } from './constants.js';

// Re-export types from resources module
export type { ResourceContent, ResourceDefinition } from '../resources/index.js';

// Import fetch functions and definitions from resources module
import {
  fetchRemediesList,
  fetchRepertoriesList,
  fetchMateriaMedicasList,
  getSearchSyntaxHelp as getSearchSyntaxHelpStatic,
  remediesListDefinition,
  repertoriesListDefinition,
  materiaMedicasListDefinition,
  searchSyntaxHelpDefinition,
  type ResourceContent,
  type ResourceDefinition,
} from '../resources/index.js';

/**
 * Generic resource definition that can be converted to various formats
 */
export interface OOREPResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

/**
 * All OOREP resource definitions (imported from source modules to avoid duplication)
 */
export const resourceDefinitions: OOREPResourceDefinition[] = [
  remediesListDefinition,
  repertoriesListDefinition,
  materiaMedicasListDefinition,
  searchSyntaxHelpDefinition,
];

/**
 * Get a resource definition by URI
 */
export function getResourceDefinition(uri: string): OOREPResourceDefinition | undefined {
  return resourceDefinitions.find((resource) => resource.uri === uri);
}

/**
 * Get all resource URIs
 */
export function getResourceUris(): string[] {
  return resourceDefinitions.map((resource) => resource.uri);
}

/**
 * List all available resources with their metadata
 *
 * @example
 * ```typescript
 * import { listResources } from 'oorep-mcp';
 *
 * const resources = listResources();
 * console.log(resources);
 * // [{ uri: 'oorep://remedies/list', name: 'Available Remedies List', ... }, ...]
 * ```
 */
export function listResources(): ResourceDefinition[] {
  return resourceDefinitions.map((def) => ({
    uri: def.uri as ResourceUri,
    name: def.name,
    description: def.description,
    mimeType: def.mimeType,
  }));
}

/**
 * Get a resource by URI
 *
 * For resources that require API calls (remedies list, repertories list, materia medicas list),
 * you must provide an OOREPClient instance.
 *
 * For static resources (search syntax help), no client is needed.
 *
 * @param uri - The resource URI to fetch
 * @param client - Optional OOREPClient for resources that require API calls
 * @returns Promise resolving to the resource content
 * @throws {NotFoundError} If the resource URI is not recognized
 * @throws {Error} If client is required but not provided
 *
 * @example
 * ```typescript
 * import { getResource } from 'oorep-mcp';
 * import { OOREPClient } from 'oorep-mcp';
 *
 * // Static resource (no client needed)
 * const searchHelp = await getResource('oorep://help/search-syntax');
 * console.log(searchHelp.text);
 *
 * // Dynamic resource (HTTP client required)
 * const httpClient = new OOREPHttpClient({ baseUrl: 'https://www.oorep.com', ... }, logger);
 * const remedies = await getResource('oorep://remedies/list', httpClient);
 * console.log(remedies.text);
 * ```
 */
export async function getResource(
  uri: ResourceUri,
  httpClient?: OOREPHttpClient
): Promise<ResourceContent> {
  switch (uri) {
    case RESOURCE_URIS.REMEDIES_LIST:
      if (!httpClient) {
        throw new Error('OOREPHttpClient is required to fetch remedies list resource');
      }
      return fetchRemediesList(httpClient);

    case RESOURCE_URIS.REPERTORIES_LIST:
      if (!httpClient) {
        throw new Error('OOREPHttpClient is required to fetch repertories list resource');
      }
      return fetchRepertoriesList(httpClient);

    case RESOURCE_URIS.MATERIA_MEDICAS_LIST:
      if (!httpClient) {
        throw new Error('OOREPHttpClient is required to fetch materia medicas list resource');
      }
      return fetchMateriaMedicasList(httpClient);

    case RESOURCE_URIS.SEARCH_SYNTAX_HELP:
      return getSearchSyntaxHelpStatic();

    default: {
      const _exhaustive: never = uri;
      throw new NotFoundError(`Unknown resource URI: ${_exhaustive}`, 'resource', uri);
    }
  }
}

/**
 * Get the search syntax help guide as markdown text
 *
 * Convenience function that returns just the text content.
 * This is a static resource that doesn't require an API call.
 *
 * @returns The search syntax help markdown text
 *
 * @example
 * ```typescript
 * import { getSearchSyntaxHelp } from 'oorep-mcp';
 *
 * const searchGuide = getSearchSyntaxHelp();
 * // Inject into system prompt for better search accuracy
 * ```
 */
export function getSearchSyntaxHelp(): string {
  return getSearchSyntaxHelpStatic().text;
}

/**
 * Resource Registry
 *
 * Provides access to MCP resources for the OOREP server.
 */

import { OOREPHttpClient } from '../lib/oorep-client.js';
import { RESOURCE_URIS, type ResourceUri } from '../sdk/constants.js';
import type { OOREPConfig } from '../config.js';
import { logger } from '../utils/logger.js';
import { sanitizeError, NotFoundError } from '../utils/errors.js';
import { generateCacheKey } from '../lib/data-formatter.js';
import { InMemoryCache } from '../lib/cache.js';
import { MapRequestDeduplicator } from '../lib/deduplicator.js';

import {
  remediesListDefinition,
  fetchRemediesList,
  type ResourceContent,
  type ResourceDefinition,
} from './remedies-list.js';
import { repertoriesListDefinition, fetchRepertoriesList } from './repertories-list.js';
import { materiaMedicasListDefinition, fetchMateriaMedicasList } from './materia-medicas-list.js';
import { searchSyntaxHelpDefinition, getSearchSyntaxHelp } from './search-syntax-help.js';

export type { ResourceContent, ResourceDefinition };

// Re-export fetch functions and definitions for use in SDK client
export { fetchRemediesList, remediesListDefinition } from './remedies-list.js';
export { fetchRepertoriesList, repertoriesListDefinition } from './repertories-list.js';
export { fetchMateriaMedicasList, materiaMedicasListDefinition } from './materia-medicas-list.js';
export { getSearchSyntaxHelp, searchSyntaxHelpDefinition } from './search-syntax-help.js';

const resourceDefinitions: ResourceDefinition[] = [
  remediesListDefinition,
  repertoriesListDefinition,
  materiaMedicasListDefinition,
  searchSyntaxHelpDefinition,
];

export class ResourceRegistry {
  private httpClient: OOREPHttpClient;
  private cache: InMemoryCache;
  private deduplicator: MapRequestDeduplicator;

  constructor(config: OOREPConfig) {
    this.cache = new InMemoryCache(3600000, logger);
    this.deduplicator = new MapRequestDeduplicator(logger);
    this.httpClient = new OOREPHttpClient({
      baseUrl: config.baseUrl,
      timeoutMs: config.timeoutMs,
      remoteUser: config.remoteUser,
      defaultRepertory: config.defaultRepertory,
      defaultMateriaMedica: config.defaultMateriaMedica,
    }, logger);
  }

  getDefinitions(): ResourceDefinition[] {
    return resourceDefinitions;
  }

  /**
   * Get a resource by URI
   *
   * @param uri - The resource URI to retrieve
   * @returns Promise resolving to the resource contents
   * @throws {NotFoundError} If the resource URI is not recognized
   * @throws {NetworkError} If there is a network error fetching the resource
   */
  async getResource(
    uri: string
  ): Promise<{ contents: Array<{ uri: string; mimeType?: string; text: string }> }> {
    try {
      logger.info('Getting resource', { uri });

      const cacheKey = generateCacheKey('resource', { uri });
      const cached = (await this.cache.get(cacheKey)) as ResourceContent | null;
      if (cached) {
        return { contents: [cached] };
      }

      const resource = await this.deduplicator.deduplicate(cacheKey, async () => {
        switch (uri as ResourceUri) {
          case RESOURCE_URIS.REMEDIES_LIST:
            return fetchRemediesList(this.httpClient);

          case RESOURCE_URIS.REPERTORIES_LIST:
            return fetchRepertoriesList(this.httpClient);

          case RESOURCE_URIS.MATERIA_MEDICAS_LIST:
            return fetchMateriaMedicasList(this.httpClient);

          case RESOURCE_URIS.SEARCH_SYNTAX_HELP:
            return getSearchSyntaxHelp();

          default: {
            const _exhaustive: never = uri as never;
            throw new NotFoundError(`Unknown resource URI: ${_exhaustive}`, 'resource', uri);
          }
        }
      });

      await this.cache.set(cacheKey, resource);

      return {
        contents: [
          {
            uri: resource.uri,
            mimeType: resource.mimeType,
            text: resource.text,
          },
        ],
      };
    } catch (error) {
      logger.error('Error getting resource', error);
      throw sanitizeError(error);
    }
  }

  /**
   * Clean up resources - clears cache and releases connections
   */
  destroy(): void {
    this.cache.destroy?.();
  }
}

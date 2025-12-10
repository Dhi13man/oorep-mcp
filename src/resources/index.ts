/**
 * Resource Registry
 *
 * Provides access to MCP resources for the OOREP server.
 */

import { OOREPClient } from '../lib/oorep-client.js';
import { RESOURCE_URIS, type ResourceUri } from '../sdk/constants.js';
import type { OOREPConfig } from '../config.js';
import { logger } from '../utils/logger.js';
import { sanitizeError } from '../utils/errors.js';
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
import {
  materiaMedicasListDefinition,
  fetchMateriaMedicasList,
} from './materia-medicas-list.js';
import { searchSyntaxHelpDefinition, getSearchSyntaxHelp } from './search-syntax-help.js';

export type { ResourceContent, ResourceDefinition };

// Re-export fetch functions for use in SDK client
export { fetchRemediesList } from './remedies-list.js';
export { fetchRepertoriesList } from './repertories-list.js';
export { fetchMateriaMedicasList } from './materia-medicas-list.js';
export { getSearchSyntaxHelp } from './search-syntax-help.js';

const resourceDefinitions: ResourceDefinition[] = [
  remediesListDefinition,
  repertoriesListDefinition,
  materiaMedicasListDefinition,
  searchSyntaxHelpDefinition,
];

export class ResourceRegistry {
  private client: OOREPClient;
  private cache: InMemoryCache;
  private deduplicator: MapRequestDeduplicator;

  constructor(config: OOREPConfig) {
    this.cache = new InMemoryCache(3600000, logger);
    this.deduplicator = new MapRequestDeduplicator(logger);
    this.client = new OOREPClient({
      baseUrl: config.baseUrl,
      timeoutMs: config.timeoutMs,
      cacheTtlMs: 3600000,
      maxResults: config.maxResults,
      logLevel: config.logLevel,
      defaultRepertory: config.defaultRepertory,
      defaultMateriaMedica: config.defaultMateriaMedica,
    });
  }

  getDefinitions(): ResourceDefinition[] {
    return resourceDefinitions;
  }

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
            return fetchRemediesList(this.client);

          case RESOURCE_URIS.REPERTORIES_LIST:
            return fetchRepertoriesList(this.client);

          case RESOURCE_URIS.MATERIA_MEDICAS_LIST:
            return fetchMateriaMedicasList(this.client);

          case RESOURCE_URIS.SEARCH_SYNTAX_HELP:
            return getSearchSyntaxHelp();

          default: {
            const _exhaustive: never = uri as never;
            throw new Error(`Unknown resource URI: ${_exhaustive}`);
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
}

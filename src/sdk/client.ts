/**
 * OOREP SDK Client
 *
 * A simplified client wrapper for programmatic use with AI SDKs.
 * This client provides a clean API without the MCP server overhead.
 */

import { OOREPClient } from '../lib/oorep-client.js';
import { Cache, RequestDeduplicator } from '../lib/cache.js';
import {
  formatRepertoryResults,
  formatMateriaMedicaResults,
  generateCacheKey,
} from '../lib/data-formatter.js';
import { validateSymptom, validateRemedyName, validateLanguage } from '../utils/validation.js';
import {
  SearchRepertoryArgsSchema,
  SearchMateriaMedicaArgsSchema,
  GetRemedyInfoArgsSchema,
  ListRepertoriesArgsSchema,
  ListMateriaMedicasArgsSchema,
  type RepertorySearchResult,
  type MateriaMedicaSearchResult,
  type RemedyInfo,
  type RepertoryMetadata,
  type MateriaMedicaMetadata,
} from '../utils/schemas.js';

/**
 * Helper function for partial remedy name matching
 */
function matchesPartially(
  remedy: { nameAbbrev: string; nameLong: string; namealt?: string[] },
  normalizedQuery: string
): boolean {
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const abbrev = normalize(remedy.nameAbbrev);
  const longName = normalize(remedy.nameLong);
  const altNames = (remedy.namealt || []).map((alt) => normalize(alt));

  const queryContainsName = (name: string) => normalizedQuery.includes(name);
  const nameContainsQuery = (name: string) => name.includes(normalizedQuery);

  return (
    nameContainsQuery(longName) ||
    nameContainsQuery(abbrev) ||
    altNames.some((alt) => nameContainsQuery(alt)) ||
    queryContainsName(longName) ||
    queryContainsName(abbrev) ||
    altNames.some((alt) => queryContainsName(alt))
  );
}

/**
 * Configuration options for the OOREP SDK client
 */
export interface OOREPSDKConfig {
  /** Base URL for OOREP API (default: https://www.oorep.com) */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
  /** Cache TTL in milliseconds (default: 300000 = 5 minutes) */
  cacheTtlMs?: number;
  /** Default repertory abbreviation (default: publicum) */
  defaultRepertory?: string;
  /** Default materia medica abbreviation (default: boericke) */
  defaultMateriaMedica?: string;
}

/**
 * OOREP SDK Client for programmatic access to homeopathic data
 */
export class OOREPSDKClient {
  private client: OOREPClient;
  private cache: Cache<unknown>;
  private deduplicator: RequestDeduplicator;
  private config: Required<OOREPSDKConfig>;

  constructor(config: OOREPSDKConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl ?? 'https://www.oorep.com',
      timeoutMs: config.timeoutMs ?? 30000,
      cacheTtlMs: config.cacheTtlMs ?? 300000,
      defaultRepertory: config.defaultRepertory ?? 'publicum',
      defaultMateriaMedica: config.defaultMateriaMedica ?? 'boericke',
    };

    this.client = new OOREPClient({
      baseUrl: this.config.baseUrl,
      timeoutMs: this.config.timeoutMs,
      cacheTtlMs: this.config.cacheTtlMs,
      maxResults: 100,
      logLevel: 'warn',
      defaultRepertory: this.config.defaultRepertory,
      defaultMateriaMedica: this.config.defaultMateriaMedica,
    });

    this.cache = new Cache(this.config.cacheTtlMs);
    this.deduplicator = new RequestDeduplicator();
  }

  /**
   * Search for symptoms in homeopathic repertories
   */
  async searchRepertory(args: {
    symptom: string;
    repertory?: string;
    minWeight?: number;
    maxResults?: number;
    includeRemedyStats?: boolean;
  }): Promise<RepertorySearchResult> {
    const validated = SearchRepertoryArgsSchema.parse(args);
    validateSymptom(validated.symptom);

    // Apply default repertory consistently for cache key and API call
    const repertory = validated.repertory ?? this.config.defaultRepertory;

    const cacheKey = generateCacheKey('repertory', {
      symptom: validated.symptom,
      repertory,
      minWeight: validated.minWeight,
      maxResults: validated.maxResults,
      includeRemedyStats: validated.includeRemedyStats,
    });

    const cached = this.cache.get(cacheKey) as RepertorySearchResult | null;
    if (cached) return cached;

    return this.deduplicator.deduplicate(cacheKey, async () => {
      const apiResponse = await this.client.lookupRepertory({
        symptom: validated.symptom,
        repertory,
        minWeight: validated.minWeight,
        includeRemedyStats: validated.includeRemedyStats,
      });

      const result = formatRepertoryResults(apiResponse, {
        includeRemedyStats: validated.includeRemedyStats,
        maxResults: validated.maxResults,
      });

      this.cache.set(cacheKey, result);
      return result;
    });
  }

  /**
   * Search materia medica texts for remedy descriptions
   */
  async searchMateriaMedica(args: {
    symptom: string;
    materiamedica?: string;
    remedy?: string;
    maxResults?: number;
  }): Promise<MateriaMedicaSearchResult> {
    const validated = SearchMateriaMedicaArgsSchema.parse(args);
    validateSymptom(validated.symptom);
    if (validated.remedy !== undefined) {
      validateRemedyName(validated.remedy);
    }

    // Apply default materia medica consistently for cache key and API call
    const materiamedica = validated.materiamedica ?? this.config.defaultMateriaMedica;

    const cacheKey = generateCacheKey('mm', {
      symptom: validated.symptom,
      materiamedica,
      remedy: validated.remedy,
      maxResults: validated.maxResults,
    });

    const cached = this.cache.get(cacheKey) as MateriaMedicaSearchResult | null;
    if (cached) return cached;

    return this.deduplicator.deduplicate(cacheKey, async () => {
      const apiResponse = await this.client.lookupMateriaMedica({
        symptom: validated.symptom,
        materiamedica,
        remedy: validated.remedy,
      });

      const result = formatMateriaMedicaResults(apiResponse, validated.maxResults);

      this.cache.set(cacheKey, result);
      return result;
    });
  }

  /**
   * Get detailed information about a specific remedy
   */
  async getRemedyInfo(args: { remedy: string }): Promise<RemedyInfo | null> {
    const validated = GetRemedyInfoArgsSchema.parse(args);
    validateRemedyName(validated.remedy);

    const cacheKey = generateCacheKey('remedy', { name: validated.remedy.toLowerCase() });
    const cached = this.cache.get(cacheKey) as RemedyInfo | null;
    if (cached) return cached;

    return this.deduplicator.deduplicate(cacheKey, async () => {
      const remedies = await this.client.getAvailableRemedies();
      const query = validated.remedy.trim().toLowerCase();
      const normalizedQuery = query.replace(/[^a-z0-9]/g, '');
      const allowPartialMatch = normalizedQuery.length >= 3;

      const remedy = remedies.find(
        (r) =>
          r.nameAbbrev.toLowerCase() === query ||
          r.nameLong.toLowerCase() === query ||
          r.namealt?.some((alt) => alt.toLowerCase() === query) ||
          (allowPartialMatch && matchesPartially(r, normalizedQuery))
      );

      if (!remedy) return null;

      const result: RemedyInfo = {
        id: remedy.id,
        nameAbbrev: remedy.nameAbbrev,
        nameLong: remedy.nameLong,
        nameAlt: remedy.namealt,
      };

      this.cache.set(cacheKey, result);
      return result;
    });
  }

  /**
   * List all available repertories
   */
  async listRepertories(args: { language?: string } = {}): Promise<RepertoryMetadata[]> {
    const validated = ListRepertoriesArgsSchema.parse(args);
    if (validated.language) {
      validateLanguage(validated.language);
    }

    const cacheKey = generateCacheKey('repertories', { language: validated.language });
    const cached = this.cache.get(cacheKey) as RepertoryMetadata[] | null;
    if (cached) return cached;

    return this.deduplicator.deduplicate(cacheKey, async () => {
      let repertories = await this.client.getAvailableRepertories();

      if (validated.language) {
        const lang = validated.language.toLowerCase();
        repertories = repertories.filter((r) => r.language?.toLowerCase() === lang);
      }

      this.cache.set(cacheKey, repertories);
      return repertories;
    });
  }

  /**
   * List all available materia medicas
   */
  async listMateriaMedicas(args: { language?: string } = {}): Promise<MateriaMedicaMetadata[]> {
    const validated = ListMateriaMedicasArgsSchema.parse(args);
    if (validated.language) {
      validateLanguage(validated.language);
    }

    const cacheKey = generateCacheKey('materiamedicas', { language: validated.language });
    const cached = this.cache.get(cacheKey) as MateriaMedicaMetadata[] | null;
    if (cached) return cached;

    return this.deduplicator.deduplicate(cacheKey, async () => {
      let materiaMedicas = await this.client.getAvailableMateriaMedicas();

      if (validated.language) {
        const lang = validated.language.toLowerCase();
        materiaMedicas = materiaMedicas.filter((mm) => mm.language?.toLowerCase() === lang);
      }

      this.cache.set(cacheKey, materiaMedicas);
      return materiaMedicas;
    });
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Destroy the client and release resources
   */
  destroy(): void {
    this.cache.destroy();
  }

  /**
   * Get the current configuration
   */
  getConfig(): Readonly<Required<OOREPSDKConfig>> {
    return { ...this.config };
  }
}

/**
 * Create a new OOREP SDK client
 *
 * @example
 * ```typescript
 * const client = createOOREPClient();
 * const results = await client.searchRepertory({ symptom: 'headache' });
 * ```
 */
export function createOOREPClient(config?: OOREPSDKConfig): OOREPSDKClient {
  return new OOREPSDKClient(config);
}

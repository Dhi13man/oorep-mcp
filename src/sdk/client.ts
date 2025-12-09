/**
 * OOREP SDK Client
 *
 * A simplified client wrapper for programmatic use with AI SDKs.
 * This client provides a clean API without the MCP server overhead.
 *
 * Fully supports dependency injection for extensibility.
 */

import { OOREPClient } from '../lib/oorep-client.js';
import { InMemoryCache } from '../lib/cache.js';
import { MapRequestDeduplicator } from '../lib/deduplicator.js';
import { ConsoleLogger } from '../utils/logger.js';
import type { ICache } from '../interfaces/ICache.js';
import type { IRequestDeduplicator } from '../interfaces/IRequestDeduplicator.js';
import type { ILogger } from '../interfaces/ILogger.js';
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

// ============================================================================
// Resource and Prompt Types for SDK
// ============================================================================

/**
 * Available resource URIs that can be fetched via getResource()
 */
export type ResourceUri =
  | 'oorep://remedies/list'
  | 'oorep://repertories/list'
  | 'oorep://materia-medicas/list'
  | 'oorep://help/search-syntax';

/**
 * Resource content returned by getResource()
 */
export interface ResourceContent {
  uri: ResourceUri;
  mimeType: string;
  text: string;
}

/**
 * Available prompt names that can be fetched via getPrompt()
 */
export type PromptName = 'analyze-symptoms' | 'remedy-comparison' | 'repertorization-workflow';

/**
 * A single message in a prompt workflow
 */
export interface PromptMessage {
  role: 'user' | 'assistant';
  content: {
    type: 'text';
    text: string;
  };
}

/**
 * Prompt result containing workflow messages
 */
export interface PromptResult {
  name: PromptName;
  description: string;
  messages: PromptMessage[];
}

/**
 * Arguments for the analyze-symptoms prompt
 */
export interface AnalyzeSymptomsArgs {
  /** Optional initial symptom description to start the analysis */
  symptom_description?: string;
}

/**
 * Arguments for the remedy-comparison prompt
 */
export interface RemedyComparisonArgs {
  /** Comma-separated list of remedy names to compare (e.g., "Aconite,Belladonna,Gelsemium") */
  remedies: string;
}

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

  // Dependency injection options
  /** Custom cache implementation (supports Redis, Memcached, etc.) */
  cache?: ICache;
  /** Custom request deduplicator */
  deduplicator?: IRequestDeduplicator;
  /** Custom logger implementation */
  logger?: ILogger;
  /** Custom OOREP client (advanced usage) */
  client?: OOREPClient;
}

/**
 * OOREP SDK Client for programmatic access to homeopathic data
 * Supports full dependency injection for cache, logger, deduplicator, and HTTP client
 */
export class OOREPSDKClient {
  private client: OOREPClient;
  private cache: ICache;
  private deduplicator: IRequestDeduplicator;
  private logger: ILogger;
  private config: Required<Omit<OOREPSDKConfig, 'cache' | 'deduplicator' | 'logger' | 'client'>>;

  private normalizeOverride(value: string | undefined, fallback: string): string {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : fallback;
  }

  constructor(config: OOREPSDKConfig = {}) {
    // Set up core configuration
    this.config = {
      baseUrl: config.baseUrl ?? 'https://www.oorep.com',
      timeoutMs: config.timeoutMs ?? 30000,
      cacheTtlMs: config.cacheTtlMs ?? 300000,
      defaultRepertory: config.defaultRepertory ?? 'publicum',
      defaultMateriaMedica: config.defaultMateriaMedica ?? 'boericke',
    };

    // Set up injectable dependencies with sensible defaults
    // User-provided implementations are responsible for their own error handling
    this.logger = config.logger ?? new ConsoleLogger('warn');
    this.cache = config.cache ?? new InMemoryCache(this.config.cacheTtlMs, this.logger);
    this.deduplicator = config.deduplicator ?? new MapRequestDeduplicator(this.logger);

    // Create or use provided OOREP client
    this.client =
      config.client ??
      new OOREPClient({
        baseUrl: this.config.baseUrl,
        timeoutMs: this.config.timeoutMs,
        cacheTtlMs: this.config.cacheTtlMs,
        maxResults: 100,
        logLevel: 'warn',
        defaultRepertory: this.config.defaultRepertory,
        defaultMateriaMedica: this.config.defaultMateriaMedica,
      });
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

    // Trim whitespace overrides and apply default repertory consistently for cache and API
    const repertory = this.normalizeOverride(validated.repertory, this.config.defaultRepertory);

    const cacheKey = generateCacheKey('repertory', {
      symptom: validated.symptom,
      repertory,
      minWeight: validated.minWeight,
      maxResults: validated.maxResults,
      includeRemedyStats: validated.includeRemedyStats,
    });

    const cached = (await this.cache.get(cacheKey)) as RepertorySearchResult | null;
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

      await this.cache.set(cacheKey, result);
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

    // Trim whitespace overrides and apply default materia medica consistently for cache and API
    const materiamedica = this.normalizeOverride(
      validated.materiamedica,
      this.config.defaultMateriaMedica
    );

    const cacheKey = generateCacheKey('mm', {
      symptom: validated.symptom,
      materiamedica,
      remedy: validated.remedy,
      maxResults: validated.maxResults,
    });

    const cached = (await this.cache.get(cacheKey)) as MateriaMedicaSearchResult | null;
    if (cached) return cached;

    return this.deduplicator.deduplicate(cacheKey, async () => {
      const apiResponse = await this.client.lookupMateriaMedica({
        symptom: validated.symptom,
        materiamedica,
        remedy: validated.remedy,
      });

      const result = formatMateriaMedicaResults(apiResponse, validated.maxResults);

      await this.cache.set(cacheKey, result);
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
    const cached = (await this.cache.get(cacheKey)) as RemedyInfo | null;
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

      await this.cache.set(cacheKey, result);
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
    const cached = (await this.cache.get(cacheKey)) as RepertoryMetadata[] | null;
    if (cached) return cached;

    return this.deduplicator.deduplicate(cacheKey, async () => {
      let repertories = await this.client.getAvailableRepertories();

      if (validated.language) {
        const lang = validated.language.toLowerCase();
        repertories = repertories.filter((r) => r.language?.toLowerCase() === lang);
      }

      await this.cache.set(cacheKey, repertories);
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
    const cached = (await this.cache.get(cacheKey)) as MateriaMedicaMetadata[] | null;
    if (cached) return cached;

    return this.deduplicator.deduplicate(cacheKey, async () => {
      let materiaMedicas = await this.client.getAvailableMateriaMedicas();

      if (validated.language) {
        const lang = validated.language.toLowerCase();
        materiaMedicas = materiaMedicas.filter((mm) => mm.language?.toLowerCase() === lang);
      }

      await this.cache.set(cacheKey, materiaMedicas);
      return materiaMedicas;
    });
  }

  /**
   * Clear the cache
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  /**
   * Destroy the client and release resources
   */
  async destroy(): Promise<void> {
    await this.cache.destroy?.();
  }

  /**
   * Get the current configuration
   */
  getConfig(): Readonly<
    Required<Omit<OOREPSDKConfig, 'cache' | 'deduplicator' | 'logger' | 'client'>>
  > {
    return { ...this.config };
  }

  // ==========================================================================
  // Resource Access Methods
  // ==========================================================================

  /**
   * Get a resource by URI
   *
   * Available resources:
   * - `oorep://remedies/list` - Complete list of all 600+ remedies (JSON)
   * - `oorep://repertories/list` - All available repertories with metadata (JSON)
   * - `oorep://materia-medicas/list` - All available materia medicas (JSON)
   * - `oorep://help/search-syntax` - Search syntax guide (Markdown)
   *
   * @example
   * ```typescript
   * const client = createOOREPClient();
   * const searchHelp = await client.getResource('oorep://help/search-syntax');
   * console.log(searchHelp.text); // Markdown search syntax guide
   * ```
   */
  async getResource(uri: ResourceUri): Promise<ResourceContent> {
    const cacheKey = generateCacheKey('resource', { uri });
    const cached = (await this.cache.get(cacheKey)) as ResourceContent | null;
    if (cached) return cached;

    return this.deduplicator.deduplicate(cacheKey, async () => {
      let result: ResourceContent;

      switch (uri) {
        case 'oorep://remedies/list': {
          const remedies = await this.client.getAvailableRemedies();
          result = {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(remedies, null, 2),
          };
          break;
        }

        case 'oorep://repertories/list': {
          const repertories = await this.client.getAvailableRepertories();
          result = {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(repertories, null, 2),
          };
          break;
        }

        case 'oorep://materia-medicas/list': {
          const materiaMedicas = await this.client.getAvailableMateriaMedicas();
          result = {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(materiaMedicas, null, 2),
          };
          break;
        }

        case 'oorep://help/search-syntax': {
          result = {
            uri,
            mimeType: 'text/markdown',
            text: this.getSearchSyntaxHelpText(),
          };
          break;
        }

        default: {
          // TypeScript exhaustiveness check
          const _exhaustive: never = uri;
          throw new Error(`Unknown resource URI: ${_exhaustive}`);
        }
      }

      await this.cache.set(cacheKey, result);
      return result;
    });
  }

  /**
   * Get the search syntax help guide as markdown text
   *
   * Convenience method that returns just the text content.
   * Equivalent to `(await getResource('oorep://help/search-syntax')).text`
   *
   * @example
   * ```typescript
   * const client = createOOREPClient();
   * const searchGuide = await client.getSearchSyntaxHelp();
   * // Inject into system prompt for better search accuracy
   * ```
   */
  async getSearchSyntaxHelp(): Promise<string> {
    const resource = await this.getResource('oorep://help/search-syntax');
    return resource.text;
  }

  /**
   * List all available resources with their metadata
   */
  listResources(): Array<{ uri: ResourceUri; name: string; description: string; mimeType: string }> {
    return [
      {
        uri: 'oorep://remedies/list',
        name: 'Available Remedies List',
        description: 'Complete list of all available homeopathic remedies with names and abbreviations',
        mimeType: 'application/json',
      },
      {
        uri: 'oorep://repertories/list',
        name: 'Available Repertories List',
        description: 'List of all accessible repertories with metadata (title, author, language)',
        mimeType: 'application/json',
      },
      {
        uri: 'oorep://materia-medicas/list',
        name: 'Available Materia Medicas List',
        description: 'List of all accessible materia medicas with metadata (title, author, language)',
        mimeType: 'application/json',
      },
      {
        uri: 'oorep://help/search-syntax',
        name: 'OOREP Search Syntax Help',
        description: 'Guide to OOREP search syntax including wildcards, exclusions, and exact phrases',
        mimeType: 'text/markdown',
      },
    ];
  }

  // ==========================================================================
  // Prompt Access Methods
  // ==========================================================================

  /**
   * Get a prompt workflow by name
   *
   * Available prompts:
   * - `analyze-symptoms` - Guided workflow for systematic symptom analysis
   * - `remedy-comparison` - Compare multiple remedies side-by-side
   * - `repertorization-workflow` - Step-by-step case taking and repertorization (7 steps)
   *
   * @example
   * ```typescript
   * const client = createOOREPClient();
   *
   * // Get the repertorization workflow
   * const workflow = await client.getPrompt('repertorization-workflow');
   * console.log(workflow.messages[0].content.text);
   *
   * // Compare remedies
   * const comparison = await client.getPrompt('remedy-comparison', {
   *   remedies: 'Aconite,Belladonna,Gelsemium'
   * });
   * ```
   */
  async getPrompt(name: 'analyze-symptoms', args?: AnalyzeSymptomsArgs): Promise<PromptResult>;
  async getPrompt(name: 'remedy-comparison', args: RemedyComparisonArgs): Promise<PromptResult>;
  async getPrompt(name: 'repertorization-workflow'): Promise<PromptResult>;
  async getPrompt(
    name: PromptName,
    args?: AnalyzeSymptomsArgs | RemedyComparisonArgs
  ): Promise<PromptResult> {
    switch (name) {
      case 'analyze-symptoms':
        return this.getAnalyzeSymptomsPrompt(args as AnalyzeSymptomsArgs | undefined);

      case 'remedy-comparison': {
        const compArgs = args as RemedyComparisonArgs | undefined;
        if (!compArgs?.remedies) {
          throw new Error('remedies argument is required for remedy-comparison prompt');
        }
        return this.getRemedyComparisonPrompt(compArgs.remedies);
      }

      case 'repertorization-workflow':
        return this.getRepertorizationWorkflowPrompt();

      default: {
        const _exhaustive: never = name;
        throw new Error(`Unknown prompt: ${_exhaustive}`);
      }
    }
  }

  /**
   * List all available prompts with their metadata
   */
  listPrompts(): Array<{
    name: PromptName;
    description: string;
    arguments?: Array<{ name: string; description: string; required: boolean }>;
  }> {
    return [
      {
        name: 'analyze-symptoms',
        description:
          'Guide AI through structured symptom analysis workflow for homeopathic case taking. ' +
          'Helps systematically analyze symptoms and find relevant remedies.',
        arguments: [
          {
            name: 'symptom_description',
            description: 'Optional initial symptom description to start the analysis',
            required: false,
          },
        ],
      },
      {
        name: 'remedy-comparison',
        description:
          'Compare multiple homeopathic remedies side-by-side to identify the best match. ' +
          'Useful for differential diagnosis between similar remedies.',
        arguments: [
          {
            name: 'remedies',
            description:
              'Comma-separated list of remedy names to compare (e.g., "Aconite,Belladonna,Gelsemium")',
            required: true,
          },
        ],
      },
      {
        name: 'repertorization-workflow',
        description:
          'Step-by-step case taking and repertorization workflow for comprehensive case analysis. ' +
          'Guides through symptom gathering, repertorization, and remedy selection.',
        arguments: [],
      },
    ];
  }

  // ==========================================================================
  // Private Helper Methods for Resources and Prompts
  // ==========================================================================

  private getSearchSyntaxHelpText(): string {
    return `# OOREP Search Syntax Guide

## Basic Search

Simple text searches match symptoms and rubrics:
- \`headache\` - finds all entries containing "headache"
- \`headache worse night\` - finds entries with these words

## Wildcards

Use asterisk (*) to match any characters:
- \`head*\` - matches "headache", "head pain", "head pressure", etc.
- \`*ache\` - matches "headache", "backache", "toothache", etc.

**Note**: Wildcards should only be used at the beginning or end of words, not in the middle.

## Exclusions

Use minus sign (-) to exclude terms:
- \`fever -night\` - finds fever entries but excludes those mentioning night
- \`headache -migraine\` - headache entries excluding migraine

## Exact Phrases

Use quotation marks for exact phrase matching:
- \`"worse from cold"\` - exact phrase match
- \`"better from warmth"\` - exact phrase match

## Combining Techniques

You can combine these techniques:
- \`head* -nausea "worse night"\` - headache-related entries, excluding nausea, with exact phrase "worse night"
- \`fever -"worse night" better*\` - fever entries without "worse night" but including "better" variations

## Examples

### Symptom Searches
- \`anxiety fear\` - general anxiety and fear symptoms
- \`cough dry night\` - dry cough at night
- \`pain shooting\` - shooting pains

### Modality Searches
- \`"worse from cold"\` - symptoms worse from cold
- \`"better from motion"\` - symptoms better from motion
- \`-"worse from heat"\` - exclude symptoms worse from heat

### Advanced Searches
- \`headache* "worse night" -nausea\` - comprehensive headache search
- \`anxiety "fear of death" palpitation*\` - anxiety with specific symptoms

## Tips

1. Start with simple searches and refine with exclusions
2. Use wildcards when unsure of exact wording
3. Use exact phrases for modalities and specific symptom descriptions
4. Combine techniques for precise repertorization

## Note

This is a search tool only. Always consult with a qualified homeopathic practitioner for case analysis and remedy selection.
`;
  }

  private getAnalyzeSymptomsPrompt(args?: AnalyzeSymptomsArgs): PromptResult {
    const initialSymptom = args?.symptom_description
      ? `\n\nInitial symptom: ${args.symptom_description}\n\nPlease analyze this symptom using the workflow above.`
      : '';

    return {
      name: 'analyze-symptoms',
      description:
        'Guide AI through structured symptom analysis workflow for homeopathic case taking.',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `You are helping a user analyze homeopathic symptoms and find relevant remedies.

Follow this workflow:

1. **Gather Chief Complaint**
   Ask the user to describe their main symptom in detail.

2. **Search Repertory**
   Use the search_repertory tool to find matching rubrics for the main symptom.
   Review the top remedies that appear in the results.

3. **Ask About Modalities**
   Ask clarifying questions about what makes the symptom better or worse:
   - Time of day (morning, evening, night)
   - Temperature (cold, warmth, open air)
   - Position (lying, sitting, motion)
   - Food and drink
   - Weather conditions

4. **Refine Search**
   Based on the modalities, perform additional repertory searches to narrow down remedies.

5. **Present Top Remedies**
   Identify the 3-5 remedies that appear most frequently across all rubrics.
   For each remedy, show:
   - Name and abbreviation
   - Number of rubrics it appears in
   - Cumulative weight/strength of association

6. **Provide Detailed Information**
   Use get_remedy_info and search_materia_medica to provide detailed information
   about the top remedies, including their key characteristics and symptom pictures.

7. **Important Reminders**
   - This is for informational purposes only
   - Always recommend consulting a qualified homeopathic practitioner
   - Explain any homeopathic terminology in simple terms

Guidelines:
- Be thorough but concise
- Ask one question at a time
- Explain search results clearly
- Help the user understand the remedy selection process${initialSymptom}`,
          },
        },
      ],
    };
  }

  private getRemedyComparisonPrompt(remedies: string): PromptResult {
    const remedyList = remedies
      .split(',')
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    if (remedyList.length < 2) {
      throw new Error(
        'At least 2 remedies are required for comparison. Please provide remedies as a comma-separated list.'
      );
    }

    // Limit to max 6 remedies for table readability
    const maxRemedies = 6;
    if (remedyList.length > maxRemedies) {
      this.logger.warn(
        `Limiting remedy comparison to ${maxRemedies} remedies (${remedyList.length} provided)`
      );
      remedyList.splice(maxRemedies);
    }

    const tableHeader = '| Aspect                | ' + remedyList.join(' | ') + ' |';
    const tableSeparator =
      '|----------------------|' + remedyList.map(() => '----------|').join('');
    const tableRows = [
      '| Key Mental Symptoms  | ' + remedyList.map(() => '...').join('      | ') + '      |',
      '| Key Physical Symptoms| ' + remedyList.map(() => '...').join('      | ') + '      |',
      '| Better From          | ' + remedyList.map(() => '...').join('      | ') + '      |',
      '| Worse From           | ' + remedyList.map(() => '...').join('      | ') + '      |',
      '| Time Modality        | ' + remedyList.map(() => '...').join('      | ') + '      |',
      '| Distinctive Features | ' + remedyList.map(() => '...').join('      | ') + '      |',
    ].join('\n   ');

    return {
      name: 'remedy-comparison',
      description: 'Compare multiple homeopathic remedies side-by-side to identify the best match.',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `You are comparing homeopathic remedies to help identify the best match.

Remedies to compare: ${remedyList.join(', ')}

For each remedy, perform the following steps:

1. **Get Basic Information**
   Use get_remedy_info for each remedy to gather:
   - Full name and abbreviations
   - Alternative names

2. **Search Materia Medica**
   Use search_materia_medica to find key symptoms for each remedy.
   Focus on:
   - Mental/emotional symptoms
   - Physical keynote symptoms
   - Modalities (better/worse from)
   - Concomitant symptoms

3. **Create Comparison Table**
   Present the comparison in a clear table format:

   ${tableHeader}
   ${tableSeparator}
   ${tableRows}

4. **Analysis**
   Provide:
   - Similarities between the remedies
   - Key differentiating factors
   - Guidance on when to choose each remedy
   - Clinical tips for differentiation

5. **Summary**
   Conclude with a clear summary of:
   - Most important distinguishing characteristics
   - Questions to ask to differentiate between these remedies
   - Recommendation to consult a qualified practitioner

Remember:
- Focus on distinctive, differentiating features
- Use clear, accessible language
- Cite specific symptoms from materia medica sources
- This is for educational purposes only`,
          },
        },
      ],
    };
  }

  private getRepertorizationWorkflowPrompt(): PromptResult {
    return {
      name: 'repertorization-workflow',
      description:
        'Step-by-step case taking and repertorization workflow for comprehensive case analysis.',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `You are guiding a user through comprehensive homeopathic case repertorization.

Follow this systematic workflow:

**STEP 1: Chief Complaint**
Ask: "What is the main symptom or health concern you'd like to address?"

Wait for response, then move to Step 2.

**STEP 2: Detailed Symptom Gathering**
For each symptom mentioned, ask about the COMPLETE symptom picture:

a) **Location**: Where exactly is the symptom? Does it radiate or move?
b) **Sensation**: How does it feel? (sharp, dull, burning, throbbing, etc.)
c) **Modalities** (CRITICAL):
   - What makes it BETTER? (time, temperature, position, food, etc.)
   - What makes it WORSE? (time, temperature, position, food, etc.)
d) **Time**: When does it occur? What time of day? How often?
e) **Concomitants**: What else happens at the same time?

**STEP 3: Initial Repertorization**
Use search_repertory for each KEY symptom identified:
- Start with the most characteristic/unusual symptoms
- Include modalities in your searches (e.g., "headache worse night")
- Keep track of which remedies appear in multiple rubrics

Create a running tally:
"Remedy Name: appears in X rubrics, cumulative weight: Y"

**STEP 4: Cross-Reference with Materia Medica**
For the top 3-5 remedies appearing most frequently:
- Use search_materia_medica to verify the complete symptom picture
- Check if the TOTALITY of symptoms matches
- Look for confirming keynotes and characteristics

**STEP 5: Differentiation**
If multiple remedies remain, ask additional questions to differentiate:
- Mental/emotional state
- General characteristics (hot/cold, thirsty/thirstless, etc.)
- Sleep patterns
- Food desires and aversions

Use search_repertory for these additional symptoms.

**STEP 6: Final Remedy Selection**
Compare the final 1-3 remedies using get_remedy_info.

Present:
- The best matching remedy (or top 2-3 if close)
- Why it matches this case
- Expected potency range (suggest consulting practitioner for this)
- Key symptoms that led to this selection

**STEP 7: Recommendations**
Always conclude with:
- Reminder to consult a qualified homeopathic practitioner
- Importance of professional case management
- This is an educational exercise only

**Important Guidelines:**
- Take time with each step - don't rush
- Document all symptoms before repertorizing
- Look for the most CHARACTERISTIC and UNUSUAL symptoms
- The totality of symptoms matters more than individual rubrics
- When in doubt, ask more questions

Begin with Step 1 now.`,
          },
        },
      ],
    };
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
 *
 * @example With custom cache (Redis)
 * ```typescript
 * import Redis from 'ioredis';
 * import { createOOREPClient, type ICache } from 'oorep-mcp/sdk';
 *
 * class RedisCache implements ICache {
 *   constructor(private redis: Redis) {}
 *   async get(key: string) {
 *     const val = await this.redis.get(key);
 *     return val ? JSON.parse(val) : null;
 *   }
 *   async set(key: string, value: unknown) {
 *     await this.redis.set(key, JSON.stringify(value), 'EX', 300);
 *   }
 *   // ... other methods
 * }
 *
 * const redis = new Redis();
 * const client = createOOREPClient({ cache: new RedisCache(redis) });
 * ```
 */
export function createOOREPClient(config?: OOREPSDKConfig): OOREPSDKClient {
  return new OOREPSDKClient(config);
}

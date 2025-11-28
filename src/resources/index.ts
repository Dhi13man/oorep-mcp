/**
 * Resource registration and exports
 */

import { OOREPClient } from '../lib/oorep-client.js';
import { InMemoryCache } from '../lib/cache.js';
import type { OOREPConfig } from '../config.js';
import { logger } from '../utils/logger.js';
import { sanitizeError, ValidationError } from '../utils/errors.js';

export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export class ResourceRegistry {
  private client: OOREPClient;
  private remediesCache: InMemoryCache<unknown>;
  private repertoriesCache: InMemoryCache<unknown>;
  private materiaMedicasCache: InMemoryCache<unknown>;

  constructor(config: OOREPConfig) {
    this.client = new OOREPClient(config);
    // Cache for 1 hour (remedies list is stable)
    this.remediesCache = new InMemoryCache(3600000, logger);
    // Cache for 5 minutes (metadata)
    this.repertoriesCache = new InMemoryCache(300000, logger);
    this.materiaMedicasCache = new InMemoryCache(300000, logger);
  }

  getDefinitions(): ResourceDefinition[] {
    return [
      {
        uri: 'oorep://remedies/list',
        name: 'Available Remedies List',
        description:
          'Complete list of all available homeopathic remedies with names and abbreviations',
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
        description:
          'List of all accessible materia medicas with metadata (title, author, language)',
        mimeType: 'application/json',
      },
      {
        uri: 'oorep://help/search-syntax',
        name: 'OOREP Search Syntax Help',
        description:
          'Guide to OOREP search syntax including wildcards, exclusions, and exact phrases',
        mimeType: 'text/markdown',
      },
    ];
  }

  async getResource(
    uri: string
  ): Promise<{ contents: Array<{ uri: string; mimeType?: string; text: string }> }> {
    try {
      logger.info('Getting resource', { uri });

      switch (uri) {
        case 'oorep://remedies/list':
          return await this.getRemediesList();

        case 'oorep://repertories/list':
          return await this.getRepertoriesList();

        case 'oorep://materia-medicas/list':
          return await this.getMateriaMedicasList();

        case 'oorep://help/search-syntax':
          return this.getSearchSyntaxHelp();

        default:
          throw new ValidationError(`Resource not found: ${uri}`);
      }
    } catch (error) {
      logger.error('Error getting resource', error);
      throw sanitizeError(error);
    }
  }

  private async getRemediesList(): Promise<{
    contents: Array<{ uri: string; mimeType?: string; text: string }>;
  }> {
    const cacheKey = 'remedies-list';
    const cached = await this.remediesCache.get(cacheKey);

    if (cached) {
      logger.info('Returning cached remedies list');
      return {
        contents: [
          {
            uri: 'oorep://remedies/list',
            mimeType: 'application/json',
            text: JSON.stringify(cached, null, 2),
          },
        ],
      };
    }

    const remedies = await this.client.getAvailableRemedies();
    await this.remediesCache.set(cacheKey, remedies);

    return {
      contents: [
        {
          uri: 'oorep://remedies/list',
          mimeType: 'application/json',
          text: JSON.stringify(remedies, null, 2),
        },
      ],
    };
  }

  private async getRepertoriesList(): Promise<{
    contents: Array<{ uri: string; mimeType?: string; text: string }>;
  }> {
    const cacheKey = 'repertories-list';
    const cached = await this.repertoriesCache.get(cacheKey);

    if (cached) {
      logger.info('Returning cached repertories list');
      return {
        contents: [
          {
            uri: 'oorep://repertories/list',
            mimeType: 'application/json',
            text: JSON.stringify(cached, null, 2),
          },
        ],
      };
    }

    const repertories = await this.client.getAvailableRepertories();
    await this.repertoriesCache.set(cacheKey, repertories);

    return {
      contents: [
        {
          uri: 'oorep://repertories/list',
          mimeType: 'application/json',
          text: JSON.stringify(repertories, null, 2),
        },
      ],
    };
  }

  private async getMateriaMedicasList(): Promise<{
    contents: Array<{ uri: string; mimeType?: string; text: string }>;
  }> {
    const cacheKey = 'materia-medicas-list';
    const cached = await this.materiaMedicasCache.get(cacheKey);

    if (cached) {
      logger.info('Returning cached materia medicas list');
      return {
        contents: [
          {
            uri: 'oorep://materia-medicas/list',
            mimeType: 'application/json',
            text: JSON.stringify(cached, null, 2),
          },
        ],
      };
    }

    const materiaMedicas = await this.client.getAvailableMateriaMedicas();
    await this.materiaMedicasCache.set(cacheKey, materiaMedicas);

    return {
      contents: [
        {
          uri: 'oorep://materia-medicas/list',
          mimeType: 'application/json',
          text: JSON.stringify(materiaMedicas, null, 2),
        },
      ],
    };
  }

  private getSearchSyntaxHelp(): {
    contents: Array<{ uri: string; mimeType?: string; text: string }>;
  } {
    const helpText = `# OOREP Search Syntax Guide

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

    return {
      contents: [
        {
          uri: 'oorep://help/search-syntax',
          mimeType: 'text/markdown',
          text: helpText,
        },
      ],
    };
  }
}

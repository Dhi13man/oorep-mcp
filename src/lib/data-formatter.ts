/**
 * Data formatting utilities to transform OOREP API responses
 * into the format expected by MCP tools
 */

import type {
  RepertorySearchResult,
  Rubric,
  MateriaMedicaSearchResult,
  MateriaMedicaResult,
} from '../utils/schemas.js';

type RawRepertoryResult = {
  totalNumberOfResults: number;
  results: Array<{
    rubric: {
      fullPath?: string;
      textt?: string | null;
    };
    repertoryAbbrev: string;
    weightedRemedies: Array<{
      remedy: {
        nameAbbrev: string;
        nameLong: string;
      };
      weight: number;
    }>;
  }>;
};

type RawMateriaMedicaResult = {
  results: Array<{
    abbrev: string;
    remedy_id: number;
    remedy_fullname: string;
    result_sections: Array<{
      heading?: string | null;
      content?: string | null;
      depth?: number | null;
    }>;
  }>;
  numberOfMatchingSectionsPerChapter: Array<{
    hits: number;
    remedyId: number;
  }>;
};

/**
 * Format repertory search results from OOREP API response
 */
export function formatRepertoryResults(
  apiResponse: RawRepertoryResult | null,
  options: { includeRemedyStats?: boolean; maxResults?: number } = {}
): RepertorySearchResult {
  if (!apiResponse) {
    return {
      totalResults: 0,
      rubrics: [],
      remedyStats: options.includeRemedyStats === false ? undefined : [],
    };
  }

  const limit =
    options.maxResults && options.maxResults > 0 ? options.maxResults : apiResponse.results.length;

  const rubrics: Rubric[] = apiResponse.results.slice(0, limit).map((result) => ({
    rubric: result.rubric.fullPath || result.rubric.textt || 'Untitled rubric',
    repertory: result.repertoryAbbrev,
    remedies: result.weightedRemedies.map((remedy) => ({
      name: remedy.remedy.nameLong || remedy.remedy.nameAbbrev,
      abbreviation: remedy.remedy.nameAbbrev,
      weight: remedy.weight,
    })),
  }));

  let remedyStats = undefined;
  if (options.includeRemedyStats !== false) {
    const stats = new Map<
      string,
      { name: string; abbreviation: string; count: number; cumulativeWeight: number }
    >();

    rubrics.forEach((rubric) => {
      rubric.remedies.forEach((remedy) => {
        // Use null byte as delimiter - guaranteed not to appear in remedy names
        const key = `${remedy.name}\x00${remedy.abbreviation}`;
        const existing = stats.get(key);
        if (existing) {
          existing.count += 1;
          existing.cumulativeWeight += remedy.weight;
        } else {
          stats.set(key, {
            name: remedy.name,
            abbreviation: remedy.abbreviation,
            count: 1,
            cumulativeWeight: remedy.weight,
          });
        }
      });
    });

    remedyStats = Array.from(stats.values())
      .sort((a, b) => {
        if (b.cumulativeWeight !== a.cumulativeWeight) {
          return b.cumulativeWeight - a.cumulativeWeight;
        }
        return b.count - a.count;
      })
      .map(({ name, count, cumulativeWeight }) => ({
        name,
        count,
        cumulativeWeight,
      }));
  }

  return {
    totalResults: apiResponse.totalNumberOfResults,
    rubrics,
    remedyStats,
  };
}

/**
 * Format materia medica search results from OOREP API response
 */
export function formatMateriaMedicaResults(
  apiResponse: RawMateriaMedicaResult | null,
  maxResults?: number
): MateriaMedicaSearchResult {
  if (!apiResponse) {
    return {
      totalResults: 0,
      results: [],
    };
  }

  const limit = maxResults && maxResults > 0 ? maxResults : apiResponse.results.length;
  const hitsMap = new Map<number, number>();
  apiResponse.numberOfMatchingSectionsPerChapter.forEach((entry) => {
    hitsMap.set(entry.remedyId, entry.hits);
  });

  const results: MateriaMedicaResult[] = apiResponse.results.slice(0, limit).map((result) => ({
    remedy: result.remedy_fullname,
    remedyId: result.remedy_id,
    materiamedica: result.abbrev,
    sections: result.result_sections.map((section) => ({
      heading: section.heading ?? undefined,
      content: section.content ?? '',
      depth: section.depth ?? 0,
    })),
    hitCount: hitsMap.get(result.remedy_id) ?? result.result_sections.length,
  }));

  return {
    totalResults: apiResponse.numberOfMatchingSectionsPerChapter.reduce(
      (sum, entry) => sum + (entry.hits ?? 0),
      0
    ),
    results,
  };
}

/**
 * Generate a cache key from parameters
 */
export function generateCacheKey(
  prefix: string,
  params: Record<string, string | number | boolean | undefined>
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return `${prefix}:${sortedParams}`;
}

/**
 * Truncate text to a maximum length with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Format a list for display
 */
export function formatList(items: string[], maxItems?: number): string {
  const displayItems = maxItems ? items.slice(0, maxItems) : items;
  const result = displayItems.map((item, index) => `${index + 1}. ${item}`).join('\n');

  if (maxItems && items.length > maxItems) {
    return result + `\n... and ${items.length - maxItems} more`;
  }

  return result;
}

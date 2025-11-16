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

/**
 * Format repertory search results from OOREP API response
 */
export function formatRepertoryResults(
  apiResponse: {
    totalNumberOfResults: number;
    results: Array<{
      rubric: string;
      repertory: string;
      remedies: Array<{
        name: string;
        abbreviation: string;
        weight: number;
      }>;
    }>;
  },
  includeRemedyStats = true
): RepertorySearchResult {
  const rubrics: Rubric[] = apiResponse.results.map((result) => ({
    rubric: result.rubric,
    repertory: result.repertory,
    weight: undefined,
    label: undefined,
    remedies: result.remedies.map((remedy) => ({
      name: remedy.name,
      abbreviation: remedy.abbreviation,
      weight: remedy.weight,
    })),
  }));

  // Calculate remedy statistics if requested
  let remedyStats = undefined;
  if (includeRemedyStats) {
    const stats = new Map<
      string,
      { count: number; cumulativeWeight: number }
    >();

    rubrics.forEach((rubric) => {
      rubric.remedies.forEach((remedy) => {
        const existing = stats.get(remedy.name) || {
          count: 0,
          cumulativeWeight: 0,
        };
        stats.set(remedy.name, {
          count: existing.count + 1,
          cumulativeWeight: existing.cumulativeWeight + remedy.weight,
        });
      });
    });

    // Sort by cumulative weight (descending) then by count
    remedyStats = Array.from(stats.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        cumulativeWeight: data.cumulativeWeight,
      }))
      .sort((a, b) => {
        if (b.cumulativeWeight !== a.cumulativeWeight) {
          return b.cumulativeWeight - a.cumulativeWeight;
        }
        return b.count - a.count;
      });
  }

  return {
    totalResults: apiResponse.totalNumberOfResults,
    totalPages: undefined,
    currentPage: undefined,
    rubrics,
    remedyStats,
  };
}

/**
 * Format materia medica search results from OOREP API response
 */
export function formatMateriaMedicaResults(apiResponse: {
  totalNumberOfResults: number;
  results: Array<{
    remedy: string;
    remedyId: number;
    materiamedica: string;
    sections: Array<{
      heading?: string;
      content: string;
      depth: number;
    }>;
  }>;
}): MateriaMedicaSearchResult {
  const results: MateriaMedicaResult[] = apiResponse.results.map((result) => ({
    remedy: result.remedy,
    remedyId: result.remedyId,
    materiamedica: result.materiamedica,
    sections: result.sections.map((section) => ({
      heading: section.heading,
      content: section.content,
      depth: section.depth,
    })),
    hitCount: result.sections.length,
  }));

  return {
    totalResults: apiResponse.totalNumberOfResults,
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

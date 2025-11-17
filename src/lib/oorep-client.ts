/**
 * HTTP client for OOREP API with retry logic and error handling
 */

import { OOREPConfig } from '../config.js';
import { logger } from '../utils/logger.js';
import {
  NetworkError,
  TimeoutError,
  RateLimitError,
} from '../utils/errors.js';
import {
  RepertoryMetadata,
  MateriaMedicaMetadata,
} from '../utils/schemas.js';

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TimeoutError(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Sleep utility for retry backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * OOREP HTTP Client with retry logic
 */
export class OOREPClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries = 3;

  constructor(config: OOREPConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeoutMs = config.timeoutMs;
  }

  /**
   * Make HTTP request with retry logic
   */
  private async request<T>(
    endpoint: string,
    params: Record<string, string | number | boolean> = {},
    retryCount = 0
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    logger.debug(`Fetching ${url.toString()}`);

    try {
      const response = await fetchWithTimeout(
        url.toString(),
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'oorep-mcp/0.1.0',
          },
        },
        this.timeoutMs
      );

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
        throw new RateLimitError(
          'Rate limit exceeded. Please try again later.',
          retryAfter
        );
      }

      // Handle other HTTP errors
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new NetworkError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          new Error(errorText)
        );
      }

      // Parse JSON response
      const data = await response.json();
      return data as T;
    } catch (error) {
      // Retry on network errors and timeouts
      if (
        retryCount < this.maxRetries &&
        (error instanceof NetworkError || error instanceof TimeoutError)
      ) {
        const backoffMs = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
        logger.warn(`Request failed, retrying in ${backoffMs}ms (attempt ${retryCount + 1}/${this.maxRetries})`);
        await sleep(backoffMs);
        return this.request<T>(endpoint, params, retryCount + 1);
      }

      // Don't retry on rate limit errors
      if (error instanceof RateLimitError) {
        throw error;
      }

      // Re-throw or wrap error
      if (error instanceof NetworkError || error instanceof TimeoutError) {
        throw error;
      }

      // Log the actual error for debugging
      logger.error('Unexpected error in API request', error);

      throw new NetworkError(
        'Failed to fetch data from OOREP API',
        undefined,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Search repertory for symptoms
   * GET /api/lookup_rep
   */
  async lookupRepertory(params: {
    symptom: string;
    repertory?: string;
    minWeight?: number;
    maxResults?: number;
  }): Promise<{
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
  }> {
    logger.info('Looking up repertory', { symptom: params.symptom });

    const apiParams: Record<string, string | number> = {
      symptom: params.symptom,
    };

    if (params.repertory) {
      apiParams.repertory = params.repertory;
    }
    if (params.minWeight) {
      apiParams.minWeight = params.minWeight;
    }
    if (params.maxResults) {
      apiParams.limit = params.maxResults;
    }

    return this.request('/api/lookup_rep', apiParams);
  }

  /**
   * Search materia medica for symptoms
   * GET /api/lookup_mm
   */
  async lookupMateriaMedica(params: {
    symptom: string;
    materiamedica?: string;
    remedy?: string;
    maxResults?: number;
  }): Promise<{
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
  }> {
    logger.info('Looking up materia medica', { symptom: params.symptom });

    const apiParams: Record<string, string | number> = {
      symptom: params.symptom,
    };

    if (params.materiamedica) {
      apiParams.mm = params.materiamedica;
    }
    if (params.remedy) {
      apiParams.remedy = params.remedy;
    }
    if (params.maxResults) {
      apiParams.limit = params.maxResults;
    }

    return this.request('/api/lookup_mm', apiParams);
  }

  /**
   * Get available remedies
   * GET /api/available_remedies
   */
  async getAvailableRemedies(): Promise<
    Array<{
      id: number;
      nameAbbrev: string;
      nameLong: string;
      namealt?: string[]; // Note: lowercase 'alt' in actual API
    }>
  > {
    logger.info('Fetching available remedies');
    // API returns array directly, not wrapped in object
    const result = await this.request<Array<{
      id: number;
      nameAbbrev: string;
      nameLong: string;
      namealt?: string[];
    }>>('/api/available_remedies');
    return result || [];
  }

  /**
   * Get available repertories
   * GET /api/available_rems_and_reps
   */
  async getAvailableRepertories(): Promise<Array<RepertoryMetadata>> {
    logger.info('Fetching available repertories');
    // API returns array of objects with 'info' field
    const result = await this.request<Array<{
      info: {
        abbrev: string;
        title: string;
        authorLastName?: string;
        authorFirstName?: string;
        language?: string;
      };
    }>>('/api/available_rems_and_reps');

    // Transform the response to match our interface
    return (result || []).map((item) => ({
      abbreviation: item.info.abbrev,
      title: item.info.title,
      author: item.info.authorLastName && item.info.authorFirstName
        ? `${item.info.authorFirstName} ${item.info.authorLastName}`
        : item.info.authorLastName || item.info.authorFirstName,
      language: item.info.language,
    }));
  }

  /**
   * Get available materia medicas
   * GET /api/available_rems_and_mms
   */
  async getAvailableMateriaMedicas(): Promise<Array<MateriaMedicaMetadata>> {
    logger.info('Fetching available materia medicas');
    // API returns array of objects with 'mminfo' field
    const result = await this.request<Array<{
      mminfo: {
        id: number;
        abbrev: string;
        displaytitle?: string;
        fulltitle?: string;
        authorlastname?: string;
        authorfirstname?: string;
        lang?: string;
      };
    }>>('/api/available_rems_and_mms');

    // Transform the response to match our interface
    return (result || []).map((item) => ({
      abbreviation: item.mminfo.abbrev,
      title: item.mminfo.displaytitle || item.mminfo.fulltitle || item.mminfo.abbrev,
      author: item.mminfo.authorlastname && item.mminfo.authorfirstname
        ? `${item.mminfo.authorfirstname} ${item.mminfo.authorlastname}`
        : item.mminfo.authorlastname || item.mminfo.authorfirstname,
      language: item.mminfo.lang,
    }));
  }
}

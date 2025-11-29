/**
 * HTTP client for OOREP API with retry logic and error handling
 */

import { OOREPConfig } from '../config.js';
import { logger } from '../utils/logger.js';
import { NetworkError, TimeoutError, RateLimitError } from '../utils/errors.js';
import { RepertoryMetadata, MateriaMedicaMetadata } from '../utils/schemas.js';
import type { ISessionManager } from '../interfaces/ISessionManager.js';
import { FetchHttpClient } from './http-client.js';
import { CookieSessionManager } from './session-manager.js';
import pkg from '../../package.json' with { type: 'json' };
const USER_AGENT = `oorep-mcp/${pkg.version}`;
type RawWeightedRemedy = {
  remedy: {
    id: number;
    nameAbbrev: string;
    nameLong: string;
    namealt?: string[] | null;
  };
  weight: number;
};

type RawRepertoryCase = {
  rubric: {
    abbrev: string;
    id: number;
    fullPath?: string;
    textt?: string | null;
    path?: string | null;
  };
  repertoryAbbrev: string;
  rubricLabel?: string | null;
  rubricWeight?: number | null;
  weightedRemedies: RawWeightedRemedy[];
};

type RawRepertoryPayload = {
  totalNumberOfRepertoryRubrics: number;
  totalNumberOfResults: number;
  totalNumberOfPages: number;
  currPage: number;
  results: RawRepertoryCase[];
};

type RawRepertoryResponse = [
  RawRepertoryPayload,
  Array<{ nameabbrev: string; count: number; cumulativeweight: number }>,
];

type RawMateriaMedicaResponse = {
  results: Array<{
    abbrev: string;
    remedy_id: number;
    remedy_fullname: string;
    result_sections: Array<{
      id: number;
      depth?: number | null;
      heading?: string | null;
      content?: string | null;
    }>;
  }>;
  numberOfMatchingSectionsPerChapter: Array<{
    hits: number;
    remedyId: number;
  }>;
};

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
 * Extended config that supports dependency injection
 */
export interface OOREPClientConfig extends OOREPConfig {
  /** Optional session manager for dependency injection */
  sessionManager?: ISessionManager;
}

/**
 * OOREP HTTP Client with retry logic
 * Supports dependency injection for session management
 */
export class OOREPClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries = 3;
  private readonly sessionManager: ISessionManager;
  private readonly defaultRepertory: string;
  private readonly defaultMateriaMedica: string;

  constructor(config: OOREPClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeoutMs = config.timeoutMs;
    this.defaultRepertory = config.defaultRepertory;
    this.defaultMateriaMedica = config.defaultMateriaMedica;

    // Use provided session manager or create default CookieSessionManager
    this.sessionManager =
      config.sessionManager ??
      new CookieSessionManager(new FetchHttpClient({ timeout: config.timeoutMs }), this.baseUrl);
  }

  private getDefaultHeaders(): Record<string, string> {
    return {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
      'X-Requested-With': 'XMLHttpRequest',
    };
  }

  /**
   * Convert native Response headers to Map for session manager
   */
  private handleResponseForSession(response: Response): void {
    // Convert native Response to HttpResponse format for session manager
    const headers = new Map<string, string>();
    response.headers.forEach((value, key) => {
      headers.set(key, value);
    });
    this.sessionManager.handleResponse({
      status: response.status,
      statusText: response.statusText,
      headers,
      data: null,
      ok: response.ok,
    });
  }

  /**
   * Make HTTP request with retry logic
   */
  private async request<T>(
    endpoint: string,
    params: Record<string, string | number | boolean> = {},
    retryCount = 0,
    sessionRetried = false
  ): Promise<T | null> {
    try {
      await this.sessionManager.ensureSession();
    } catch (error) {
      // Preserve TimeoutError for timeout scenarios (HTTP 408)
      const status =
        error instanceof Error && 'status' in error
          ? (error as { status: number }).status
          : undefined;
      if (status === 408) {
        throw new TimeoutError(error instanceof Error ? error.message : String(error));
      }
      // Preserve original error message for better debugging; wrap in NetworkError for consistent handling
      const originalMessage = error instanceof Error ? error.message : String(error);
      throw new NetworkError(
        originalMessage,
        status,
        error instanceof Error ? error : new Error(String(error))
      );
    }
    const url = new URL(`${this.baseUrl}${endpoint}`);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    logger.debug(`Fetching ${url.toString()}`);

    const headers: Record<string, string> = {
      ...this.getDefaultHeaders(),
      ...this.sessionManager.getAuthHeaders(),
    };

    try {
      const response = await fetchWithTimeout(
        url.toString(),
        {
          method: 'GET',
          headers,
        },
        this.timeoutMs
      );

      // Update session with any new cookies from response
      this.handleResponseForSession(response);

      if (response.status === 401 && !sessionRetried) {
        logger.warn('OOREP session unauthorized, attempting refresh');
        await this.sessionManager.ensureSession(true);
        return this.request<T>(endpoint, params, retryCount, true);
      }

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
        throw new RateLimitError('Rate limit exceeded. Please try again later.', retryAfter);
      }

      if (response.status === 204) {
        logger.info('OOREP API returned no content', { endpoint });
        return null;
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new NetworkError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          new Error(errorText)
        );
      }

      const body = await response.text();
      if (!body) {
        return null;
      }

      try {
        return JSON.parse(body) as T;
      } catch (parseError) {
        throw new NetworkError(
          'Failed to parse JSON response from OOREP API',
          undefined,
          parseError instanceof Error ? parseError : new Error(String(parseError))
        );
      }
    } catch (error) {
      if (
        retryCount < this.maxRetries &&
        (error instanceof NetworkError || error instanceof TimeoutError)
      ) {
        const backoffMs = Math.pow(2, retryCount) * 1000;
        logger.warn(
          `Request failed, retrying in ${backoffMs}ms (attempt ${retryCount + 1}/${this.maxRetries})`
        );
        await sleep(backoffMs);
        return this.request<T>(endpoint, params, retryCount + 1, sessionRetried);
      }

      if (error instanceof RateLimitError) {
        throw error;
      }

      if (error instanceof NetworkError || error instanceof TimeoutError) {
        throw error;
      }

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
    remedy?: string;
    includeRemedyStats?: boolean;
  }): Promise<RawRepertoryPayload | null> {
    const repertory = (params.repertory || this.defaultRepertory).trim();
    const minWeight = params.minWeight && params.minWeight > 0 ? params.minWeight : 1;

    logger.info('Looking up repertory', {
      symptom: params.symptom,
      repertory,
      minWeight,
    });

    const apiParams: Record<string, string | number> = {
      repertory,
      symptom: params.symptom,
      page: 0,
      remedyString: params.remedy?.trim() || '',
      minWeight,
      getRemedies: params.includeRemedyStats ? 1 : 0,
    };

    const response = await this.request<RawRepertoryResponse>('/api/lookup_rep', apiParams);
    if (!response) {
      return null;
    }

    const [payload] = response;
    return payload || null;
  }

  /**
   * Search materia medica for symptoms
   * GET /api/lookup_mm
   */
  async lookupMateriaMedica(params: {
    symptom: string;
    materiamedica?: string;
    remedy?: string;
  }): Promise<RawMateriaMedicaResponse | null> {
    const materiamedica = (params.materiamedica || this.defaultMateriaMedica).trim();

    logger.info('Looking up materia medica', {
      symptom: params.symptom,
      materiamedica,
    });

    const apiParams: Record<string, string | number> = {
      mmAbbrev: materiamedica,
      symptom: params.symptom,
      page: 0,
      remedyString: params.remedy?.trim() || '',
    };

    return this.request<RawMateriaMedicaResponse>('/api/lookup_mm', apiParams);
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
      namealt?: string[];
    }>
  > {
    logger.info('Fetching available remedies');
    const result = await this.request<
      Array<{
        id: number;
        nameAbbrev: string;
        nameLong: string;
        namealt?: string[];
      }>
    >('/api/available_remedies');
    return result || [];
  }

  /**
   * Get available repertories
   * GET /api/available_rems_and_reps
   */
  async getAvailableRepertories(): Promise<Array<RepertoryMetadata>> {
    logger.info('Fetching available repertories');
    const result = await this.request<
      Array<{
        info: {
          abbrev: string;
          title: string;
          authorLastName?: string;
          authorFirstName?: string;
          language?: string;
        };
      }>
    >('/api/available_rems_and_reps');

    return (result || []).map((item) => ({
      abbreviation: item.info.abbrev,
      title: item.info.title,
      author:
        item.info.authorLastName && item.info.authorFirstName
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
    const result = await this.request<
      Array<{
        mminfo: {
          id: number;
          abbrev: string;
          displaytitle?: string;
          fulltitle?: string;
          authorlastname?: string;
          authorfirstname?: string;
          lang?: string;
        };
      }>
    >('/api/available_rems_and_mms');

    return (result || []).map((item) => ({
      abbreviation: item.mminfo.abbrev,
      title: item.mminfo.displaytitle || item.mminfo.fulltitle || item.mminfo.abbrev,
      author:
        item.mminfo.authorlastname && item.mminfo.authorfirstname
          ? `${item.mminfo.authorfirstname} ${item.mminfo.authorlastname}`
          : item.mminfo.authorlastname || item.mminfo.authorfirstname,
      language: item.mminfo.lang,
    }));
  }
}

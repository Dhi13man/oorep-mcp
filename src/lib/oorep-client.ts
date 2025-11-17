/**
 * HTTP client for OOREP API with retry logic and error handling
 */

import { OOREPConfig } from '../config.js';
import { logger } from '../utils/logger.js';
import { NetworkError, TimeoutError, RateLimitError } from '../utils/errors.js';
import { RepertoryMetadata, MateriaMedicaMetadata } from '../utils/schemas.js';
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

class CookieJar {
  private readonly cookies = new Map<string, string>();

  hasCookies(): boolean {
    return this.cookies.size > 0;
  }

  clear(): void {
    this.cookies.clear();
  }

  setFromSetCookieHeaders(headers: string[]): void {
    headers.forEach((header) => {
      const [cookiePair] = header.split(';');
      const [name, ...valueParts] = cookiePair.split('=');
      if (!name || valueParts.length === 0) {
        return;
      }
      const value = valueParts.join('=').trim();
      if (value) {
        this.cookies.set(name.trim(), value);
      }
    });
  }

  getCookieHeader(): string | undefined {
    if (!this.hasCookies()) {
      return undefined;
    }
    return Array.from(this.cookies.entries())
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
  }
}

function extractSetCookieHeaders(response: Response): string[] {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie() ?? [];
  }
  const single = response.headers.get('set-cookie');
  return single ? [single] : [];
}

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
  private readonly cookieJar = new CookieJar();
  private sessionInitPromise: Promise<void> | null = null;
  private readonly defaultRepertory: string;
  private readonly defaultMateriaMedica: string;

  constructor(config: OOREPConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeoutMs = config.timeoutMs;
    this.defaultRepertory = config.defaultRepertory;
    this.defaultMateriaMedica = config.defaultMateriaMedica;
  }

  private getDefaultHeaders(): Record<string, string> {
    return {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
      'X-Requested-With': 'XMLHttpRequest',
    };
  }

  private async ensureSession(forceRefresh = false): Promise<void> {
    // If there's already a session init in progress, wait for it
    if (this.sessionInitPromise) {
      await this.sessionInitPromise;
      // After waiting, if forceRefresh is requested but we just got a fresh session, use it
      if (forceRefresh && this.cookieJar.hasCookies()) {
        return;
      }
    }

    // If we have cookies and not forcing refresh, we're done
    if (!forceRefresh && this.cookieJar.hasCookies()) {
      return;
    }

    // Only clear cookies if we're actually going to refresh AND no init is in progress
    if (forceRefresh && !this.sessionInitPromise) {
      this.cookieJar.clear();
    }

    // Start new session init if none in progress
    if (!this.sessionInitPromise) {
      this.sessionInitPromise = this.bootstrapSession().finally(() => {
        this.sessionInitPromise = null;
      });
    }

    await this.sessionInitPromise;
  }

  private async bootstrapSession(): Promise<void> {
    const url = new URL(`${this.baseUrl}/api/available_remedies`);
    url.searchParams.set('limit', '1');

    logger.debug('Initializing OOREP session', { url: url.toString() });

    const response = await fetchWithTimeout(
      url.toString(),
      {
        method: 'GET',
        headers: this.getDefaultHeaders(),
      },
      this.timeoutMs
    );

    this.storeCookies(response);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown session init error');
      throw new NetworkError(
        `Failed to initialize OOREP session (HTTP ${response.status})`,
        response.status,
        new Error(errorText)
      );
    }

    logger.debug('OOREP session initialized');
  }

  private storeCookies(response: Response): void {
    const cookies = extractSetCookieHeaders(response);
    if (cookies.length > 0) {
      this.cookieJar.setFromSetCookieHeaders(cookies);
    }
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
    await this.ensureSession();
    const url = new URL(`${this.baseUrl}${endpoint}`);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    logger.debug(`Fetching ${url.toString()}`);

    const headers: Record<string, string> = {
      ...this.getDefaultHeaders(),
    };
    const cookieHeader = this.cookieJar.getCookieHeader();
    if (cookieHeader) {
      headers.Cookie = cookieHeader;
    }

    try {
      const response = await fetchWithTimeout(
        url.toString(),
        {
          method: 'GET',
          headers,
        },
        this.timeoutMs
      );

      this.storeCookies(response);

      if (response.status === 401 && !sessionRetried) {
        logger.warn('OOREP session unauthorized, attempting refresh');
        await this.ensureSession(true);
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

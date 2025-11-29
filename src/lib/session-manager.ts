/**
 * Cookie-based session manager for OOREP API
 * Implements ISessionManager interface for dependency injection
 */

import type { ISessionManager } from '../interfaces/ISessionManager.js';
import type { IHttpClient, HttpResponse } from '../interfaces/IHttpClient.js';
import type { ILogger } from '../interfaces/ILogger.js';

/**
 * Cookie jar for managing session cookies
 */
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

/**
 * Extract Set-Cookie headers from response
 */
function extractSetCookieHeaders(response: HttpResponse<unknown>): string[] {
  const setCookieHeaders: string[] = [];
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      setCookieHeaders.push(value);
    }
  });
  return setCookieHeaders;
}

/**
 * Cookie-based session manager implementation
 */
export class CookieSessionManager implements ISessionManager {
  private cookieJar = new CookieJar();
  private sessionInitPromise: Promise<void> | null = null;

  constructor(
    private httpClient: IHttpClient,
    private baseUrl: string,
    private logger?: ILogger
  ) {}

  async ensureSession(forceRefresh = false): Promise<void> {
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
    const url = `${this.baseUrl}/api/available_remedies?limit=1`;
    this.logger?.debug('Initializing OOREP session', { url });

    // httpClient.get() throws HttpError with response body on non-ok responses
    const response = await this.httpClient.get(url);
    this.storeCookies(response);

    this.logger?.debug('OOREP session initialized');
  }

  private storeCookies(response: HttpResponse<unknown>): void {
    const cookies = extractSetCookieHeaders(response);
    if (cookies.length > 0) {
      this.cookieJar.setFromSetCookieHeaders(cookies);
    }
  }

  getAuthHeaders(): Record<string, string> {
    const cookieHeader = this.cookieJar.getCookieHeader();
    if (!cookieHeader) {
      return {};
    }
    return {
      Cookie: cookieHeader,
    };
  }

  handleResponse(response: HttpResponse<unknown>): void {
    this.storeCookies(response);
  }

  clearSession(): void {
    this.cookieJar.clear();
  }
}

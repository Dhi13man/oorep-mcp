/**
 * Fetch-based HTTP client implementation
 * Implements IHttpClient interface for dependency injection
 */

import type { IHttpClient, HttpRequestOptions, HttpResponse } from '../interfaces/IHttpClient.js';
import { HttpError } from '../interfaces/IHttpClient.js';
import type { ILogger } from '../interfaces/ILogger.js';

/**
 * Fetch-based HTTP client with timeout and retry support
 */
export class FetchHttpClient implements IHttpClient {
  private logger?: ILogger;
  private defaultTimeout: number;

  constructor(options: { logger?: ILogger; timeout?: number } = {}) {
    this.logger = options.logger;
    this.defaultTimeout = options.timeout ?? 30000;
  }

  async get<T = unknown>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.request<T>('GET', url, undefined, options);
  }

  async post<T = unknown>(
    url: string,
    body?: unknown,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    return this.request<T>('POST', url, body, options);
  }

  async put<T = unknown>(
    url: string,
    body?: unknown,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    return this.request<T>('PUT', url, body, options);
  }

  async delete<T = unknown>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.request<T>('DELETE', url, undefined, options);
  }

  private async request<T>(
    method: string,
    url: string,
    body?: unknown,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    const timeout = options?.timeout ?? this.defaultTimeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      this.logger?.debug(`HTTP ${method} ${url}`);

      const response = await fetch(url, {
        method,
        headers: options?.headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: options?.signal ?? controller.signal,
      });

      clearTimeout(timeoutId);

      // Extract headers
      const headers = new Map<string, string>();
      response.headers.forEach((value, key) => {
        headers.set(key, value);
      });

      // Parse body
      let data: T | null = null;
      const text = await response.text();
      if (text) {
        try {
          data = JSON.parse(text) as T;
        } catch {
          // If not JSON, return text as-is
          data = text as T;
        }
      }

      const httpResponse: HttpResponse<T> = {
        status: response.status,
        statusText: response.statusText,
        headers,
        data,
        ok: response.ok,
      };

      if (!response.ok) {
        throw new HttpError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          httpResponse
        );
      }

      return httpResponse;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }
  }
}

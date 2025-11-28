/**
 * HTTP client interface for dependency injection
 * Allows users to provide custom HTTP clients (fetch, axios, node-fetch, etc.)
 *
 * This abstraction enables:
 * - Custom retry logic
 * - Custom timeouts
 * - Request/response interception
 * - Different HTTP libraries (axios, got, etc.)
 */
export interface IHttpClient {
  /**
   * Make an HTTP GET request
   */
  get<T = unknown>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>>;

  /**
   * Make an HTTP POST request (optional, not currently used by OOREP)
   */
  post?<T = unknown>(
    url: string,
    body?: unknown,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>>;

  /**
   * Make an HTTP PUT request (optional, not currently used by OOREP)
   */
  put?<T = unknown>(
    url: string,
    body?: unknown,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>>;

  /**
   * Make an HTTP DELETE request (optional, not currently used by OOREP)
   */
  delete?<T = unknown>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
}

/**
 * HTTP request options
 */
export interface HttpRequestOptions {
  /** Custom headers to include in the request */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Abort signal for request cancellation */
  signal?: AbortSignal;
}

/**
 * Standardized HTTP response format
 */
export interface HttpResponse<T = unknown> {
  /** HTTP status code */
  status: number;
  /** HTTP status text */
  statusText: string;
  /** Response headers */
  headers: Map<string, string>;
  /** Parsed response body (null if empty or parse failed) */
  data: T | null;
  /** True if status is in 200-299 range */
  ok: boolean;
}

/**
 * HTTP error class thrown by HTTP clients
 * Extends Error to provide HTTP-specific error information
 */
export class HttpError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: HttpResponse<unknown>
  ) {
    super(message);
    this.name = 'HttpError';
    // Fix instanceof checks in TypeScript
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

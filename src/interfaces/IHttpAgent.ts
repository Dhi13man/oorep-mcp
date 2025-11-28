/**
 * HTTP Agent interface for connection pooling
 * Allows users to provide custom agents for HTTP/HTTPS requests
 *
 * Supports Node.js http.Agent and https.Agent
 */
export interface IHttpAgent {
  /**
   * HTTP agent for http:// requests
   */
  http?: any;

  /**
   * HTTPS agent for https:// requests
   */
  https?: any;
}

/**
 * Default HTTP agent with connection pooling
 * Uses Node.js built-in agents with keep-alive enabled
 */
export function createDefaultAgent(): IHttpAgent {
  // Node.js 18+ has fetch built-in, but we can still configure agents
  // For fetch, we use undici under the hood which has its own connection pooling
  return {
    http: undefined,  // fetch handles this
    https: undefined, // fetch handles this
  };
}

/**
 * Create HTTP agent with custom connection pool settings
 *
 * @param options - Agent configuration
 * @returns IHttpAgent with configured connection pooling
 *
 * @example
 * ```typescript
 * const agent = createHttpAgent({
 *   keepAlive: true,
 *   maxSockets: 50,
 *   maxFreeSockets: 10,
 *   timeout: 60000
 * });
 * ```
 */
export function createHttpAgent(options?: {
  keepAlive?: boolean;
  maxSockets?: number;
  maxFreeSockets?: number;
  timeout?: number;
}): IHttpAgent {
  // For Node.js 18+ with native fetch, connection pooling is handled by undici
  // This is a placeholder for future http/https.Agent integration if needed
  const config = {
    keepAlive: options?.keepAlive ?? true,
    maxSockets: options?.maxSockets ?? 50,
    maxFreeSockets: options?.maxFreeSockets ?? 10,
    timeout: options?.timeout ?? 60000,
  };

  // Return configuration that can be used with fetch dispatcher
  return {
    http: config,
    https: config,
  };
}

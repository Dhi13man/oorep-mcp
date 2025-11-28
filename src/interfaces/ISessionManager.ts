import type { HttpResponse } from './IHttpClient.js';

/**
 * Session manager interface for handling authentication/cookies
 * Allows users to provide custom session management strategies
 *
 * The default implementation uses cookies, but users could implement:
 * - OAuth token management
 * - API key rotation
 * - JWT token handling
 * - Custom authentication schemes
 */
export interface ISessionManager {
  /**
   * Ensure session is initialized
   * Called before each API request to ensure valid authentication
   *
   * @param forceRefresh - Force a new session even if one exists
   */
  ensureSession(forceRefresh?: boolean): Promise<void>;

  /**
   * Get headers for authenticated requests
   * @returns Headers to include in API requests (e.g., Cookie, Authorization)
   */
  getAuthHeaders(): Record<string, string>;

  /**
   * Handle response and update session if needed
   * Called after each API response to update session state (e.g., new cookies)
   *
   * @param response - HTTP response from API
   */
  handleResponse(response: HttpResponse<unknown>): void;

  /**
   * Clear session
   * Called to invalidate the current session
   */
  clearSession(): void;
}

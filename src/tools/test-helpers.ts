/**
 * Test helpers for tool unit tests
 */

import { vi, type Mock } from 'vitest';
import type { IOOREPSDKClient } from '../interfaces/IOOREPSDKClient.js';

/**
 * Creates a mock IOOREPSDKClient with all methods stubbed
 * Individual tests can override specific methods as needed
 */
export function createMockSDKClient(): IOOREPSDKClient & { [K in keyof IOOREPSDKClient]: Mock } {
  return {
    searchRepertory: vi.fn(),
    searchMateriaMedica: vi.fn(),
    getRemedyInfo: vi.fn(),
    listRepertories: vi.fn(),
    listMateriaMedicas: vi.fn(),
    clearCache: vi.fn(),
    destroy: vi.fn(),
  };
}

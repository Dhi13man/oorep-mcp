/**
 * Test helpers for tool unit tests
 */

import { vi, type Mock } from 'vitest';
import type { IOOREPClient } from '../interfaces/IOOREPClient.js';

/**
 * Creates a mock IOOREPClient with all methods stubbed
 * Individual tests can override specific methods as needed
 */
export function createMockSDKClient(): IOOREPClient & { [K in keyof IOOREPClient]: Mock } {
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

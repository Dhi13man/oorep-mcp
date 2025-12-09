/**
 * Resource registration and exports
 *
 * This module provides MCP resource access by delegating to OOREPSDKClient.
 * The SDK is the single source of truth for all resource logic.
 */

import { OOREPSDKClient } from '../sdk/client.js';
import { ALL_RESOURCE_URIS, type ResourceUri } from '../sdk/constants.js';
import type { OOREPConfig } from '../config.js';
import { logger } from '../utils/logger.js';
import { sanitizeError, ValidationError } from '../utils/errors.js';

export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export class ResourceRegistry {
  private sdk: OOREPSDKClient;

  constructor(config: OOREPConfig) {
    // Use 1-hour cache TTL for resources (stable data like remedies list)
    this.sdk = new OOREPSDKClient({
      baseUrl: config.baseUrl,
      timeoutMs: config.timeoutMs,
      cacheTtlMs: 3600000, // 1 hour for stable resource data
      defaultRepertory: config.defaultRepertory,
      defaultMateriaMedica: config.defaultMateriaMedica,
    });
  }

  getDefinitions(): ResourceDefinition[] {
    return this.sdk.listResources();
  }

  async getResource(
    uri: string
  ): Promise<{ contents: Array<{ uri: string; mimeType?: string; text: string }> }> {
    try {
      logger.info('Getting resource', { uri });

      // Validate URI is a known resource using constants
      if (!ALL_RESOURCE_URIS.includes(uri as ResourceUri)) {
        throw new ValidationError(`Resource not found: ${uri}`);
      }

      // Delegate to SDK
      const resource = await this.sdk.getResource(uri as ResourceUri);

      // Wrap in MCP-expected format
      return {
        contents: [
          {
            uri: resource.uri,
            mimeType: resource.mimeType,
            text: resource.text,
          },
        ],
      };
    } catch (error) {
      logger.error('Error getting resource', error);
      throw sanitizeError(error);
    }
  }
}

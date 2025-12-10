import { OOREPSDKClient, type ResourceUri } from '../sdk/client.js';
import type { OOREPConfig } from '../config.js';
import { logger } from '../utils/logger.js';
import { sanitizeError } from '../utils/errors.js';

export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export class ResourceRegistry {
  private sdk: OOREPSDKClient;

  constructor(config: OOREPConfig) {
    this.sdk = new OOREPSDKClient({
      baseUrl: config.baseUrl,
      timeoutMs: config.timeoutMs,
      cacheTtlMs: 3600000,
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
      const resource = await this.sdk.getResource(uri as ResourceUri);
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

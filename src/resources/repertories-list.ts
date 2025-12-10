/**
 * Resource: oorep://repertories/list
 *
 * Provides the list of available homeopathic repertories with metadata.
 */

import { RESOURCE_URIS, MIME_TYPES, type ResourceUri } from '../sdk/constants.js';
import type { OOREPClient } from '../lib/oorep-client.js';

export interface ResourceContent {
  uri: ResourceUri;
  mimeType: string;
  text: string;
}

export interface ResourceDefinition {
  uri: ResourceUri;
  name: string;
  description: string;
  mimeType: string;
}

export const repertoriesListDefinition: ResourceDefinition = {
  uri: RESOURCE_URIS.REPERTORIES_LIST,
  name: 'Available Repertories List',
  description: 'List of all accessible repertories with metadata (title, author, language)',
  mimeType: MIME_TYPES.JSON,
};

export async function fetchRepertoriesList(client: OOREPClient): Promise<ResourceContent> {
  const repertories = await client.getAvailableRepertories();
  return {
    uri: RESOURCE_URIS.REPERTORIES_LIST,
    mimeType: MIME_TYPES.JSON,
    text: JSON.stringify(repertories, null, 2),
  };
}

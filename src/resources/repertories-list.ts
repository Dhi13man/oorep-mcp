/**
 * Resource: oorep://repertories/list
 *
 * Provides the list of available homeopathic repertories with metadata.
 */

import { RESOURCE_URIS, MIME_TYPES } from '../sdk/constants.js';
import type { OOREPHttpClient } from '../lib/oorep-client.js';
import type { ResourceContent, ResourceDefinition } from './remedies-list.js';

export const repertoriesListDefinition: ResourceDefinition = {
  uri: RESOURCE_URIS.REPERTORIES_LIST,
  name: 'Available Repertories List',
  description: 'List of all accessible repertories with metadata (title, author, language)',
  mimeType: MIME_TYPES.JSON,
};

export async function fetchRepertoriesList(client: OOREPHttpClient): Promise<ResourceContent> {
  const repertories = await client.getAvailableRepertories();
  return {
    uri: RESOURCE_URIS.REPERTORIES_LIST,
    mimeType: MIME_TYPES.JSON,
    text: JSON.stringify(repertories, null, 2),
  };
}

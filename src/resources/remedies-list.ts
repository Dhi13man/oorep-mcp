/**
 * Resource: oorep://remedies/list
 *
 * Provides the complete list of available homeopathic remedies.
 */

import { RESOURCE_URIS, MIME_TYPES, type ResourceUri } from '../sdk/constants.js';
import { type OOREPResourceDefinition } from '../sdk/resources.js';
import type { OOREPHttpClient } from '../lib/oorep-client.js';

export interface ResourceContent {
  uri: ResourceUri;
  mimeType: string;
  text: string;
}

/**
 * MCP-specific resource definition that extends SDK definition with typed URI
 */
export interface ResourceDefinition extends Omit<OOREPResourceDefinition, 'uri'> {
  uri: ResourceUri;
}

export const remediesListDefinition: ResourceDefinition = {
  uri: RESOURCE_URIS.REMEDIES_LIST,
  name: 'Available Remedies List',
  description: 'Complete list of all available homeopathic remedies with names and abbreviations',
  mimeType: MIME_TYPES.JSON,
};

export async function fetchRemediesList(client: OOREPHttpClient): Promise<ResourceContent> {
  const remedies = await client.getAvailableRemedies();
  return {
    uri: RESOURCE_URIS.REMEDIES_LIST,
    mimeType: MIME_TYPES.JSON,
    text: JSON.stringify(remedies, null, 2),
  };
}

/**
 * Resource definitions for OOREP in various formats
 *
 * These definitions can be used to build custom integrations
 * with different AI SDKs.
 */

import { RESOURCE_URIS, MIME_TYPES } from './constants.js';

// Re-export for convenience
export type { ResourceUri } from './constants.js';
export { RESOURCE_URIS, ALL_RESOURCE_URIS } from './constants.js';

/**
 * Generic resource definition that can be converted to various formats
 */
export interface OOREPResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

/**
 * All OOREP resource definitions
 */
export const resourceDefinitions: OOREPResourceDefinition[] = [
  {
    uri: RESOURCE_URIS.REMEDIES_LIST,
    name: 'Available Remedies List',
    description:
      'Complete list of all available homeopathic remedies with names and abbreviations',
    mimeType: MIME_TYPES.JSON,
  },
  {
    uri: RESOURCE_URIS.REPERTORIES_LIST,
    name: 'Available Repertories List',
    description: 'List of all available homeopathic repertories with metadata',
    mimeType: MIME_TYPES.JSON,
  },
  {
    uri: RESOURCE_URIS.MATERIA_MEDICAS_LIST,
    name: 'Available Materia Medicas List',
    description: 'List of all available materia medica texts with metadata',
    mimeType: MIME_TYPES.JSON,
  },
  {
    uri: RESOURCE_URIS.SEARCH_SYNTAX_HELP,
    name: 'OOREP Search Syntax Help',
    description:
      'Guide to OOREP search syntax including wildcards, exclusions, and exact phrases',
    mimeType: MIME_TYPES.MARKDOWN,
  },
];

/**
 * Get a resource definition by URI
 */
export function getResourceDefinition(uri: string): OOREPResourceDefinition | undefined {
  return resourceDefinitions.find((resource) => resource.uri === uri);
}

/**
 * Get all resource URIs
 */
export function getResourceUris(): string[] {
  return resourceDefinitions.map((resource) => resource.uri);
}

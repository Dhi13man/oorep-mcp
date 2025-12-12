/**
 * Resource: oorep://materia-medicas/list
 *
 * Provides the list of available materia medica texts with metadata.
 */

import { RESOURCE_URIS, MIME_TYPES } from '../sdk/constants.js';
import type { OOREPHttpClient } from '../lib/oorep-client.js';
import type { ResourceContent, ResourceDefinition } from './remedies-list.js';

export const materiaMedicasListDefinition: ResourceDefinition = {
  uri: RESOURCE_URIS.MATERIA_MEDICAS_LIST,
  name: 'Available Materia Medicas List',
  description: 'List of all accessible materia medicas with metadata (title, author, language)',
  mimeType: MIME_TYPES.JSON,
};

export async function fetchMateriaMedicasList(client: OOREPHttpClient): Promise<ResourceContent> {
  const materiaMedicas = await client.getAvailableMateriaMedicas();
  return {
    uri: RESOURCE_URIS.MATERIA_MEDICAS_LIST,
    mimeType: MIME_TYPES.JSON,
    text: JSON.stringify(materiaMedicas, null, 2),
  };
}

/**
 * Resource: oorep://help/search-syntax
 *
 * Provides search syntax documentation for OOREP queries.
 * This is a static resource that doesn't require API calls.
 */

import { RESOURCE_URIS, MIME_TYPES, type ResourceUri } from '../sdk/constants.js';

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

export const searchSyntaxHelpDefinition: ResourceDefinition = {
  uri: RESOURCE_URIS.SEARCH_SYNTAX_HELP,
  name: 'OOREP Search Syntax Help',
  description:
    'Guide to OOREP search syntax including wildcards, exclusions, and exact phrases',
  mimeType: MIME_TYPES.MARKDOWN,
};

const SEARCH_SYNTAX_HELP_TEXT = `# OOREP Search Syntax Guide

## Basic Search

Simple text searches match symptoms and rubrics:
- \`headache\` - finds all entries containing "headache"
- \`headache worse night\` - finds entries with these words

## Wildcards

Use asterisk (*) to match any characters:
- \`head*\` - matches "headache", "head pain", "head pressure", etc.
- \`*ache\` - matches "headache", "backache", "toothache", etc.

**Note**: Wildcards should only be used at the beginning or end of words, not in the middle.

## Exclusions

Use minus sign (-) to exclude terms:
- \`fever -night\` - finds fever entries but excludes those mentioning night
- \`headache -migraine\` - headache entries excluding migraine

## Exact Phrases

Use quotation marks for exact phrase matching:
- \`"worse from cold"\` - exact phrase match
- \`"better from warmth"\` - exact phrase match

## Combining Techniques

You can combine these techniques:
- \`head* -nausea "worse night"\` - headache-related entries, excluding nausea, with exact phrase "worse night"
- \`fever -"worse night" better*\` - fever entries without "worse night" but including "better" variations

## Examples

### Symptom Searches
- \`anxiety fear\` - general anxiety and fear symptoms
- \`cough dry night\` - dry cough at night
- \`pain shooting\` - shooting pains

### Modality Searches
- \`"worse from cold"\` - symptoms worse from cold
- \`"better from motion"\` - symptoms better from motion
- \`-"worse from heat"\` - exclude symptoms worse from heat

### Advanced Searches
- \`headache* "worse night" -nausea\` - comprehensive headache search
- \`anxiety "fear of death" palpitation*\` - anxiety with specific symptoms

## Tips

1. Start with simple searches and refine with exclusions
2. Use wildcards when unsure of exact wording
3. Use exact phrases for modalities and specific symptom descriptions
4. Combine techniques for precise repertorization

## Note

This is a search tool only. Always consult with a qualified homeopathic practitioner for case analysis and remedy selection.
`;

export function getSearchSyntaxHelp(): ResourceContent {
  return {
    uri: RESOURCE_URIS.SEARCH_SYNTAX_HELP,
    mimeType: MIME_TYPES.MARKDOWN,
    text: SEARCH_SYNTAX_HELP_TEXT,
  };
}

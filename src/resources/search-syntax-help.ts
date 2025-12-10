/**
 * Resource: oorep://help/search-syntax
 *
 * Provides search syntax documentation for OOREP queries.
 * This is a static resource that doesn't require API calls.
 */

import { RESOURCE_URIS, MIME_TYPES } from '../sdk/constants.js';
import type { ResourceContent, ResourceDefinition } from './remedies-list.js';

export const searchSyntaxHelpDefinition: ResourceDefinition = {
  uri: RESOURCE_URIS.SEARCH_SYNTAX_HELP,
  name: 'OOREP Search Syntax Help',
  description: 'Guide to OOREP search syntax including wildcards, exclusions, and exact phrases',
  mimeType: MIME_TYPES.MARKDOWN,
};

const SEARCH_SYNTAX_HELP_TEXT = `# OOREP Search Syntax Guide

## Rubric Structure

Repertory rubrics follow a hierarchical structure:
**Location > Symptom > Modality**

Examples:
- "Head, pain, throbbing"
- "Nose, obstruction, chronic"
- "Stomach, pain, burning, after eating"

Understanding this structure helps form better queries.

## Basic Search

Simple text searches match symptoms and rubrics:
- \`headache\` - finds all entries containing "headache"
- \`headache night\` - finds entries with BOTH words (implicit AND)

**Best Practice**: Use 2-3 words maximum per query. Start with location, then symptom.
- ✅ \`head pain\` (location first)
- ❌ \`pain in my head that throbs\` (too verbose)

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
- \`"better from motion"\` - exact phrase match

**Caution**: Exact phrases can be restrictive. If no results, try without quotes.

## Vocabulary Mapping

Repertories use traditional homeopathic terminology. Map common terms:

| Say This | Instead Of |
|----------|------------|
| obstruction | blocked, stopped up, congested |
| agg (aggravation) | worse, worsening |
| amel (amelioration) | better, improving |
| pulsating, throbbing | pounding |
| stitching | sharp, stabbing |
| discharge, coryza | runny nose |
| cephalalgia | headache |
| vertigo | dizziness |
| pyrexia | fever |
| dyspnea | difficulty breathing |
| epistaxis | nosebleed |
| nausea | queasiness |

## Query Optimization

### What Works
- ✅ \`nose obstruction\` - simple, location-first
- ✅ \`head* pain\` - wildcard for variations
- ✅ \`anxiety fear\` - related terms together
- ✅ \`cough dry\` - symptom with characteristic

### What Fails
- ❌ \`"difficulty breathing through blocked nose"\` - too long, use: \`nose obstruction\`
- ❌ \`my head hurts when I move\` - natural language, use: \`head pain motion\`
- ❌ \`headache from stress at work\` - too specific, use: \`head* stress\`

### No Results? Try:
1. Reduce to 2 words
2. Swap vocabulary using table above
3. Add wildcard: \`nose*\` instead of \`nose\`
4. Remove exact phrase quotes
5. Try broader terms: \`pain\` instead of \`sharp shooting pain\`

## Tool Selection Guide

| Tool | When to Use |
|------|-------------|
| \`search_repertory\` | Find rubrics for symptoms. Set \`includeRemedyStats: true\` for aggregated remedy scores |
| \`search_materia_medica\` | Confirm remedy fit. Filter by remedy: \`{"symptom": "fever", "remedy": "Belladonna"}\` |
| \`get_remedy_info\` | Get remedy full name, abbreviation, and alternate names |
| \`list_available_repertories\` | Discover available repertories (kent, boger, publicum, etc.) |
| \`list_available_materia_medicas\` | Discover available materia medica texts |

## Combining Techniques

You can combine these techniques:
- \`head* -nausea\` - headache-related entries, excluding nausea
- \`fever night -intermittent\` - fever at night, excluding intermittent fever

## Examples

### Symptom Searches
- \`anxiety fear\` - general anxiety and fear symptoms
- \`cough dry night\` - dry cough at night
- \`pain stitching\` - stitching pains

### Modality Searches
- \`head* cold agg\` - head symptoms worse from cold
- \`pain motion amel\` - pain better from motion

### Advanced Searches
- \`head* night -nausea\` - comprehensive headache search at night
- \`anxiety palpitation*\` - anxiety with palpitations

## Tips

1. Start simple (2 words), add terms only if too many results
2. Use wildcards when unsure of exact wording
3. Location first, then symptom, then modality
4. Use \`includeRemedyStats: true\` to see aggregated remedy scores
5. Quality over quantity: 5-8 well-chosen searches beat many vague ones

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

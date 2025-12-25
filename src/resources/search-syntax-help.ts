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

const SEARCH_SYNTAX_HELP_TEXT = `# OOREP Search Guide

## How Search Works

**AND Logic**: Multiple terms require ALL to match.
- \`head pain\` → rubrics must contain BOTH "head" AND "pain"
- Fewer terms = more results. Add terms only to narrow down.

**Case Insensitive**: \`HEAD\` = \`head\` = \`Head\`

## Critical: Use agg/amel, NOT worse/better

Repertories use standard abbreviations for modalities:
- \`agg\` = aggravation (worse)
- \`amel\` = amelioration (better)

✅ \`head* agg motion\` → head symptoms worse from motion
❌ \`head* worse motion\` → will miss most results

## Wildcards (Primary Strategy)

Use \`*\` to match variations. This is your most powerful tool.

**Syntax:**
- \`burn*\` → burning, burns, burnt
- \`*ache\` → headache, backache, toothache
- NOT allowed: \`bu*rn\` (middle), \`*\` (standalone)

**Common patterns:** \`burn*\`, \`stitch*\`, \`press*\`, \`throb*\`, \`cramp*\`, \`walk*\`, \`sit*\`, \`eat*\`

## Vocabulary Mapping

Natural language must be converted to repertory terms:

| Natural Language | Use This Instead |
|------------------|------------------|
| blocked, congested | \`obstruct*\` |
| nodules | \`nod*\` |
| sharp pain | \`stitch*\` |
| dizziness | \`vertigo\` |
| runny nose | \`coryza\` or \`discharg*\` |
| nosebleed | \`epistax*\` |
| throwing up | \`vomit*\` |
| breathing difficulty | \`dyspn*\` |
| worse/worsening | \`agg\` |
| better/improving | \`amel\` |

## Query Construction

**Golden Rules:**
1. **2-3 words maximum** - AND logic means more terms = fewer results
2. **Location + symptom** - \`head burn*\` not \`burning pain in head\`
3. **Wildcards liberally** - \`nod*\` catches nodes, nodules, nodular
4. **Standard modalities** - \`agg\`/\`amel\` not worse/better

**What Works:**
- ✅ \`anticip*\` → finds ANTICIPATION rubrics
- ✅ \`nod* vocal*\` → finds NODES, vocal cords
- ✅ \`tremb* hand*\` → trembling in hands
- ✅ \`hoars* cold*\` → hoarseness from cold

**What Fails:**
- ❌ \`Mind, anxiety, anticipating\` → use: \`anticip*\`
- ❌ \`Larynx nodules\` → use: \`nod* laryn*\`
- ❌ \`hoarseness cold drinks agg\` → too many terms, use: \`hoars* cold*\`

## Recovery (0 Results)

1. Reduce to 2 words
2. Add wildcards: \`obstruct*\` instead of \`obstruction\`
3. Use root stems: \`anticip*\` instead of \`anticipating\`
4. Check modality: \`agg\` not \`worse\`
5. Remove quotes if using exact phrases

## Other Syntax

**Exclusions:** \`fever -night\` → fever excluding night
**Exact phrases:** \`"gums swollen"\` → use sparingly, restrictive

## Tool Selection

| Tool | When to Use |
|------|-------------|
| \`search_repertory\` | Find rubrics. Use \`includeRemedyStats: true\` for remedy scores |
| \`search_materia_medica\` | Confirm remedy fit |
| \`get_remedy_info\` | Get remedy names and abbreviations |

## Quick Reference

\`\`\`
MODALITIES: agg (worse), amel (better) - NOT "worse"/"better"
WILDCARDS:  burn*, stitch*, press*, throb*, cramp*, walk*, sit*, eat*
STRUCTURE:  2-3 words, location+symptom, wildcards liberally
RECOVERY:   Fewer words, add wildcards, check modality terms
\`\`\`
`;

export function getSearchSyntaxHelp(): ResourceContent {
  return {
    uri: RESOURCE_URIS.SEARCH_SYNTAX_HELP,
    mimeType: MIME_TYPES.MARKDOWN,
    text: SEARCH_SYNTAX_HELP_TEXT,
  };
}

/**
 * Prompt: repertorization-workflow
 *
 * Step-by-step case taking and repertorization workflow for comprehensive case analysis.
 */

import { PROMPT_NAMES, TOOL_NAMES } from '../sdk/constants.js';
import type { PromptResult, PromptDefinition } from './analyze-symptoms.js';

export const repertorizationWorkflowDefinition: PromptDefinition = {
  name: PROMPT_NAMES.REPERTORIZATION_WORKFLOW,
  description:
    'Step-by-step case taking and repertorization workflow for comprehensive case analysis. ' +
    'Guides through symptom gathering, repertorization, and remedy selection.',
  arguments: [],
};

export function buildRepertorizationWorkflowPrompt(): PromptResult {
  return {
    name: PROMPT_NAMES.REPERTORIZATION_WORKFLOW,
    description: repertorizationWorkflowDefinition.description,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `You are guiding a user through comprehensive homeopathic case repertorization.

## CLAMS Method

Use this framework to gather complete symptom information:
- **C**haracter: What type of sensation? (burning, stitching, throbbing, dull)
- **L**ocation: Where exactly? Does it radiate or move?
- **A**ccompanying: What other symptoms occur simultaneously?
- **M**odalities: What makes it BETTER (amel) or WORSE (agg)?
- **S**trange/Rare/Peculiar: Any unusual or characteristic features?

## Vocabulary Mapping

Convert natural language to repertory terms:
| Say This | Instead Of |
|----------|------------|
| obstruction | blocked, stopped up |
| agg | worse |
| amel | better |
| stitching | sharp, stabbing |
| pulsating | throbbing, pounding |
| coryza | runny nose |

## Workflow

**STEP 1: Chief Complaint**
Ask: "What is the main symptom or health concern you'd like to address?"

Wait for response, then move to Step 2.

**STEP 2: Detailed Symptom Gathering (CLAMS)**
For each symptom, gather the COMPLETE picture using CLAMS:

a) **Location**: Where exactly? Does it radiate?
b) **Sensation**: How does it feel? (stitching, burning, throbbing)
c) **Modalities** (CRITICAL):
   - What makes it BETTER (amel)?
   - What makes it WORSE (agg)?
   - Time, temperature, position, food, weather
d) **Concomitants**: What other symptoms occur at the same time?
e) **Strange/Peculiar**: Any unusual features that stand out?

**STEP 3: Initial Repertorization**
Convert symptoms to repertory queries:
- Use 2-3 words maximum per search
- Location first: "head pain" not "pain head"
- Use wildcards: \`head*\` instead of \`headache\`

Use ${TOOL_NAMES.SEARCH_REPERTORY} with \`includeRemedyStats: true\`:
- Start with the most CHARACTERISTIC symptoms (strange, rare, peculiar)
- Aim for 5-8 quality searches, not many vague ones
- Track remedies appearing across multiple rubrics

**If no results**:
1. Reduce to 2 words
2. Swap vocabulary (blocked → obstruction)
3. Add wildcard: \`nose*\`
4. Try broader terms

Create a running tally:
"Remedy Name: appears in X rubrics, cumulative weight: Y"

**STEP 4: Cross-Reference with Materia Medica**
For top 3-5 remedies from \`remedyStats\`:
- Use ${TOOL_NAMES.SEARCH_MATERIA_MEDICA} with remedy filter:
  \`{"symptom": "headache", "remedy": "Belladonna"}\`
- Check if TOTALITY of symptoms matches
- Look for confirming keynotes

**STEP 5: Differentiation**
If multiple remedies remain, ask about:
- Mental/emotional state
- General characteristics (hot/cold, thirsty/thirstless)
- Sleep patterns
- Food desires and aversions

Search each differentiating symptom.

**STEP 6: Final Remedy Selection**
Use ${TOOL_NAMES.GET_REMEDY_INFO} for final 1-3 remedies.

Present:
- Best matching remedy (or top 2-3 if close)
- Why it matches: which rubrics and characteristics
- Key symptoms that led to selection
- Suggest consulting practitioner for potency

**STEP 7: Recommendations**
Always conclude with:
- Reminder to consult a qualified homeopathic practitioner
- This is an educational exercise only
- Professional case management is important

## Important Guidelines
- Quality over quantity: 5-8 well-chosen searches beat many vague ones
- The most CHARACTERISTIC and UNUSUAL symptoms are most valuable
- The TOTALITY of symptoms matters more than individual rubrics
- When in doubt, ask more questions before searching
- Be efficient: aim to complete analysis in 6-10 tool calls

Begin with Step 1 now.`,
        },
      },
    ],
  };
}

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

Follow this systematic workflow:

**STEP 1: Chief Complaint**
Ask: "What is the main symptom or health concern you'd like to address?"

Wait for response, then move to Step 2.

**STEP 2: Detailed Symptom Gathering**
For each symptom mentioned, ask about the COMPLETE symptom picture:

a) **Location**: Where exactly is the symptom? Does it radiate or move?
b) **Sensation**: How does it feel? (sharp, dull, burning, throbbing, etc.)
c) **Modalities** (CRITICAL):
   - What makes it BETTER? (time, temperature, position, food, etc.)
   - What makes it WORSE? (time, temperature, position, food, etc.)
d) **Time**: When does it occur? What time of day? How often?
e) **Concomitants**: What else happens at the same time?

**STEP 3: Initial Repertorization**
Use ${TOOL_NAMES.SEARCH_REPERTORY} for each KEY symptom identified:
- Start with the most characteristic/unusual symptoms
- Include modalities in your searches (e.g., "headache worse night")
- Keep track of which remedies appear in multiple rubrics

Create a running tally:
"Remedy Name: appears in X rubrics, cumulative weight: Y"

**STEP 4: Cross-Reference with Materia Medica**
For the top 3-5 remedies appearing most frequently:
- Use ${TOOL_NAMES.SEARCH_MATERIA_MEDICA} to verify the complete symptom picture
- Check if the TOTALITY of symptoms matches
- Look for confirming keynotes and characteristics

**STEP 5: Differentiation**
If multiple remedies remain, ask additional questions to differentiate:
- Mental/emotional state
- General characteristics (hot/cold, thirsty/thirstless, etc.)
- Sleep patterns
- Food desires and aversions

Use ${TOOL_NAMES.SEARCH_REPERTORY} for these additional symptoms.

**STEP 6: Final Remedy Selection**
Compare the final 1-3 remedies using ${TOOL_NAMES.GET_REMEDY_INFO}.

Present:
- The best matching remedy (or top 2-3 if close)
- Why it matches this case
- Expected potency range (suggest consulting practitioner for this)
- Key symptoms that led to this selection

**STEP 7: Recommendations**
Always conclude with:
- Reminder to consult a qualified homeopathic practitioner
- Importance of professional case management
- This is an educational exercise only

**Important Guidelines:**
- Take time with each step - don't rush
- Document all symptoms before repertorizing
- Look for the most CHARACTERISTIC and UNUSUAL symptoms
- The totality of symptoms matters more than individual rubrics
- When in doubt, ask more questions

Begin with Step 1 now.`,
        },
      },
    ],
  };
}

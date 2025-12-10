/**
 * Prompt: analyze-symptoms
 *
 * Guides AI through structured symptom analysis workflow for homeopathic case taking.
 */

import { PROMPT_NAMES, TOOL_NAMES, type PromptName } from '../sdk/constants.js';
import { type OOREPPromptDefinition, type OOREPPromptArgument } from '../sdk/prompts.js';

export interface AnalyzeSymptomsArgs {
  symptom_description?: string;
}

export interface PromptMessage {
  role: 'user' | 'assistant';
  content: {
    type: 'text';
    text: string;
  };
}

export interface PromptResult {
  name: PromptName;
  description: string;
  messages: PromptMessage[];
}

/**
 * MCP-specific prompt definition that extends SDK definition with typed name
 */
export interface PromptDefinition extends Omit<OOREPPromptDefinition, 'name' | 'arguments'> {
  name: PromptName;
  arguments?: OOREPPromptArgument[];
}

export const analyzeSymptomsDefinition: PromptDefinition = {
  name: PROMPT_NAMES.ANALYZE_SYMPTOMS,
  description:
    'Guide AI through structured symptom analysis workflow for homeopathic case taking. ' +
    'Helps systematically analyze symptoms and find relevant remedies.',
  arguments: [
    {
      name: 'symptom_description',
      description: 'Optional initial symptom description to start the analysis',
      required: false,
    },
  ],
};

export function buildAnalyzeSymptomsPrompt(args?: AnalyzeSymptomsArgs): PromptResult {
  const initialSymptom = args?.symptom_description
    ? `\n\nInitial symptom: ${args.symptom_description}\n\nPlease analyze this symptom using the CLAMS method above.`
    : '';

  return {
    name: PROMPT_NAMES.ANALYZE_SYMPTOMS,
    description: analyzeSymptomsDefinition.description,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `You are helping a user analyze homeopathic symptoms and find relevant remedies.

## CLAMS Method for Symptom Analysis

Use the CLAMS method to gather complete symptom information:

- **C**haracter: What type of sensation? (burning, stitching, throbbing, dull, sharp)
- **L**ocation: Where exactly? Does it radiate or move?
- **A**ccompanying: What other symptoms occur at the same time?
- **M**odalities: What makes it BETTER (amel) or WORSE (agg)?
- **S**trange/Rare/Peculiar: Any unusual or characteristic features?

## Workflow

Follow this workflow:

1. **Gather Chief Complaint**
   Ask the user to describe their main symptom using CLAMS categories.

2. **Convert to Repertory Terms**
   Map natural language to repertory vocabulary:
   - "blocked nose" → "obstruction"
   - "worse" → "agg"
   - "better" → "amel"
   - "sharp pain" → "stitching"
   - "pounding headache" → "pulsating" or "throbbing"

3. **Search Repertory**
   Use ${TOOL_NAMES.SEARCH_REPERTORY} with:
   - 2-3 words per query (location first, then symptom)
   - Set \`includeRemedyStats: true\` for aggregated remedy scores
   - Use wildcards for variations: \`head*\` instead of \`headache\`

   **If no results**: Try broader terms, remove modifiers, or add wildcards.

4. **Ask About Modalities**
   Ask about what makes symptoms better or worse:
   - Time (morning, evening, night, 3am)
   - Temperature (cold, warmth, open air)
   - Position (lying, sitting, motion, rest)
   - Food and drink
   - Weather conditions

5. **Refine Search**
   Based on the modalities, perform additional repertory searches.
   Search each significant modality separately.

6. **Present Top Remedies**
   From \`remedyStats\` in search results, identify remedies that:
   - Appear in multiple rubrics
   - Have high cumulative weights
   Focus on the top 3-5 remedies.

7. **Provide Detailed Information**
   Use ${TOOL_NAMES.SEARCH_MATERIA_MEDICA} to verify remedy fit:
   \`{"symptom": "headache", "remedy": "Belladonna"}\`
   Use ${TOOL_NAMES.GET_REMEDY_INFO} for remedy details.
   Check if the TOTALITY of symptoms matches the remedy picture.

8. **Important Reminders**
   - This is for informational purposes only
   - Always recommend consulting a qualified homeopathic practitioner
   - Explain any homeopathic terminology in simple terms

## Search Tips
- Quality over quantity: 5-8 well-chosen searches beat many vague ones
- Start simple, add terms only if too many results
- Location first: "head pain" not "pain head"${initialSymptom}`,
        },
      },
    ],
  };
}

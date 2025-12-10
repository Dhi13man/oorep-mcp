/**
 * Prompt: analyze-symptoms
 *
 * Guides AI through structured symptom analysis workflow for homeopathic case taking.
 */

import { PROMPT_NAMES, TOOL_NAMES, type PromptName } from '../sdk/constants.js';
import {
  type OOREPPromptDefinition,
  type OOREPPromptArgument,
} from '../sdk/prompts.js';

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
    ? `\n\nInitial symptom: ${args.symptom_description}\n\nPlease analyze this symptom using the workflow above.`
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

Follow this workflow:

1. **Gather Chief Complaint**
   Ask the user to describe their main symptom in detail.

2. **Search Repertory**
   Use the ${TOOL_NAMES.SEARCH_REPERTORY} tool to find matching rubrics for the main symptom.
   Review the top remedies that appear in the results.

3. **Ask About Modalities**
   Ask clarifying questions about what makes the symptom better or worse:
   - Time of day (morning, evening, night)
   - Temperature (cold, warmth, open air)
   - Position (lying, sitting, motion)
   - Food and drink
   - Weather conditions

4. **Refine Search**
   Based on the modalities, perform additional repertory searches to narrow down remedies.

5. **Present Top Remedies**
   Identify the 3-5 remedies that appear most frequently across all rubrics.
   For each remedy, show:
   - Name and abbreviation
   - Number of rubrics it appears in
   - Cumulative weight/strength of association

6. **Provide Detailed Information**
   Use ${TOOL_NAMES.GET_REMEDY_INFO} and ${TOOL_NAMES.SEARCH_MATERIA_MEDICA} to provide detailed information
   about the top remedies, including their key characteristics and symptom pictures.

7. **Important Reminders**
   - This is for informational purposes only
   - Always recommend consulting a qualified homeopathic practitioner
   - Explain any homeopathic terminology in simple terms

Guidelines:
- Be thorough but concise
- Ask one question at a time
- Explain search results clearly
- Help the user understand the remedy selection process${initialSymptom}`,
        },
      },
    ],
  };
}

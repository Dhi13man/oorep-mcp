/**
 * Prompt: remedy-comparison
 *
 * Compare multiple homeopathic remedies side-by-side to identify the best match.
 */

import { PROMPT_NAMES, TOOL_NAMES, type PromptName } from '../sdk/constants.js';
import type { ILogger } from '../interfaces/ILogger.js';

export interface RemedyComparisonArgs {
  remedies: string;
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

export interface PromptDefinition {
  name: PromptName;
  description: string;
  arguments?: Array<{ name: string; description: string; required: boolean }>;
}

export const remedyComparisonDefinition: PromptDefinition = {
  name: PROMPT_NAMES.REMEDY_COMPARISON,
  description:
    'Compare multiple homeopathic remedies side-by-side to identify the best match. ' +
    'Useful for differential diagnosis between similar remedies.',
  arguments: [
    {
      name: 'remedies',
      description:
        'Comma-separated list of remedy names to compare (e.g., "Aconite,Belladonna,Gelsemium")',
      required: true,
    },
  ],
};

export function buildRemedyComparisonPrompt(
  args: RemedyComparisonArgs,
  logger?: ILogger
): PromptResult {
  const remedyList = args.remedies
    .split(',')
    .map((r) => r.trim())
    .filter((r) => r.length > 0);

  if (remedyList.length < 2) {
    throw new Error(
      'At least 2 remedies are required for comparison. Please provide remedies as a comma-separated list.'
    );
  }

  const maxRemedies = 6;
  if (remedyList.length > maxRemedies) {
    logger?.warn(
      `Limiting remedy comparison to ${maxRemedies} remedies (${remedyList.length} provided)`
    );
    remedyList.splice(maxRemedies);
  }

  const tableHeader = '| Aspect                | ' + remedyList.join(' | ') + ' |';
  const tableSeparator =
    '|----------------------|' + remedyList.map(() => '----------|').join('');
  const tableRows = [
    '| Key Mental Symptoms  | ' + remedyList.map(() => '...').join('      | ') + '      |',
    '| Key Physical Symptoms| ' + remedyList.map(() => '...').join('      | ') + '      |',
    '| Better From          | ' + remedyList.map(() => '...').join('      | ') + '      |',
    '| Worse From           | ' + remedyList.map(() => '...').join('      | ') + '      |',
    '| Time Modality        | ' + remedyList.map(() => '...').join('      | ') + '      |',
    '| Distinctive Features | ' + remedyList.map(() => '...').join('      | ') + '      |',
  ].join('\n   ');

  return {
    name: PROMPT_NAMES.REMEDY_COMPARISON,
    description: remedyComparisonDefinition.description,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `You are comparing homeopathic remedies to help identify the best match.

Remedies to compare: ${remedyList.join(', ')}

For each remedy, perform the following steps:

1. **Get Basic Information**
   Use ${TOOL_NAMES.GET_REMEDY_INFO} for each remedy to gather:
   - Full name and abbreviations
   - Alternative names

2. **Search Materia Medica**
   Use ${TOOL_NAMES.SEARCH_MATERIA_MEDICA} to find key symptoms for each remedy.
   Focus on:
   - Mental/emotional symptoms
   - Physical keynote symptoms
   - Modalities (better/worse from)
   - Concomitant symptoms

3. **Create Comparison Table**
   Present the comparison in a clear table format:

   ${tableHeader}
   ${tableSeparator}
   ${tableRows}

4. **Analysis**
   Provide:
   - Similarities between the remedies
   - Key differentiating factors
   - Guidance on when to choose each remedy
   - Clinical tips for differentiation

5. **Summary**
   Conclude with a clear summary of:
   - Most important distinguishing characteristics
   - Questions to ask to differentiate between these remedies
   - Recommendation to consult a qualified practitioner

Remember:
- Focus on distinctive, differentiating features
- Use clear, accessible language
- Cite specific symptoms from materia medica sources
- This is for educational purposes only`,
        },
      },
    ],
  };
}

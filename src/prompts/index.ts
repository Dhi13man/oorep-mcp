/**
 * Prompt registration and exports
 */

import { logger } from '../utils/logger.js';

export interface PromptDefinition {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
}

export interface PromptMessage {
  role: 'user' | 'assistant';
  content: {
    type: 'text';
    text: string;
  };
}

export class PromptRegistry {
  getDefinitions(): PromptDefinition[] {
    return [
      {
        name: 'analyze-symptoms',
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
      },
      {
        name: 'remedy-comparison',
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
      },
      {
        name: 'repertorization-workflow',
        description:
          'Step-by-step case taking and repertorization workflow for comprehensive case analysis. ' +
          'Guides through symptom gathering, repertorization, and remedy selection.',
        arguments: [],
      },
    ];
  }

  async getPrompt(
    name: string,
    args?: Record<string, string>
  ): Promise<{ messages: PromptMessage[] }> {
    logger.info('Getting prompt', { name, args });

    switch (name) {
      case 'analyze-symptoms':
        return this.getAnalyzeSymptomsPrompt(args?.symptom_description);

      case 'remedy-comparison':
        return this.getRemedyComparisonPrompt(args?.remedies);

      case 'repertorization-workflow':
        return this.getRepertorizationWorkflowPrompt();

      default:
        throw new Error(`Prompt not found: ${name}`);
    }
  }

  private getAnalyzeSymptomsPrompt(symptomDescription?: string): { messages: PromptMessage[] } {
    const initialSymptom = symptomDescription
      ? `\n\nInitial symptom: ${symptomDescription}\n\nPlease analyze this symptom using the workflow above.`
      : '';

    return {
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
   Use the search_repertory tool to find matching rubrics for the main symptom.
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
   Use get_remedy_info and search_materia_medica to provide detailed information
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

  private getRemedyComparisonPrompt(remedies?: string): { messages: PromptMessage[] } {
    if (!remedies) {
      throw new Error('remedies argument is required for remedy-comparison prompt');
    }

    const remedyList = remedies.split(',').map((r) => r.trim()).filter((r) => r.length > 0);

    // Validate: need at least 2 remedies to compare
    if (remedyList.length < 2) {
      throw new Error(
        'At least 2 remedies are required for comparison. Please provide remedies as a comma-separated list.'
      );
    }

    // Limit to max 6 remedies for table readability
    const maxRemedies = 6;
    if (remedyList.length > maxRemedies) {
      logger.warn(`Limiting remedy comparison to ${maxRemedies} remedies (${remedyList.length} provided)`);
      remedyList.splice(maxRemedies);
    }

    // Dynamically generate table header
    const tableHeader = '| Aspect                | ' + remedyList.join(' | ') + ' |';
    const tableSeparator = '|----------------------|' + remedyList.map(() => '----------|').join('');
    const tableRows = [
      '| Key Mental Symptoms  | ' + remedyList.map(() => '...').join('      | ') + '      |',
      '| Key Physical Symptoms| ' + remedyList.map(() => '...').join('      | ') + '      |',
      '| Better From          | ' + remedyList.map(() => '...').join('      | ') + '      |',
      '| Worse From           | ' + remedyList.map(() => '...').join('      | ') + '      |',
      '| Time Modality        | ' + remedyList.map(() => '...').join('      | ') + '      |',
      '| Distinctive Features | ' + remedyList.map(() => '...').join('      | ') + '      |',
    ].join('\n   ');

    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `You are comparing homeopathic remedies to help identify the best match.

Remedies to compare: ${remedyList.join(', ')}

For each remedy, perform the following steps:

1. **Get Basic Information**
   Use get_remedy_info for each remedy to gather:
   - Full name and abbreviations
   - Alternative names

2. **Search Materia Medica**
   Use search_materia_medica to find key symptoms for each remedy.
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

  private getRepertorizationWorkflowPrompt(): { messages: PromptMessage[] } {
    return {
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
Use search_repertory for each KEY symptom identified:
- Start with the most characteristic/unusual symptoms
- Include modalities in your searches (e.g., "headache worse night")
- Keep track of which remedies appear in multiple rubrics

Create a running tally:
"Remedy Name: appears in X rubrics, cumulative weight: Y"

**STEP 4: Cross-Reference with Materia Medica**
For the top 3-5 remedies appearing most frequently:
- Use search_materia_medica to verify the complete symptom picture
- Check if the TOTALITY of symptoms matches
- Look for confirming keynotes and characteristics

**STEP 5: Differentiation**
If multiple remedies remain, ask additional questions to differentiate:
- Mental/emotional state
- General characteristics (hot/cold, thirsty/thirstless, etc.)
- Sleep patterns
- Food desires and aversions

Use search_repertory for these additional symptoms.

**STEP 6: Final Remedy Selection**
Compare the final 1-3 remedies using get_remedy_info.

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
}

/**
 * Unit tests for prompt registry
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PromptRegistry } from './index.js';

describe('PromptRegistry', () => {
  let mockRegistry: PromptRegistry;

  beforeEach(() => {
    mockRegistry = new PromptRegistry();
  });

  describe('getDefinitions', () => {
    it('getDefinitions when called then returns array of prompt definitions', () => {
      const definitions = mockRegistry.getDefinitions();

      expect(Array.isArray(definitions)).toBe(true);
      expect(definitions.length).toBe(3);
    });

    it('getDefinitions when called then includes analyze-symptoms prompt', () => {
      const definitions = mockRegistry.getDefinitions();
      const prompt = definitions.find((d) => d.name === 'analyze-symptoms');

      expect(prompt).toBeDefined();
      expect(prompt?.description).toContain('symptom analysis');
    });

    it('getDefinitions when called then includes remedy-comparison prompt', () => {
      const definitions = mockRegistry.getDefinitions();
      const prompt = definitions.find((d) => d.name === 'remedy-comparison');

      expect(prompt).toBeDefined();
      expect(prompt?.description).toContain('Compare multiple');
    });

    it('getDefinitions when called then includes repertorization-workflow prompt', () => {
      const definitions = mockRegistry.getDefinitions();
      const prompt = definitions.find((d) => d.name === 'repertorization-workflow');

      expect(prompt).toBeDefined();
      expect(prompt?.description).toContain('case taking');
    });

    it('getDefinitions when called then each definition has required properties', () => {
      const definitions = mockRegistry.getDefinitions();

      definitions.forEach((def) => {
        expect(def).toHaveProperty('name');
        expect(def).toHaveProperty('description');
      });
    });
  });

  describe('getPrompt - analyze-symptoms', () => {
    it('getPrompt when analyze-symptoms without args then returns workflow', async () => {
      const result = await mockRegistry.getPrompt('analyze-symptoms');

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].role).toBe('user');
      expect(result.messages[0].content.type).toBe('text');
      expect(result.messages[0].content.text).toContain('workflow');
    });

    it('getPrompt when analyze-symptoms with symptom_description then includes it', async () => {
      const result = await mockRegistry.getPrompt('analyze-symptoms', {
        symptom_description: 'headache worse at night',
      });

      expect(result.messages[0].content.text).toContain('headache worse at night');
    });

    it('getPrompt when analyze-symptoms then includes gathering step', async () => {
      const result = await mockRegistry.getPrompt('analyze-symptoms');

      expect(result.messages[0].content.text).toContain('Gather Chief Complaint');
    });

    it('getPrompt when analyze-symptoms then includes search repertory step', async () => {
      const result = await mockRegistry.getPrompt('analyze-symptoms');

      expect(result.messages[0].content.text).toContain('Search Repertory');
    });

    it('getPrompt when analyze-symptoms then includes modalities step', async () => {
      const result = await mockRegistry.getPrompt('analyze-symptoms');

      expect(result.messages[0].content.text).toContain('Ask About Modalities');
    });

    it('getPrompt when analyze-symptoms then includes disclaimer', async () => {
      const result = await mockRegistry.getPrompt('analyze-symptoms');

      expect(result.messages[0].content.text).toContain('qualified homeopathic practitioner');
    });
  });

  describe('getPrompt - remedy-comparison', () => {
    it('getPrompt when remedy-comparison without remedies then throws error', async () => {
      await expect(mockRegistry.getPrompt('remedy-comparison')).rejects.toThrow();
    });

    it('getPrompt when remedy-comparison with empty remedies then throws error', async () => {
      await expect(mockRegistry.getPrompt('remedy-comparison', { remedies: '' })).rejects.toThrow();
    });

    it('getPrompt when remedy-comparison with one remedy then throws error', async () => {
      await expect(
        mockRegistry.getPrompt('remedy-comparison', { remedies: 'Aconite' })
      ).rejects.toThrow();
    });

    it('getPrompt when remedy-comparison with valid remedies then returns prompt', async () => {
      const result = await mockRegistry.getPrompt('remedy-comparison', {
        remedies: 'Aconite,Belladonna',
      });

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content.text).toContain('Aconite');
      expect(result.messages[0].content.text).toContain('Belladonna');
    });

    it('getPrompt when remedy-comparison then includes comparison table', async () => {
      const result = await mockRegistry.getPrompt('remedy-comparison', {
        remedies: 'Aconite,Belladonna',
      });

      expect(result.messages[0].content.text).toContain('Aspect');
      expect(result.messages[0].content.text).toContain('Key Mental Symptoms');
      expect(result.messages[0].content.text).toContain('Better From');
      expect(result.messages[0].content.text).toContain('Worse From');
    });

    it('getPrompt when remedy-comparison with whitespace then trims remedies', async () => {
      const result = await mockRegistry.getPrompt('remedy-comparison', {
        remedies: ' Aconite , Belladonna ',
      });

      expect(result.messages[0].content.text).toContain('Aconite');
      expect(result.messages[0].content.text).toContain('Belladonna');
    });

    it('getPrompt when remedy-comparison with more than 6 remedies then limits to 6', async () => {
      const remedies = 'A,B,C,D,E,F,G,H';
      const result = await mockRegistry.getPrompt('remedy-comparison', { remedies });

      const text = result.messages[0].content.text;
      expect(text).toContain('A');
      expect(text).toContain('F');
      expect(text).not.toContain('G');
      expect(text).not.toContain('H');
    });

    it('getPrompt when remedy-comparison then includes get remedy info step', async () => {
      const result = await mockRegistry.getPrompt('remedy-comparison', {
        remedies: 'Aconite,Belladonna',
      });

      expect(result.messages[0].content.text).toContain('get_remedy_info');
    });

    it('getPrompt when remedy-comparison then includes search materia medica step', async () => {
      const result = await mockRegistry.getPrompt('remedy-comparison', {
        remedies: 'Aconite,Belladonna',
      });

      expect(result.messages[0].content.text).toContain('search_materia_medica');
    });

    it('getPrompt when remedy-comparison then includes disclaimer', async () => {
      const result = await mockRegistry.getPrompt('remedy-comparison', {
        remedies: 'Aconite,Belladonna',
      });

      expect(result.messages[0].content.text).toContain('educational purposes');
    });

    it('getPrompt when remedy-comparison with 3 remedies then table has 3 columns', async () => {
      const result = await mockRegistry.getPrompt('remedy-comparison', {
        remedies: 'Aconite,Belladonna,Gelsemium',
      });

      expect(result.messages[0].content.text).toContain('Aconite');
      expect(result.messages[0].content.text).toContain('Belladonna');
      expect(result.messages[0].content.text).toContain('Gelsemium');
    });
  });

  describe('getPrompt - repertorization-workflow', () => {
    it('getPrompt when repertorization-workflow then returns workflow', async () => {
      const result = await mockRegistry.getPrompt('repertorization-workflow');

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].role).toBe('user');
      expect(result.messages[0].content.type).toBe('text');
    });

    it('getPrompt when repertorization-workflow then includes step 1', async () => {
      const result = await mockRegistry.getPrompt('repertorization-workflow');

      expect(result.messages[0].content.text).toContain('STEP 1');
      expect(result.messages[0].content.text).toContain('Chief Complaint');
    });

    it('getPrompt when repertorization-workflow then includes step 2', async () => {
      const result = await mockRegistry.getPrompt('repertorization-workflow');

      expect(result.messages[0].content.text).toContain('STEP 2');
      expect(result.messages[0].content.text).toContain('Detailed Symptom Gathering');
    });

    it('getPrompt when repertorization-workflow then includes step 3', async () => {
      const result = await mockRegistry.getPrompt('repertorization-workflow');

      expect(result.messages[0].content.text).toContain('STEP 3');
      expect(result.messages[0].content.text).toContain('Initial Repertorization');
    });

    it('getPrompt when repertorization-workflow then includes step 4', async () => {
      const result = await mockRegistry.getPrompt('repertorization-workflow');

      expect(result.messages[0].content.text).toContain('STEP 4');
      expect(result.messages[0].content.text).toContain('Cross-Reference');
    });

    it('getPrompt when repertorization-workflow then includes step 5', async () => {
      const result = await mockRegistry.getPrompt('repertorization-workflow');

      expect(result.messages[0].content.text).toContain('STEP 5');
      expect(result.messages[0].content.text).toContain('Differentiation');
    });

    it('getPrompt when repertorization-workflow then includes step 6', async () => {
      const result = await mockRegistry.getPrompt('repertorization-workflow');

      expect(result.messages[0].content.text).toContain('STEP 6');
      expect(result.messages[0].content.text).toContain('Final Remedy Selection');
    });

    it('getPrompt when repertorization-workflow then includes step 7', async () => {
      const result = await mockRegistry.getPrompt('repertorization-workflow');

      expect(result.messages[0].content.text).toContain('STEP 7');
      expect(result.messages[0].content.text).toContain('Recommendations');
    });

    it('getPrompt when repertorization-workflow then includes modalities questions', async () => {
      const result = await mockRegistry.getPrompt('repertorization-workflow');

      expect(result.messages[0].content.text).toContain('Location');
      expect(result.messages[0].content.text).toContain('Sensation');
      expect(result.messages[0].content.text).toContain('Modalities');
    });

    it('getPrompt when repertorization-workflow then includes disclaimer', async () => {
      const result = await mockRegistry.getPrompt('repertorization-workflow');

      expect(result.messages[0].content.text).toContain('qualified homeopathic practitioner');
      expect(result.messages[0].content.text).toContain('educational exercise');
    });
  });

  describe('getPrompt - error handling', () => {
    it('getPrompt when unknown prompt name then throws error', async () => {
      await expect(mockRegistry.getPrompt('unknown-prompt')).rejects.toThrow();
    });

    it('getPrompt when unknown prompt name then error mentions prompt name', async () => {
      try {
        await mockRegistry.getPrompt('unknown-prompt');
      } catch (error) {
        expect((error as Error).message).toContain('unknown-prompt');
      }
    });
  });

  describe('prompt message structure', () => {
    it('getPrompt when any prompt then message has user role', async () => {
      const prompts = ['analyze-symptoms', 'repertorization-workflow'];

      for (const promptName of prompts) {
        const result = await mockRegistry.getPrompt(promptName);
        expect(result.messages[0].role).toBe('user');
      }
    });

    it('getPrompt when any prompt then content has text type', async () => {
      const prompts = ['analyze-symptoms', 'repertorization-workflow'];

      for (const promptName of prompts) {
        const result = await mockRegistry.getPrompt(promptName);
        expect(result.messages[0].content.type).toBe('text');
      }
    });

    it('getPrompt when any prompt then content text is non-empty', async () => {
      const prompts = ['analyze-symptoms', 'repertorization-workflow'];

      for (const promptName of prompts) {
        const result = await mockRegistry.getPrompt(promptName);
        expect(result.messages[0].content.text.length).toBeGreaterThan(0);
      }
    });
  });
});

/**
 * Unit tests for OOREP SDK Tool Definitions
 */

import { describe, it, expect } from 'vitest';
import { toolDefinitions, getToolDefinition, getToolNames, type OOREPToolDefinition } from './tools.js';

describe('toolDefinitions', () => {
  it('when accessed then contains all five tools', () => {
    // Assert
    expect(toolDefinitions).toHaveLength(5);
  });

  it.each([
    'search_repertory',
    'search_materia_medica',
    'get_remedy_info',
    'list_available_repertories',
    'list_available_materia_medicas',
  ])('when accessed then contains tool %s', (toolName) => {
    // Act
    const tool = toolDefinitions.find((t) => t.name === toolName);

    // Assert
    expect(tool).toBeDefined();
  });

  describe('tool structure validation', () => {
    it.each(toolDefinitions.map((t) => [t.name, t]))(
      'when tool %s then has required fields',
      (_name, tool) => {
        // Assert
        expect(tool.name).toBeDefined();
        expect(typeof tool.name).toBe('string');
        expect(tool.description).toBeDefined();
        expect(typeof tool.description).toBe('string');
        expect(tool.parameters).toBeDefined();
        expect(tool.parameters.type).toBe('object');
        expect(tool.parameters.properties).toBeDefined();
        expect(Array.isArray(tool.parameters.required)).toBe(true);
      }
    );
  });

  describe('search_repertory tool', () => {
    const tool = toolDefinitions.find((t) => t.name === 'search_repertory')!;

    it('when accessed then has correct required parameters', () => {
      // Assert
      expect(tool.parameters.required).toContain('symptom');
      expect(tool.parameters.required).toHaveLength(1);
    });

    it('when accessed then has symptom property', () => {
      // Assert
      expect(tool.parameters.properties.symptom).toBeDefined();
      expect(tool.parameters.properties.symptom.type).toBe('string');
    });

    it('when accessed then has repertory property', () => {
      // Assert
      expect(tool.parameters.properties.repertory).toBeDefined();
      expect(tool.parameters.properties.repertory.type).toBe('string');
    });

    it('when accessed then has minWeight property with constraints', () => {
      // Assert
      const minWeightProp = tool.parameters.properties.minWeight;
      expect(minWeightProp).toBeDefined();
      expect(minWeightProp.type).toBe('number');
      expect(minWeightProp.minimum).toBe(1);
      expect(minWeightProp.maximum).toBe(4);
    });

    it('when accessed then has maxResults property with constraints', () => {
      // Assert
      const maxResultsProp = tool.parameters.properties.maxResults;
      expect(maxResultsProp).toBeDefined();
      expect(maxResultsProp.type).toBe('number');
      expect(maxResultsProp.minimum).toBe(1);
      expect(maxResultsProp.maximum).toBe(100);
      expect(maxResultsProp.default).toBe(20);
    });

    it('when accessed then has includeRemedyStats property', () => {
      // Assert
      const prop = tool.parameters.properties.includeRemedyStats;
      expect(prop).toBeDefined();
      expect(prop.type).toBe('boolean');
      expect(prop.default).toBe(true);
    });
  });

  describe('search_materia_medica tool', () => {
    const tool = toolDefinitions.find((t) => t.name === 'search_materia_medica')!;

    it('when accessed then has correct required parameters', () => {
      // Assert
      expect(tool.parameters.required).toContain('symptom');
      expect(tool.parameters.required).toHaveLength(1);
    });

    it('when accessed then has materiamedica property', () => {
      // Assert
      expect(tool.parameters.properties.materiamedica).toBeDefined();
      expect(tool.parameters.properties.materiamedica.type).toBe('string');
    });

    it('when accessed then has remedy property', () => {
      // Assert
      expect(tool.parameters.properties.remedy).toBeDefined();
      expect(tool.parameters.properties.remedy.type).toBe('string');
    });

    it('when accessed then has maxResults with correct constraints', () => {
      // Assert
      const prop = tool.parameters.properties.maxResults;
      expect(prop.minimum).toBe(1);
      expect(prop.maximum).toBe(50);
      expect(prop.default).toBe(10);
    });
  });

  describe('get_remedy_info tool', () => {
    const tool = toolDefinitions.find((t) => t.name === 'get_remedy_info')!;

    it('when accessed then has remedy as required parameter', () => {
      // Assert
      expect(tool.parameters.required).toContain('remedy');
      expect(tool.parameters.required).toHaveLength(1);
    });

    it('when accessed then has remedy property', () => {
      // Assert
      expect(tool.parameters.properties.remedy).toBeDefined();
      expect(tool.parameters.properties.remedy.type).toBe('string');
    });
  });

  describe('list_available_repertories tool', () => {
    const tool = toolDefinitions.find((t) => t.name === 'list_available_repertories')!;

    it('when accessed then has no required parameters', () => {
      // Assert
      expect(tool.parameters.required).toHaveLength(0);
    });

    it('when accessed then has language property', () => {
      // Assert
      expect(tool.parameters.properties.language).toBeDefined();
      expect(tool.parameters.properties.language.type).toBe('string');
    });
  });

  describe('list_available_materia_medicas tool', () => {
    const tool = toolDefinitions.find((t) => t.name === 'list_available_materia_medicas')!;

    it('when accessed then has no required parameters', () => {
      // Assert
      expect(tool.parameters.required).toHaveLength(0);
    });

    it('when accessed then has language property', () => {
      // Assert
      expect(tool.parameters.properties.language).toBeDefined();
      expect(tool.parameters.properties.language.type).toBe('string');
    });
  });
});

describe('getToolDefinition', () => {
  it.each([
    'search_repertory',
    'search_materia_medica',
    'get_remedy_info',
    'list_available_repertories',
    'list_available_materia_medicas',
  ])('when valid tool name %s then returns tool definition', (toolName) => {
    // Act
    const tool = getToolDefinition(toolName);

    // Assert
    expect(tool).toBeDefined();
    expect(tool?.name).toBe(toolName);
  });

  it('when unknown tool name then returns undefined', () => {
    // Act
    const tool = getToolDefinition('nonexistent_tool');

    // Assert
    expect(tool).toBeUndefined();
  });

  it('when valid tool name then returns complete definition', () => {
    // Act
    const tool = getToolDefinition('search_repertory');

    // Assert
    expect(tool).toMatchObject<Partial<OOREPToolDefinition>>({
      name: 'search_repertory',
      parameters: {
        type: 'object',
        properties: expect.any(Object),
        required: expect.any(Array),
      },
    });
  });
});

describe('getToolNames', () => {
  it('when called then returns array of all tool names', () => {
    // Act
    const names = getToolNames();

    // Assert
    expect(names).toHaveLength(5);
    expect(names).toContain('search_repertory');
    expect(names).toContain('search_materia_medica');
    expect(names).toContain('get_remedy_info');
    expect(names).toContain('list_available_repertories');
    expect(names).toContain('list_available_materia_medicas');
  });

  it('when called then returns strings only', () => {
    // Act
    const names = getToolNames();

    // Assert
    names.forEach((name) => {
      expect(typeof name).toBe('string');
    });
  });

  it('when called then returns unique names', () => {
    // Act
    const names = getToolNames();
    const uniqueNames = new Set(names);

    // Assert
    expect(uniqueNames.size).toBe(names.length);
  });
});

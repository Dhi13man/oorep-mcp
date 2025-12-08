/**
 * Zod schemas for runtime validation and type safety
 */

import { z } from 'zod/v4';

// Re-export z for consistent usage across the codebase
export { z };

// ====================
// Tool Input Schemas
// ====================

export const SearchRepertoryArgsSchema = z.object({
  symptom: z
    .string()
    .min(3, 'Symptom must be at least 3 characters')
    .max(200, 'Symptom must not exceed 200 characters')
    .regex(/^[a-zA-Z0-9\s\-*"'.,;:()\/&]+$/, 'Symptom contains invalid characters')
    .refine((s) => !/\w\*\w/.test(s), 'Wildcards (*) cannot appear in the middle of words')
    .transform((s) => s.trim()),
  repertory: z
    .string()
    .optional()
    .describe(
      'Repertory abbreviation (e.g., "kent"). Defaults to OOREP_MCP_DEFAULT_REPERTORY when omitted.'
    ),
  minWeight: z.number().int().min(1).max(4).optional().describe('Minimum remedy weight (1-4)'),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(20)
    .describe('Maximum number of results to return'),
  includeRemedyStats: z
    .boolean()
    .optional()
    .default(true)
    .describe('Include remedy statistics in results'),
});

export const SearchMateriaMedicaArgsSchema = z.object({
  symptom: z
    .string()
    .min(3, 'Symptom must be at least 3 characters')
    .max(200, 'Symptom must not exceed 200 characters')
    .transform((s) => s.trim()),
  materiamedica: z
    .string()
    .optional()
    .describe(
      'Materia medica abbreviation (e.g., "boericke"). Defaults to OOREP_MCP_DEFAULT_MATERIA_MEDICA when omitted.'
    ),
  remedy: z.string().optional().describe('Filter by specific remedy name'),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(10)
    .describe('Maximum number of results to return'),
});

export const GetRemedyInfoArgsSchema = z.object({
  remedy: z.string().min(1, 'Remedy name is required').describe('Remedy name or abbreviation'),
});

export const ListRepertoriesArgsSchema = z.object({
  language: z.string().optional().describe('Filter by language (e.g., "en", "de")'),
});

export const ListMateriaMedicasArgsSchema = z.object({
  language: z.string().optional().describe('Filter by language (e.g., "en", "de")'),
});

// ====================
// OOREP API Response Schemas
// ====================

export const RemedySchema = z.object({
  name: z.string(),
  abbreviation: z.string(),
  weight: z.number(),
});

export const RubricSchema = z.object({
  rubric: z.string(),
  repertory: z.string(),
  weight: z.number().optional(),
  label: z.string().optional(),
  remedies: z.array(RemedySchema),
});

export const RepertorySearchResultSchema = z.object({
  totalResults: z.number(),
  totalPages: z.number().optional(),
  currentPage: z.number().optional(),
  rubrics: z.array(RubricSchema),
  remedyStats: z
    .array(
      z.object({
        name: z.string(),
        count: z.number(),
        cumulativeWeight: z.number(),
      })
    )
    .optional(),
});

export const MateriaMedicaSectionSchema = z.object({
  heading: z.string().optional(),
  content: z.string(),
  depth: z.number().optional(),
});

export const MateriaMedicaResultSchema = z.object({
  remedy: z.string(),
  remedyId: z.number().optional(),
  materiamedica: z.string(),
  sections: z.array(MateriaMedicaSectionSchema),
  hitCount: z.number().optional(),
});

export const MateriaMedicaSearchResultSchema = z.object({
  totalResults: z.number(),
  results: z.array(MateriaMedicaResultSchema),
});

export const RepertoryMetadataSchema = z.object({
  abbreviation: z.string(),
  title: z.string(),
  author: z.string().optional(),
  year: z.number().optional(),
  language: z.string().optional(),
  edition: z.string().optional(),
  publisher: z.string().optional(),
  license: z.string().optional(),
  remedyCount: z.number().optional(),
});

export const MateriaMedicaMetadataSchema = z.object({
  abbreviation: z.string(),
  title: z.string(),
  author: z.string().optional(),
  year: z.number().optional(),
  language: z.string().optional(),
  edition: z.string().optional(),
  publisher: z.string().optional(),
  license: z.string().optional(),
});

export const RemedyInfoSchema = z.object({
  id: z.number(),
  nameAbbrev: z.string(),
  nameLong: z.string(),
  nameAlt: z.array(z.string()).optional(),
});

// ====================
// Type exports
// ====================

export type SearchRepertoryArgs = z.infer<typeof SearchRepertoryArgsSchema>;
export type SearchMateriaMedicaArgs = z.infer<typeof SearchMateriaMedicaArgsSchema>;
export type GetRemedyInfoArgs = z.infer<typeof GetRemedyInfoArgsSchema>;
export type ListRepertoriesArgs = z.infer<typeof ListRepertoriesArgsSchema>;
export type ListMateriaMedicasArgs = z.infer<typeof ListMateriaMedicasArgsSchema>;

export type Remedy = z.infer<typeof RemedySchema>;
export type Rubric = z.infer<typeof RubricSchema>;
export type RepertorySearchResult = z.infer<typeof RepertorySearchResultSchema>;
export type MateriaMedicaSection = z.infer<typeof MateriaMedicaSectionSchema>;
export type MateriaMedicaResult = z.infer<typeof MateriaMedicaResultSchema>;
export type MateriaMedicaSearchResult = z.infer<typeof MateriaMedicaSearchResultSchema>;
export type RepertoryMetadata = z.infer<typeof RepertoryMetadataSchema>;
export type MateriaMedicaMetadata = z.infer<typeof MateriaMedicaMetadataSchema>;
export type RemedyInfo = z.infer<typeof RemedyInfoSchema>;

// ====================
// Output Schema Utilities
// ====================

/**
 * MCP-compatible output schema type definition
 */
export interface MCPOutputSchema {
  type: 'object';
  properties?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

/**
 * Convert a Zod schema to MCP-compatible JSON Schema format for outputSchema
 *
 * Uses Zod v4's native toJSONSchema for accurate conversion
 *
 * @param schema - Zod schema to convert
 * @returns JSON Schema object compatible with MCP outputSchema field
 */
export function zodToOutputSchema(schema: z.ZodType): MCPOutputSchema {
  // Use Zod v4's native JSON Schema conversion
  const jsonSchema = z.toJSONSchema(schema);

  // Ensure the schema has the required structure for MCP
  const result: MCPOutputSchema = {
    type: 'object',
    additionalProperties: false,
  };

  if (typeof jsonSchema === 'object' && jsonSchema !== null) {
    if ('properties' in jsonSchema) {
      result.properties = jsonSchema.properties as Record<string, unknown>;
    }
    if ('required' in jsonSchema && Array.isArray(jsonSchema.required)) {
      result.required = jsonSchema.required as string[];
    }
  }

  return result;
}

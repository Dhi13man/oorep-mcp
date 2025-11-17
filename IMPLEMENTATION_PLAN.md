# OOREP MCP Server - Comprehensive Implementation Plan

**Version:** 1.0
**Date:** 2025-11-16
**Status:** Ready for Implementation

## 1. Executive Summary

### Project Goal

Build a production-ready Model Context Protocol (MCP) server that exposes OOREP's homeopathic repertory and materia medica data to AI assistants, enabling intelligent symptom analysis and remedy suggestions.

### Key Objectives

- ✅ Provide seamless access to OOREP's comprehensive homeopathic database
- ✅ Follow industry best practices for MCP server development
- ✅ Ensure security, performance, and reliability
- ✅ Enable easy installation and configuration for end users
- ✅ Publish to official registries for maximum discoverability

### Target Audiences

1. **Homeopathic practitioners** using AI assistants for case analysis
2. **Students** learning homeopathy with AI tutoring
3. **Researchers** exploring remedies and symptom correlations
4. **AI developers** building homeopathy-focused applications

## 2. Project Overview

### What is OOREP?

OOREP (Open Online Repertory) is a comprehensive web-based homeopathic repertorisation system providing:

- 12+ repertories (Kent, Boger, Boericke, etc.)
- Multiple materia medicas
- Advanced search capabilities (wildcards, exclusions, exact phrases)
- 600+ remedies with detailed symptom mappings

### What is MCP?

Model Context Protocol is a standardized protocol enabling AI assistants to:

- **Tools**: Execute functions with structured inputs/outputs
- **Resources**: Access static/dynamic data sources
- **Prompts**: Use pre-configured prompt templates

### Why OOREP + MCP?

Combining OOREP's extensive database with MCP enables:

- Natural language symptom queries ("headache worse at night")
- AI-assisted remedy selection based on multiple symptoms
- Contextual materia medica exploration
- Intelligent case repertorization workflows

## 3. Architecture Design

### High-Level Architecture

```plain
┌─────────────────────────────────────────────────────────────┐
│                    AI Client Layer                           │
│  (Claude Desktop, VS Code, Cursor, Custom Apps)              │
└────────────────────────┬────────────────────────────────────┘
                         │ MCP Protocol (JSON-RPC 2.0)
                         │ via stdio/SSE/HTTP
┌────────────────────────┴────────────────────────────────────┐
│              OOREP MCP Server (Node.js/TypeScript)           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  MCP Protocol Layer (@modelcontextprotocol/sdk)      │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌─────────────┬─────────────┬─────────────┬───────────┐   │
│  │   Tools     │  Resources  │   Prompts   │  Config   │   │
│  │  Handler    │   Handler   │   Handler   │  Manager  │   │
│  └─────────────┴─────────────┴─────────────┴───────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Business Logic Layer                       │   │
│  │  ┌───────────┬────────────┬──────────┬──────────┐   │   │
│  │  │  Search   │   Data     │  Cache   │ Validator│   │   │
│  │  │  Engine   │  Formatter │  Manager │          │   │   │
│  │  └───────────┴────────────┴──────────┴──────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          HTTP Client Layer (with retry logic)         │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/HTTPS
                         │
┌────────────────────────┴────────────────────────────────────┐
│                  OOREP Backend (Scala/Play)                  │
│         Public API Endpoints (repertory, MM, etc.)           │
└──────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Single Responsibility**: Each module handles one concern
2. **Separation of Layers**: Protocol ↔ Business Logic ↔ External API
3. **Type Safety**: Zod schemas for runtime validation + TypeScript types
4. **Error Handling**: Graceful degradation with user-friendly messages
5. **Performance**: Caching, lazy loading, request debouncing
6. **Security**: Input validation, path sanitization, no credential storage
7. **Testability**: Modular design with dependency injection

## 4. Implementation Phases

### Phase 1: Foundation (Week 1)

**Goal**: Setup infrastructure and core architecture

- [ ] Update dependencies (Zod, testing libraries, latest MCP SDK)
- [ ] Restructure codebase (tools/, resources/, prompts/, lib/, utils/)
- [ ] Implement configuration management (env vars, CLI args)
- [ ] Create HTTP client wrapper with retry logic
- [ ] Setup logging infrastructure (stderr, debug levels)
- [ ] Implement error classes (UserError, ValidationError, etc.)
- [ ] Add ESLint + Prettier configuration
- [ ] Setup Vitest testing framework

**Deliverables**:

- Updated package.json with all dependencies
- Complete project structure
- HTTP client with timeout/retry
- Configuration system
- Logging system
- Error handling framework
- Testing infrastructure

### Phase 2: Core Tools (Week 2)

**Goal**: Implement essential search tools

- [ ] Tool: `search_repertory` (symptom → rubrics with remedies)
- [ ] Tool: `search_materia_medica` (symptom → remedy sections)
- [ ] Tool: `get_remedy_info` (remedy details)
- [ ] Tool: `list_available_repertories` (metadata)
- [ ] Tool: `list_available_materia_medicas` (metadata)
- [ ] Zod schemas for all tool arguments
- [ ] Input validation and sanitization
- [ ] Response formatting and error handling
- [ ] Unit tests for each tool

**Deliverables**:

- 5 working tools with full validation
- Comprehensive unit test coverage
- Integration tests with mock OOREP API
- Tool documentation

### Phase 3: Resources (Week 2-3)

**Goal**: Expose static and dynamic data resources

- [ ] Resource: `oorep://remedies/list` (all remedies)
- [ ] Resource: `oorep://repertories/list` (all repertories)
- [ ] Resource: `oorep://materia-medicas/list` (all MMs)
- [ ] Resource: `oorep://remedies/{id}/info` (dynamic template)
- [ ] Resource: `oorep://help/search-syntax` (guide)
- [ ] Resource link support in tool outputs
- [ ] Caching layer for static resources
- [ ] Tests for all resources

**Deliverables**:

- 5 resources (3 static, 2 dynamic)
- Resource caching implementation
- Resource tests
- Resource documentation

### Phase 4: Prompts & Advanced Features (Week 3)

**Goal**: Add prompt templates and optimization

- [ ] Prompt: `analyze-symptoms` (guided symptom analysis)
- [ ] Prompt: `remedy-comparison` (compare 2+ remedies)
- [ ] Prompt: `repertorization-workflow` (step-by-step case taking)
- [ ] Implement intelligent caching (5min TTL for metadata)
- [ ] Add request debouncing/deduplication
- [ ] Performance monitoring and logging
- [ ] Load testing

**Deliverables**:

- 3 prompt templates
- Caching system with TTL
- Performance optimization
- Load test results

### Phase 5: Testing & Quality Assurance (Week 4)

**Goal**: Comprehensive testing and validation

- [ ] Integration tests with real OOREP API
- [ ] End-to-end tests with MCP Inspector
- [ ] Client compatibility tests (Claude Desktop, VS Code, Cursor)
- [ ] Error scenario testing (network failures, timeouts, invalid inputs)
- [ ] Security testing (input injection, path traversal)
- [ ] Performance benchmarking
- [ ] Code coverage > 85%

**Deliverables**:

- Full test suite
- Test coverage report
- Performance benchmarks
- Security audit report

### Phase 6: Documentation & Publishing (Week 4-5)

**Goal**: Prepare for public release

- [ ] Complete README.md with all client configs
- [ ] API reference documentation
- [ ] Usage examples and tutorials
- [ ] Troubleshooting guide
- [ ] CHANGELOG.md
- [ ] LICENSE file (MIT or GPL-3.0 to match OOREP)
- [ ] Contributing guidelines
- [ ] Create server.json for MCP registry
- [ ] Build and test npm package
- [ ] Publish to npm registry
- [ ] Submit to official MCP registry
- [ ] Create Dockerfile (optional)
- [ ] Publish to Docker Hub (optional)

**Deliverables**:

- Complete documentation
- Published npm package
- MCP registry submission
- Docker image (optional)

## 5. Technical Specifications

### Runtime Requirements

- **Node.js**: ≥ 18.0.0 (LTS recommended)
- **TypeScript**: ≥ 5.4.0
- **OS**: Linux, macOS, Windows (cross-platform)

### Dependencies

**Production**:

```json
{
  "@modelcontextprotocol/sdk": "^1.19.1",
  "zod": "^3.25.76",
  "zod-to-json-schema": "^3.23.5"
}
```

**Development**:

```json
{
  "@types/node": "^22.0.0",
  "@typescript-eslint/eslint-plugin": "^7.0.0",
  "@typescript-eslint/parser": "^7.0.0",
  "@vitest/coverage-v8": "^2.0.0",
  "eslint": "^9.0.0",
  "prettier": "^3.0.0",
  "tsx": "^4.7.0",
  "typescript": "^5.8.0",
  "vitest": "^2.1.0"
}
```

### Configuration

**Environment Variables**:

```bash
# Required
OOREP_MCP_BASE_URL=https://www.oorep.com

# Optional
OOREP_MCP_TIMEOUT_MS=30000          # HTTP timeout (default: 30000)
OOREP_MCP_CACHE_TTL_MS=300000       # Cache TTL (default: 300000 = 5min)
OOREP_MCP_MAX_RESULTS=100           # Max results per query (default: 100)
OOREP_MCP_LOG_LEVEL=info            # Logging level (debug|info|warn|error)
```

**CLI Arguments** (optional):

```bash
oorep-mcp --base-url https://localhost:9000 --timeout 60000
```

## 6. API Mapping Strategy

### OOREP API Coverage

| OOREP Endpoint | MCP Mapping | Priority | Notes |
|----------------|-------------|----------|-------|
| `/api/lookup_rep` | Tool: `search_repertory` | **High** | Core functionality |
| `/api/lookup_mm` | Tool: `search_materia_medica` | **High** | Core functionality |
| `/api/available_remedies` | Resource: `oorep://remedies/list` | **High** | Static data, cache |
| `/api/available_rems_and_reps` | Resource: `oorep://repertories/list` | **High** | Static data, cache |
| `/api/available_rems_and_mms` | Resource: `oorep://materia-medicas/list` | **High** | Static data, cache |
| `/api/authenticate` | N/A | **Low** | Read-only public access only |
| `/api/sec/*` | N/A | **Not Supported** | Requires authentication, out of scope |

### Design Decisions

**What to Include**:

- ✅ Public read-only endpoints
- ✅ Search and lookup operations
- ✅ Metadata retrieval (remedies, repertories, MMs)
- ✅ Static reference data

**What to Exclude**:

- ❌ Authentication endpoints (no user login)
- ❌ Secured `/api/sec/*` endpoints (require auth)
- ❌ Case management (POST/PUT/DELETE operations)
- ❌ Cookie/session management

**Rationale**: Focus on read-only, stateless operations that provide value to AI assistants without requiring user authentication or state management.

## 7. Tools Design

### Tool 1: `search_repertory`

**Purpose**: Search for symptoms in homeopathic repertories and return matching rubrics with remedies.

**Input Schema**:

```typescript
{
  symptom: string,              // Search term (required, 3-200 chars)
  repertory?: string,           // Repertory abbreviation (optional, e.g., "kent")
  minWeight?: number,           // Minimum remedy weight (optional, 1-4)
  maxResults?: number,          // Result limit (optional, 1-100, default: 20)
  includeRemedyStats?: boolean  // Include remedy statistics (optional, default: true)
}
```

**Output Format**:

```typescript
{
  totalResults: number,
  totalPages: number,
  currentPage: number,
  rubrics: [
    {
      rubric: string,
      repertory: string,
      weight: number,
      label?: string,
      remedies: [
        {
          name: string,
          abbreviation: string,
          weight: number
        }
      ]
    }
  ],
  remedyStats?: [
    {
      name: string,
      count: number,
      cumulativeWeight: number
    }
  ]
}
```

**Example**:

```plain
Input: { symptom: "headache worse night", repertory: "kent", maxResults: 5 }
Output: [List of 5 matching rubrics with remedies]
```

**Error Handling**:

- Invalid symptom (empty, too short, too long) → UserError
- Invalid repertory → UserError
- Network timeout → Retry 3x with exponential backoff
- OOREP API error → Forward error message

### Tool 2: `search_materia_medica`

**Purpose**: Search materia medica texts for symptoms and return matching remedy sections.

**Input Schema**:

```typescript
{
  symptom: string,              // Search term (required, 3-200 chars)
  materiamedica?: string,       // MM abbreviation (optional, e.g., "hering")
  remedy?: string,              // Filter by specific remedy (optional)
  maxResults?: number           // Result limit (optional, 1-50, default: 10)
}
```

**Output Format**:

```typescript
{
  totalResults: number,
  results: [
    {
      remedy: string,
      remedyId: number,
      materiamedica: string,
      sections: [
        {
          heading?: string,
          content: string,
          depth: number
        }
      ],
      hitCount: number
    }
  ]
}
```

**Example**:

```plain
Input: { symptom: "fever", materiamedica: "hering", maxResults: 3 }
Output: [3 remedies with matching sections]
```

### Tool 3: `get_remedy_info`

**Purpose**: Retrieve comprehensive information about a specific remedy.

**Input Schema**:

```typescript
{
  remedy: string,               // Remedy name or abbreviation (required)
  includeMateriaMedica?: boolean, // Include MM sections (optional, default: false)
  includeRepertory?: boolean    // Include repertory entries (optional, default: false)
}
```

**Output Format**:

```typescript
{
  id: number,
  nameAbbrev: string,
  nameLong: string,
  nameAlt: string[],
  availableIn: {
    repertories: string[],
    materiaMedicas: string[]
  },
  // If includeRepertory = true
  repertoryEntries?: [...],
  // If includeMateriaMedica = true
  materiaMedicaSections?: [...]
}
```

**Implementation Note**: This requires multiple API calls (remedy lookup + optional MM/repertory data). Use Promise.all for parallel fetching.

### Tool 4: `list_available_repertories`

**Purpose**: Get list of all accessible repertories with metadata.

**Input Schema**:

```typescript
{
  language?: string             // Filter by language (optional, e.g., "en", "de")
}
```

**Output Format**:

```typescript
{
  repertories: [
    {
      abbreviation: string,
      title: string,
      author: string,
      year: number,
      language: string,
      edition?: string,
      publisher?: string,
      license: string,
      remedyCount: number
    }
  ]
}
```

**Caching**: Cache for 5 minutes (metadata rarely changes).

### Tool 5: `list_available_materia_medicas`

**Purpose**: Get list of all accessible materia medicas with metadata.

**Input Schema**:

```typescript
{
  language?: string             // Filter by language (optional)
}
```

**Output Format**: Similar to `list_available_repertories` but for materia medicas.

**Caching**: Cache for 5 minutes.

## 8. Resources Design

### Resource 1: `oorep://remedies/list`

**Type**: Static (cached)
**MIME Type**: `application/json`
**Description**: Complete list of all available remedies

**Data Structure**:

```json
[
  {
    "id": 1,
    "nameAbbrev": "Acon.",
    "nameLong": "Aconitum napellus",
    "nameAlt": ["Aconite", "Monkshood"]
  }
]
```

**Update Frequency**: Cache for 1 hour (600+ remedies, stable data)

### Resource 2: `oorep://repertories/list`

**Type**: Static (cached)
**MIME Type**: `application/json`
**Description**: List of all repertories with metadata

**Data Structure**: Array of repertory objects (see tool output above)

**Update Frequency**: Cache for 5 minutes

### Resource 3: `oorep://materia-medicas/list`

**Type**: Static (cached)
**MIME Type**: `application/json`
**Description**: List of all materia medicas with metadata

**Data Structure**: Array of MM objects

**Update Frequency**: Cache for 5 minutes

### Resource 4: `oorep://remedies/{remedyId}/info`

**Type**: Dynamic (URI template)
**MIME Type**: `application/json`
**Description**: Detailed information about specific remedy

**URI Template**: `oorep://remedies/{remedyId}/info`

**Example**: `oorep://remedies/aconite/info`

**Data Structure**: Comprehensive remedy data (see Tool 3 output)

### Resource 5: `oorep://help/search-syntax`

**Type**: Static
**MIME Type**: `text/markdown`
**Description**: Guide to OOREP search syntax (wildcards, exclusions, etc.)

**Content**:

```markdown
# OOREP Search Syntax Guide

## Basic Search
- Simple text: `headache`
- Multiple words: `headache worse night`

## Wildcards
- Asterisk (*): Match any characters
- Example: `head*` matches "headache", "head pain", etc.

## Exclusions
- Minus prefix (-): Exclude terms
- Example: `fever -night` (fever but not at night)

## Exact Phrases
- Quotation marks: "exact phrase"
- Example: `"worse from cold"`

## Combining Techniques
- Example: `head* -nausea "worse night"`
```

## 9. Prompts Design

### Prompt 1: `analyze-symptoms`

**Purpose**: Guide AI through structured symptom analysis workflow

**Template**:

```plain
You are helping a user analyze homeopathic symptoms and find relevant remedies.

Follow this workflow:
1. Ask the user to describe their main symptom
2. Use the search_repertory tool to find matching rubrics
3. Review the top remedies from the results
4. Ask clarifying questions about modalities (better/worse from...)
5. Refine the search with additional symptoms
6. Present the top 3-5 remedies with their key characteristics
7. Use get_remedy_info to provide detailed remedy information

Always:
- Be thorough but concise
- Explain homeopathic terminology when needed
- Remind the user this is for informational purposes only
- Recommend consulting a qualified homeopath for treatment

{{symptom_description}}
```

**Arguments**:

```typescript
{
  symptom_description?: string  // Optional initial symptom
}
```

### Prompt 2: `remedy-comparison`

**Purpose**: Compare multiple remedies side-by-side

**Template**:

```plain
You are comparing homeopathic remedies to help identify the best match.

Remedies to compare: {{remedies}}

For each remedy:
1. Use get_remedy_info to gather detailed information
2. Use search_materia_medica to find key symptoms
3. Extract distinctive characteristics
4. Note modalities and keynotes

Present comparison in table format:
| Aspect | Remedy 1 | Remedy 2 | Remedy 3 |
|--------|----------|----------|----------|
| Key symptoms | ... | ... | ... |
| Better from | ... | ... | ... |
| Worse from | ... | ... | ... |
| Mental state | ... | ... | ... |
| Distinctive features | ... | ... | ... |

Conclude with:
- Similarities between remedies
- Key differentiating factors
- Guidance on selection criteria
```

**Arguments**:

```typescript
{
  remedies: string[]            // List of remedy names to compare
}
```

### Prompt 3: `repertorization-workflow`

**Purpose**: Step-by-step case taking and repertorization

**Template**:

```plain
You are guiding a user through homeopathic case repertorization.

**Step 1: Chief Complaint**
Ask: "What is the main symptom or concern?"

**Step 2: Detailed Symptom Gathering**
For each symptom, ask about:
- Location (where exactly?)
- Sensation (how does it feel?)
- Modalities (what makes it better/worse?)
- Concomitants (what else happens at the same time?)
- Time (when does it occur?)

**Step 3: Initial Repertorization**
Use search_repertory for each key symptom.
Note the remedies appearing in multiple rubrics.

**Step 4: Cross-Reference**
For the top 3-5 remedies appearing most frequently:
- Use search_materia_medica to verify symptom pictures
- Check if the complete symptom picture matches

**Step 5: Differentiation**
Compare final remedies using get_remedy_info.
Present the best matches with reasoning.

**Step 6: Recommendation**
Provide the top 1-2 remedies with:
- Why they match this case
- Expected potency range
- When to consult a professional
```

**Arguments**: None (interactive workflow)

## 10. Code Structure

### Directory Layout

```plain
oorep-mcp/
├── src/
│   ├── index.ts                    # Entry point (#!/usr/bin/env node)
│   ├── server.ts                   # MCP server initialization
│   ├── config.ts                   # Configuration management
│   │
│   ├── tools/
│   │   ├── index.ts                # Tool registration
│   │   ├── search-repertory.ts     # Tool implementation
│   │   ├── search-materia-medica.ts
│   │   ├── get-remedy-info.ts
│   │   ├── list-repertories.ts
│   │   └── list-materia-medicas.ts
│   │
│   ├── resources/
│   │   ├── index.ts                # Resource registration
│   │   ├── remedies-list.ts
│   │   ├── repertories-list.ts
│   │   ├── materia-medicas-list.ts
│   │   ├── remedy-info.ts          # Dynamic resource
│   │   └── help-search-syntax.ts
│   │
│   ├── prompts/
│   │   ├── index.ts                # Prompt registration
│   │   ├── analyze-symptoms.ts
│   │   ├── remedy-comparison.ts
│   │   └── repertorization-workflow.ts
│   │
│   ├── lib/
│   │   ├── oorep-client.ts         # HTTP client wrapper
│   │   ├── cache.ts                # Caching layer
│   │   ├── data-formatter.ts       # Response formatting
│   │   └── search-engine.ts        # Search logic
│   │
│   ├── utils/
│   │   ├── schemas.ts              # Zod schemas
│   │   ├── validation.ts           # Input validation
│   │   ├── errors.ts               # Custom error classes
│   │   └── logger.ts               # Logging utilities
│   │
│   └── __tests__/
│       ├── tools/
│       │   ├── search-repertory.test.ts
│       │   └── ...
│       ├── resources/
│       │   └── ...
│       ├── lib/
│       │   └── oorep-client.test.ts
│       ├── fixtures/
│       │   ├── mock-remedies.json
│       │   └── mock-repertory-response.json
│       └── integration/
│           └── e2e.test.ts
│
├── dist/                           # Compiled JavaScript (gitignored)
│
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .eslintrc.json
├── .prettierrc.json
├── .gitignore
│
├── README.md
├── CHANGELOG.md
├── LICENSE
├── CONTRIBUTING.md
├── IMPLEMENTATION_PLAN.md          # This document
├── AGENTS.md                       # Already exists
│
└── server.json                     # MCP registry metadata
```

## 11. Dependencies & Configuration

### package.json

```json
{
  "name": "oorep-mcp",
  "version": "0.1.0",
  "description": "MCP server for OOREP homeopathic repertory and materia medica",
  "mcpName": "io.github.yourusername/oorep-mcp",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "oorep-mcp": "dist/index.js"
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE",
    "server.json"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.json && chmod +x dist/index.js",
    "dev": "tsx src/index.ts",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write 'src/**/*.ts'",
    "format:check": "prettier --check 'src/**/*.ts'",
    "typecheck": "tsc --noEmit",
    "prepare": "npm run build",
    "prepublishOnly": "npm run lint && npm run test && npm run build"
  },
  "keywords": [
    "mcp",
    "model-context-protocol",
    "modelcontextprotocol",
    "server",
    "oorep",
    "homeopathy",
    "repertory",
    "materia-medica",
    "remedies",
    "symptoms"
  ],
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/oorep-mcp.git"
  },
  "bugs": {
    "url": "https://github.com/yourusername/oorep-mcp/issues"
  },
  "homepage": "https://github.com/yourusername/oorep-mcp#readme",
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.19.1",
    "zod": "^3.25.76",
    "zod-to-json-schema": "^3.23.5"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "@vitest/coverage-v8": "^2.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.0.0",
    "tsx": "^4.7.0",
    "typescript": "^5.8.0",
    "vitest": "^2.1.0"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "lib": ["ES2022"],
    "rootDir": "src",
    "outDir": "dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "allowSyntheticDefaultImports": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/__tests__/**'
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85
      }
    }
  }
});
```

### .eslintrc.json

```json
{
  "parser": "@typescript-eslint/parser",
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module"
  },
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-unused-vars": ["error", {
      "argsIgnorePattern": "^_"
    }],
    "no-console": ["warn", { "allow": ["error", "warn"] }]
  }
}
```

### .prettierrc.json

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

### server.json (MCP Registry)

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-09-16/server.schema.json",
  "name": "io.github.yourusername/oorep-mcp",
  "description": "MCP server that provides access to OOREP homeopathic repertory and materia medica data for AI-assisted symptom analysis and remedy selection",
  "version": "0.1.0",
  "packages": [
    {
      "registry_type": "npm",
      "identifier": "oorep-mcp",
      "version": "0.1.0"
    }
  ]
}
```

## 12. Testing Strategy

### Test Pyramid

```plain
        ╱╲
       ╱E2E╲           5% - End-to-end tests (MCP Inspector, client integration)
      ╱────╲
     ╱ Integ╲          15% - Integration tests (real/mock API calls)
    ╱────────╲
   ╱   Unit   ╲        80% - Unit tests (pure functions, validation, formatting)
  ╱────────────╲
```

### Unit Tests (80%)

**Coverage**:

- Utils: validation, schemas, errors, logger
- Lib: data formatter, cache, search engine
- Individual tool logic (without HTTP calls)
- Resource handlers
- Prompt templates

**Example**:

```typescript
// src/__tests__/utils/validation.test.ts
import { describe, it, expect } from 'vitest';
import { validateSymptom } from '../utils/validation';

describe('validateSymptom', () => {
  it('should accept valid symptoms', () => {
    expect(() => validateSymptom('headache')).not.toThrow();
    expect(() => validateSymptom('head*')).not.toThrow();
  });

  it('should reject empty symptoms', () => {
    expect(() => validateSymptom('')).toThrow('Symptom cannot be empty');
  });

  it('should reject symptoms exceeding max length', () => {
    const longSymptom = 'a'.repeat(201);
    expect(() => validateSymptom(longSymptom)).toThrow('Symptom too long');
  });

  it('should reject wildcard in middle position', () => {
    expect(() => validateSymptom('head*ache')).toThrow('Wildcard not allowed in middle');
  });
});
```

### Integration Tests (15%)

**Coverage**:

- HTTP client with mock server
- Tool execution with mocked OOREP API
- Cache behavior
- Error handling with network failures

**Example**:

```typescript
// src/__tests__/integration/search-repertory.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { searchRepertory } from '../tools/search-repertory';
import * as oorepClient from '../lib/oorep-client';

describe('searchRepertory integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch and format repertory results', async () => {
    // Mock HTTP response
    vi.spyOn(oorepClient, 'lookupRep').mockResolvedValue({
      totalNumberOfResults: 10,
      results: [/* mock data */]
    });

    const result = await searchRepertory({
      symptom: 'headache',
      maxResults: 5
    });

    expect(result.rubrics).toHaveLength(5);
    expect(result.rubrics[0]).toHaveProperty('rubric');
    expect(result.rubrics[0]).toHaveProperty('remedies');
  });

  it('should handle network errors gracefully', async () => {
    vi.spyOn(oorepClient, 'lookupRep').mockRejectedValue(
      new Error('Network timeout')
    );

    await expect(searchRepertory({ symptom: 'fever' }))
      .rejects.toThrow('Failed to fetch repertory data');
  });
});
```

### End-to-End Tests (5%)

**Coverage**:

- MCP protocol communication
- Client compatibility (Claude Desktop, VS Code)
- Real OOREP API (with rate limiting)
- Full workflow tests

**Example**:

```typescript
// src/__tests__/e2e/mcp-protocol.test.ts
import { describe, it, expect } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../server';

describe('MCP Protocol E2E', () => {
  it('should execute search_repertory tool via MCP', async () => {
    // Setup linked transports
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    // Initialize server
    const server = createServer();
    await server.connect(serverTransport);

    // Initialize client
    const client = new Client(
      { name: 'test-client', version: '1.0.0' },
      { capabilities: {} }
    );
    await client.connect(clientTransport);

    // Call tool
    const result = await client.callTool({
      name: 'search_repertory',
      arguments: {
        symptom: 'headache',
        maxResults: 3
      }
    });

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    const data = JSON.parse(result.content[0].text);
    expect(data).toHaveProperty('rubrics');
    expect(data.rubrics.length).toBeLessThanOrEqual(3);

    // Cleanup
    await server.close();
    await client.close();
  });
});
```

### Testing Checklist

- [ ] All utils have 100% unit test coverage
- [ ] All tools have unit + integration tests
- [ ] All resources have unit tests
- [ ] HTTP client has retry/timeout tests
- [ ] Cache has TTL and invalidation tests
- [ ] Error handling covers all error types
- [ ] Validation rejects all invalid inputs
- [ ] MCP protocol compliance tested with Inspector
- [ ] Client compatibility tested (Claude Desktop, VS Code)
- [ ] Performance benchmarks established
- [ ] Security tests (injection, traversal) passed

## 13. Security & Performance

### Security Best Practices

#### 1. Input Validation

```typescript
// Never trust user input
const SymptomSchema = z.string()
  .min(3, 'Symptom must be at least 3 characters')
  .max(200, 'Symptom must not exceed 200 characters')
  .regex(/^[a-zA-Z0-9\s\-*"]+$/, 'Invalid characters in symptom')
  .transform(input => input.trim());

// Validate wildcards
function validateWildcard(symptom: string): void {
  const middleWildcard = /\w\*\w/;
  if (middleWildcard.test(symptom)) {
    throw new ValidationError('Wildcard (*) not allowed in middle of word');
  }
}
```

#### 2. No Credential Storage

```typescript
// ✅ GOOD: Read-only public API, no credentials needed
const client = new OOREPClient(config.baseUrl);

// ❌ BAD: Never store API keys or passwords
// const client = new OOREPClient(apiKey, password);
```

#### 3. Rate Limiting

```typescript
class RateLimiter {
  private requests: number[] = [];
  private limit = 10; // 10 requests
  private window = 60000; // per 60 seconds

  async checkLimit(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter(t => now - t < this.window);

    if (this.requests.length >= this.limit) {
      const oldestRequest = this.requests[0];
      const waitTime = this.window - (now - oldestRequest);
      throw new Error(`Rate limit exceeded. Retry in ${waitTime}ms`);
    }

    this.requests.push(now);
  }
}
```

#### 4. Timeout Protection

```typescript
async function fetchWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
  );

  return Promise.race([promise, timeout]);
}
```

#### 5. Error Sanitization

```typescript
// Don't expose internal errors to users
try {
  await executeOperation();
} catch (error) {
  console.error('[Internal]', error); // Log full error

  // Return sanitized error
  if (error instanceof UserError) {
    throw error; // Safe to expose
  }

  throw new Error('An error occurred while processing your request');
}
```

### Performance Optimizations

#### 1. Caching Strategy

```typescript
class Cache<T> {
  private store = new Map<string, { data: T; timestamp: number }>();
  private ttl: number;

  constructor(ttlMs: number) {
    this.ttl = ttlMs;
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttl) {
      this.store.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: T): void {
    this.store.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.store.clear();
  }
}

// Usage
const remediesCache = new Cache<Remedy[]>(3600000); // 1 hour
const repertoriesCache = new Cache<Repertory[]>(300000); // 5 minutes
```

#### 2. Lazy Loading

```typescript
class DataLoader {
  private remedies: Remedy[] | null = null;

  async getRemedies(): Promise<Remedy[]> {
    if (!this.remedies) {
      console.error('[DataLoader] Loading remedies...');
      this.remedies = await this.fetchRemedies();
    }
    return this.remedies;
  }
}
```

#### 3. Request Deduplication

```typescript
class RequestDeduplicator {
  private pending = new Map<string, Promise<any>>();

  async deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // If request already in flight, return existing promise
    if (this.pending.has(key)) {
      return this.pending.get(key) as Promise<T>;
    }

    // Start new request
    const promise = fn().finally(() => {
      this.pending.delete(key);
    });

    this.pending.set(key, promise);
    return promise;
  }
}

// Usage
const deduplicator = new RequestDeduplicator();

async function searchRepertory(args: SearchArgs) {
  const cacheKey = JSON.stringify(args);

  return deduplicator.deduplicate(cacheKey, async () => {
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    // Fetch from API
    const result = await oorepClient.lookupRep(args);
    cache.set(cacheKey, result);
    return result;
  });
}
```

#### 4. Parallel Fetching

```typescript
// ✅ GOOD: Parallel requests
const [remedies, repertories, mms] = await Promise.all([
  fetchRemedies(),
  fetchRepertories(),
  fetchMateriaMedicas()
]);

// ❌ BAD: Sequential requests
const remedies = await fetchRemedies();
const repertories = await fetchRepertories();
const mms = await fetchMateriaMedicas();
```

#### 5. Response Size Optimization

```typescript
// Return resource links instead of embedding large data
{
  type: "resource_link",
  uri: "oorep://remedies/aconite/full-data",
  name: "Aconite Complete Information",
  description: "Full repertory and materia medica data for Aconite"
}

// Instead of embedding 100KB+ of text
{
  type: "text",
  text: JSON.stringify(hugeDataObject) // ❌ Wastes tokens
}
```

### Performance Targets

- **Tool response time**: < 2s (95th percentile)
- **Cache hit rate**: > 80% for metadata endpoints
- **Memory usage**: < 100MB resident
- **Startup time**: < 500ms
- **Concurrent requests**: Support 10+ simultaneous

## 14. Publishing & Distribution

### Phase 1: NPM Registry

**Prerequisites**:

- [ ] npm account created
- [ ] Email verified
- [ ] Two-factor authentication enabled
- [ ] Access token generated (granular, not classic)

**Steps**:

```bash
# 1. Build and test
npm run build
npm run test
npm run lint

# 2. Update version
npm version patch  # 0.1.0 → 0.1.1
# or
npm version minor  # 0.1.0 → 0.2.0

# 3. Publish
npm publish --access public

# 4. Verify
npx oorep-mcp --help
```

**Checklist**:

- [ ] package.json has correct `mcpName`, `bin`, `files`
- [ ] README.md is comprehensive
- [ ] LICENSE file exists
- [ ] All tests pass
- [ ] TypeScript compiles without errors
- [ ] Executable has shebang (`#!/usr/bin/env node`)
- [ ] Executable has execute permissions (`chmod +x`)

### Phase 2: Official MCP Registry

**Prerequisites**:

- [ ] Published to npm (required)
- [ ] GitHub account
- [ ] server.json created and validated

**Steps**:

```bash
# 1. Install publisher CLI
git clone https://github.com/modelcontextprotocol/registry.git
cd registry
make publisher

# 2. Authenticate
./bin/mcp-publisher auth login
# Follow GitHub OAuth flow

# 3. Validate server.json
./bin/mcp-publisher validate /path/to/oorep-mcp/server.json

# 4. Publish
cd /path/to/oorep-mcp
/path/to/registry/bin/mcp-publisher publish

# 5. Verify
# Check https://registry.modelcontextprotocol.io
```

**GitHub Actions (Automated)**:

```yaml
# .github/workflows/publish-mcp.yml
name: Publish to MCP Registry

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Publish to npm
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Publish to MCP Registry
        run: |
          git clone https://github.com/modelcontextprotocol/registry.git
          cd registry
          make publisher
          ./bin/mcp-publisher publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Phase 3: Docker Distribution (Optional)

**Dockerfile**:

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production

COPY --from=builder /app/dist ./dist

ENV OOREP_MCP_BASE_URL=https://www.oorep.com
ENV OOREP_MCP_TIMEOUT_MS=30000

ENTRYPOINT ["node", "dist/index.js"]
```

**Build & Publish**:

```bash
# Build
docker build -t yourusername/oorep-mcp:0.1.0 .
docker tag yourusername/oorep-mcp:0.1.0 yourusername/oorep-mcp:latest

# Test
docker run --rm yourusername/oorep-mcp:0.1.0

# Publish
docker login
docker push yourusername/oorep-mcp:0.1.0
docker push yourusername/oorep-mcp:latest
```

**Submit to Docker MCP Catalog**:

- Follow Docker's submission process
- Include SBOM (software bill of materials)
- Add cryptographic signature
- Provide catalog metadata

### Phase 4: Smithery (Automatic)

No action required! Smithery automatically indexes servers published to:

- npm registry
- PyPI registry
- Docker Hub

**Verify listing**:

```bash
smithery search oorep

# Should show:
# - oorep-mcp
# - Description
# - Installation command
```

### Phase 5: Claude Desktop Extension (Future)

**Prerequisites**:

- [ ] .mcpb specification reviewed
- [ ] Bundle created with all dependencies
- [ ] Tested on Windows and macOS

**Steps**:

1. Follow .mcpb specification (open-sourced by Anthropic)
2. Create bundle with bundler tool
3. Submit to Claude Desktop directory
4. Users install with double-click

## 15. Documentation Requirements

### README.md (Essential)

**Sections**:

1. **Title & Badges**: Name, npm version, license, build status
2. **Description**: What it does in 2-3 sentences
3. **Features**: Bulleted list of capabilities
4. **Installation**: npm, Smithery, Docker
5. **Quick Start**: Minimal config example
6. **Configuration**: All client configs (Claude Desktop, VS Code, Cursor)
7. **Environment Variables**: Complete reference
8. **Available Tools**: Each tool with parameters and examples
9. **Available Resources**: Each resource with URI and description
10. **Available Prompts**: Each prompt with purpose
11. **Usage Examples**: Real-world scenarios
12. **Troubleshooting**: Common issues and solutions
13. **Security**: How data is handled
14. **Contributing**: How to contribute
15. **License**: License type and link
16. **Support**: Where to get help

**Example Section**:

```markdown
## Configuration

### Claude Desktop

1. Open your Claude Desktop config file:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

2. Add the OOREP MCP server:

    ```json
    {
      "mcpServers": {
        "oorep-mcp": {
          "command": "npx",
          "args": ["-y", "oorep-mcp"],
          "env": {
            "OOREP_MCP_BASE_URL": "https://www.oorep.com"
          }
        }
      }
    }
    ```

3. Completely quit and restart Claude Desktop

4. Look for the MCP indicator (🔌) in the bottom-right corner

### VS Code

[Similar detailed instructions]

```

### CONTRIBUTING.md

**Sections**:

1. Code of Conduct
2. How to Report Bugs
3. How to Suggest Features
4. Development Setup
5. Code Style Guidelines
6. Testing Requirements
7. Pull Request Process
8. Commit Message Format

### API Documentation

**Auto-generated** from Zod schemas:

```typescript
// Generate JSON Schema from Zod
import { zodToJsonSchema } from 'zod-to-json-schema';

const toolSchemas = {
  search_repertory: zodToJsonSchema(SearchRepertoryArgsSchema),
  // ... other tools
};

// Export for documentation
fs.writeFileSync(
  'docs/api-reference.json',
  JSON.stringify(toolSchemas, null, 2)
);
```

**Human-written guide**:

- API reference with examples
- Use case tutorials
- Integration guides
- Troubleshooting

## 16. Success Metrics

### Technical Metrics

- [ ] **Test Coverage**: ≥ 85% lines/statements
- [ ] **Performance**: 95th percentile response time < 2s
- [ ] **Reliability**: ≥ 99.5% success rate (excluding network errors)
- [ ] **Security**: 0 critical vulnerabilities (npm audit)
- [ ] **Type Safety**: 0 TypeScript errors in strict mode

### Adoption Metrics

- [ ] **Downloads**: Track npm weekly downloads
- [ ] **GitHub Stars**: Monitor repository popularity
- [ ] **Issues**: Maintain < 5 open bugs at any time
- [ ] **Response Time**: Reply to issues within 48 hours
- [ ] **Documentation**: ≥ 90% of users find docs helpful (survey)

### Quality Metrics

- [ ] **Code Review**: All PRs reviewed before merge
- [ ] **Release Cadence**: Patch releases within 1 week for bugs
- [ ] **Dependency Updates**: Review dependencies monthly
- [ ] **Breaking Changes**: Announce 1 month in advance

## Appendix A: Risk Assessment

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| OOREP API changes | Medium | High | Version endpoints, test regularly, maintain fallbacks |
| MCP spec changes | Low | High | Track MCP releases, update SDK promptly |
| Network instability | Medium | Medium | Retry logic, timeouts, caching |
| Rate limiting | Low | Medium | Request deduplication, user guidance |
| Performance issues | Low | Medium | Load testing, profiling, optimization |

### Non-Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Low adoption | Medium | Medium | Marketing, documentation, examples |
| Support burden | Medium | Low | Comprehensive docs, FAQ, community forum |
| License compatibility | Low | High | Review OOREP license (GPL-3.0), clarify usage |
| Security incident | Low | High | Input validation, security audits, disclosure policy |

## Appendix B: Future Enhancements

### Version 0.2.0

- [ ] Support for local OOREP instances
- [ ] Advanced filtering (by author, language, year)
- [ ] Batch operations (multiple symptoms at once)
- [ ] Remedy comparison matrices

### Version 0.3.0

- [ ] OAuth 2.1 support for authenticated endpoints
- [ ] Case management tools (if OOREP provides public API)
- [ ] Export functionality (PDF, CSV)
- [ ] GraphQL support

### Version 1.0.0

- [ ] HTTP/SSE transport (in addition to stdio)
- [ ] Hosted server option (cloud deployment)
- [ ] Premium features (analytics, usage tracking)
- [ ] Desktop GUI (Electron app)

## Appendix C: Resources

### Official Documentation

- MCP Specification: <https://modelcontextprotocol.io/docs>
- MCP TypeScript SDK: <https://github.com/modelcontextprotocol/typescript-sdk>
- MCP Registry: <https://registry.modelcontextprotocol.io>
- OOREP GitHub: <https://github.com/nondeterministic/oorep>
- OOREP Website: <https://www.oorep.com>

### Community

- MCP Discord: [Link if available]
- MCP GitHub Discussions: <https://github.com/modelcontextprotocol/typescript-sdk/discussions>
- Smithery Platform: <https://smithery.ai>

### Tools

- MCP Inspector: Test and debug MCP servers
- Smithery CLI: Manage MCP servers
- Zod Documentation: <https://zod.dev>
- Vitest Documentation: <https://vitest.dev>

## Conclusion

This implementation plan provides a comprehensive roadmap for building a production-ready OOREP MCP server following industry best practices. The phased approach ensures:

✅ **Solid foundation** with proper architecture and tooling
✅ **High quality** through comprehensive testing and validation
✅ **Security** via input validation and error handling
✅ **Performance** with caching and optimization
✅ **Discoverability** through multiple distribution channels
✅ **Maintainability** with clear code structure and documentation

**Estimated Timeline**: 4-5 weeks for full implementation and publishing

**Next Steps**:

1. Review and approve this plan
2. Set up development environment
3. Begin Phase 1: Foundation
4. Iterate through subsequent phases
5. Publish and promote

**Questions or feedback?** Open an issue or discussion on GitHub!

**Document Version**: 1.0
**Last Updated**: 2025-11-16
**Maintained By**: [Your Name]
**Status**: ✅ Ready for Implementation

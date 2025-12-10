# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-12-10

### Added

#### Standalone Resource and Prompt Functions

- **Resource Functions** (`oorep-mcp/sdk/resources`): Programmatic access to MCP resources
  - `getResource(uri, client?)`: Fetch resource by URI (client required for dynamic resources)
  - `listResources()`: List all available resources with metadata
  - `getSearchSyntaxHelp()`: Get search syntax guide as markdown text

- **Prompt Functions** (`oorep-mcp/sdk/prompts`): Programmatic access to MCP prompts
  - `getPrompt(name, args?)`: Get prompt workflows by name with type-safe overloads
  - `listPrompts()`: List all available prompts with metadata

- **Centralized Constants** (`src/sdk/constants.ts`): Typed constants for all MCP primitives
  - `TOOL_NAMES`, `RESOURCE_URIS`, `PROMPT_NAMES`, `DEFAULTS`, `MIME_TYPES`
  - Type exports: `ToolName`, `ResourceUri`, `PromptName`

- **NotFoundError Class**: Specific error type for missing resources/tools/prompts

- **Resource and Prompt Adapter Functions**: All SDK adapters support resource/prompt formatting
  - OpenAI, Vercel AI, LangChain, Google Gemini adapters

- **Security Policy**: Added `SECURITY.md` with vulnerability reporting guidelines

### Changed

- **SDK Client is Pure REST**: `OOREPSDKClient` now only handles REST operations
  - Resource and prompt access moved to standalone functions
  - Added `getClient()` method to get underlying `OOREPClient` for resource functions
  - Cleaner separation of concerns

- **Modular Resource Architecture**: Resources in `src/resources/`
  - `remedies-list.ts`, `repertories-list.ts`, `materia-medicas-list.ts`, `search-syntax-help.ts`

- **Modular Prompt Architecture**: Prompts in `src/prompts/`
  - `analyze-symptoms.ts`, `remedy-comparison.ts`, `repertorization-workflow.ts`

- **IOOREPSDKClient Interface Simplified**: Only REST methods, no MCP primitives

- **Server Shutdown Cleanup**: Proper resource cleanup on shutdown

### Improved

- **Enhanced Search Syntax Help**: Vocabulary mapping, query optimization, tool selection guide

- **CLAMS Method in Prompts**: Structured symptom analysis framework
  - Character, Location, Accompanying, Modalities, Strange/Rare/Peculiar

### Fixed

- **Package Exports**: Root entry now exports SDK (not empty server entry point)
  - Added `./sdk` and `./sdk/constants` export paths
  - `import { ... } from 'oorep-mcp'` now works correctly
  - `main` and `types` fields updated to point to SDK

- **SDK.md Documentation**: Corrected function naming inconsistencies
  - Fixed camelCase for adapter functions (`openAIFormatResourceAsSystemMessage`, not `openaiFormat...`)
  - Fixed type import paths to use correct entry points

- **Unused Imports**: Cleaned up across SDK files

## [1.0.3] - 2025-12-09

### Changed

- **Relaxed Symptom Validation**: Removed overly restrictive regex and wildcard validation from `search_repertory` tool
  - Regex `/^[a-zA-Z0-9\s\-*"'.,;:()/&]+$/` was rejecting valid symptoms with Unicode characters, accented letters, and special formatting
  - Wildcard-in-middle-of-word validation removed as it was causing false positives
  - The OOREP API handles input sanitization server-side; client-side restrictions were unnecessary
  - Fixes validation errors when LLMs (especially Google Gemini) send symptom queries with non-ASCII characters

## [1.0.2] - 2025-12-09

### Changed

- **Dependencies**: Updated `@modelcontextprotocol/sdk` from 1.22.0 to 1.24.3

### Development

- **Dev Dependencies**: Updated development tooling
  - `@types/node`: 24.10.1 → 24.10.2
  - `@typescript-eslint/eslint-plugin`: 8.18.2 → 8.49.0
  - `@typescript-eslint/parser`: 8.18.2 → 8.49.0
  - `@vitest/coverage-v8`: 4.0.13 → 4.0.15
  - `prettier`: 3.0.0 → 3.7.4
  - `tsx`: 4.7.0 → 4.21.0
  - `typescript-eslint`: 8.18.2 → 8.49.0

## [1.0.1] - 2025-12-09

### Added

- **Google Gemini Adapter** (`oorep-mcp/sdk/google-genai`): Function calling integration for Google's `@google/genai` SDK
  - `geminiTools` - Pre-formatted tools array for GenerativeModel config
  - `geminiFunctionDeclarations` - Individual function declarations
  - `createGeminiToolExecutors()` - Factory for tool execution handlers
  - `executeGeminiFunctionCall()` - Execute function calls from Gemini responses
  - Automatic schema sanitization for Gemini compatibility (removes unsupported fields)
  - 30 new unit tests for full coverage

- **SDK Integration Guide** (`docs/SDK.md`): Comprehensive guide for programmatic SDK usage
  - Examples for OpenAI, Vercel AI SDK, LangChain/LangGraph, and Google Gemini
  - Client configuration reference
  - TypeScript types and Zod schema imports

### Changed

- **README Restructuring**: Improved documentation organization
  - Moved detailed SDK examples to `docs/SDK.md` (reduced README by ~300 lines)
  - Converted ASCII diagrams to Mermaid for better rendering
  - Added brief SDK section with link to full guide

### Fixed

- **Symptom Validation**: Expanded regex to allow common punctuation (commas, semicolons, colons, parentheses)
  - Fixes validation errors for symptoms like "pain, worse motion" or "headache (frontal)"

### Security

- **Dependency Update**: Fixed body-parser vulnerability in transitive dependencies

## [1.0.0] - 2025-11-29

### Added

- **Dependency Injection Architecture**: Full DI support for customizable implementations
  - `ICache` interface for custom caching strategies (Redis, Memcached, DynamoDB, etc.)
  - `ILogger` interface for custom logging frameworks (Winston, Pino, etc.)
  - `IRequestDeduplicator` interface for request deduplication strategies
  - `NoOpCache`, `NoOpLogger`, `NoOpDeduplicator` implementations for disabling features
  - `InMemoryCache`, `MapRequestDeduplicator`, `ConsoleLogger` as default implementations
  - Constructor injection pattern for all SDK components

### Changed

- **Async Cache Interface**: All cache methods now return Promises to support distributed caching
  - `get()`, `set()`, `has()`, `delete()`, `clear()`, `destroy()` are all async
  - Enables Redis, Memcached, and other remote cache integrations
- **Logger Integration**: All internal caches now accept optional logger for debug visibility

### Breaking Changes

- **Renamed exports**: `Cache` → `InMemoryCache`, `RequestDeduplicator` → `MapRequestDeduplicator`, `Logger` → `ConsoleLogger`
- **Async cache methods**: `clearCache()` and `destroy()` now return `Promise<void>` - must be awaited
- **ICache interface**: All methods now async for distributed cache support (Redis, Memcached, etc.)

## [0.0.9] - 2025-11-21

### Changed

- **Zod Import Architecture**: Centralized Zod imports through `schemas.ts` for consistency
  - All files now import `z` from `./utils/schemas` instead of directly from `zod`
  - Uses native `z.toJSONSchema()` method from Zod v4 path (`zod/v4`)
  - Eliminates dependency on external `zod-to-json-schema` package
  - Single source of truth for Zod usage across codebase

### Removed

- **Documentation Cleanup**: Removed `IMPLEMENTATION_PLAN.md` (1817 lines) - technical design details now in code
- **Security Documentation**: Removed `SECURITY.md` - consolidated into README

### Documentation

- Added cache TTL configuration example to README
- Consolidated security information in README (input validation, error sanitization)

## [0.0.8] - 2025-11-21

### Fixed

- **Build Error**: Fixed `z.toJSONSchema` TypeScript error in `zodToOutputSchema` function
  - Initial fix using `zodToJsonSchema` from `zod-to-json-schema` library
  - Superseded by v0.0.9 with native Zod approach

## [0.0.7] - 2025-11-21

### Added

#### MCP Structured Response Format (2025-06-18 Specification)

- **outputSchema Definitions**: All 5 tools now include JSON Schema output definitions for response validation
  - `search_repertory`: Returns `RepertorySearchResult` with rubrics and remedy statistics
  - `search_materia_medica`: Returns `MateriaMedicaSearchResult` with remedy sections
  - `get_remedy_info`: Returns `RemedyInfo` with abbreviations and alternative names
  - `list_available_repertories`: Returns `{ repertories: RepertoryMetadata[] }`
  - `list_available_materia_medicas`: Returns `{ materiaMedicas: MateriaMedicaMetadata[] }`

- **structuredContent in Responses**: Tool results now include both:
  - `content`: Text representation (JSON string) for backwards compatibility
  - `structuredContent`: Machine-parseable JSON object for modern clients

- **zodToOutputSchema Utility**: Helper function using `zod-to-json-schema` library to convert schemas to MCP-compatible JSON Schema format

### Changed

- **Error Handling**: Tool errors now return `isError: true` flag instead of throwing exceptions
  - Allows LLMs to see errors and potentially self-correct
  - Sanitized error messages in text content
  - No structuredContent for error responses (bypasses validation)

- **ToolDefinition Interface**: Extended to include optional `outputSchema` property

### Improved

- **Test Coverage**: Added comprehensive tests for:
  - `zodToOutputSchema` utility function
  - outputSchema properties in all tool definitions
  - Structured response format validation

## [0.0.6] - 2025-11-21

### Documentation

- Updated CONTRIBUTING.md with improved guidelines
- Documentation refinements across README and IMPLEMENTATION_PLAN

### Milestones

- **Market Validation**: MCP server successfully integrated by a B2B business product, demonstrating production readiness and real-world applicability

## [0.0.5] - 2025-11-21

### Added

#### SDK Integration System

- **SDK Client** (`createOOREPClient`): Programmatic access to OOREP with in-memory caching, request deduplication, and session management
- **OpenAI Adapter** (`oorep-mcp/sdk/openai`): Function calling integration for OpenAI API
- **Vercel AI Adapter** (`oorep-mcp/sdk/vercel-ai`): Tool integration for Vercel AI SDK
- **LangChain Adapter** (`oorep-mcp/sdk/langchain`): Tool integration for LangChain/LangGraph
- **New Package Exports**: `./sdk/client`, `./sdk/tools`, `./sdk/openai`, `./sdk/vercel-ai`, `./sdk/langchain`, `./sdk/adapters`

### Changed

- **README Overhaul**: Complete rewrite with TL;DR section, architecture diagram, full API reference, search syntax documentation, and SDK usage examples for all supported frameworks
- **Test Naming Convention**: Enforced rigid naming convention (`*.unit.test.ts`, `*.integration.test.ts`)

### Improved

- **Test Coverage**: Increased from 92% to 94.6%
- **SDK Client Tests**: Added unit tests for isolation testing
- **Adapter Integration Tests**: Added integration tests for all SDK adapters
- **Server Tests**: Added runServer tests for improved coverage

### Fixed

- Code scanning alerts (unused variables, imports, functions)
- Whitespace handling with `normalizeOverride` method for repertory and materia medica
- Prettier formatting across SDK files
- Multiple code review feedback items

## [0.0.1] - 2025-11-20

### Added

#### MCP Tools (5)

- **search_repertory**: Search for symptoms in homeopathic repertories and return matching rubrics with remedies
- **search_materia_medica**: Search materia medica texts for symptoms and return matching remedy sections
- **get_remedy_info**: Retrieve comprehensive information about specific remedies
- **list_available_repertories**: List all accessible repertories with metadata (author, year, language, etc.)
- **list_available_materia_medicas**: List all accessible materia medicas with metadata

#### MCP Resources (4)

- **oorep://remedies/list**: Complete list of 600+ available remedies (cached 1 hour)
- **oorep://repertories/list**: All repertories with metadata (cached 5 minutes)
- **oorep://materia-medicas/list**: All materia medicas with metadata (cached 5 minutes)
- **oorep://help/search-syntax**: Comprehensive guide to OOREP search syntax (wildcards, exclusions, exact phrases)

#### MCP Prompts (3)

- **analyze-symptoms**: Guided interactive symptom analysis workflow
- **remedy-comparison**: Compare multiple remedies side-by-side with key characteristics
- **repertorization-workflow**: Step-by-step case taking and repertorization process

#### Core Infrastructure

- **HTTP Client** (`src/lib/oorep-client.ts`): Retry logic with exponential backoff (3 attempts), timeout handling, session bootstrapping
- **Caching Layer** (`src/lib/cache.ts`): TTL-based caching with request deduplication and cache statistics
- **Data Formatter** (`src/lib/data-formatter.ts`): Transform OOREP API responses and calculate remedy statistics
- **Error Handling** (`src/utils/errors.ts`): Custom error classes (ValidationError, NetworkError, TimeoutError, RateLimitError, OOREPAPIError)
- **Logging** (`src/utils/logger.ts`): Structured logging with 4 levels (debug, info, warn, error)
- **Validation** (`src/utils/validation.ts`): Input sanitization, symptom validation, wildcard validation
- **Schemas** (`src/utils/schemas.ts`): Complete Zod schemas for runtime validation with TypeScript type inference
- **Configuration** (`src/config.ts`): Environment variable support with CLI argument overrides and sensible defaults

#### Developer Experience

- TypeScript strict mode with full type coverage
- ESLint configuration with TypeScript rules
- Prettier for consistent code formatting
- Vitest testing framework with coverage thresholds (85%)
- Comprehensive build system (TypeScript compilation, executable generation)

#### Documentation

- **README.md**: Complete user guide with installation, configuration, and usage examples for Claude Desktop, VS Code, and Cursor
- **IMPLEMENTATION_PLAN.md**: Detailed technical design and architecture documentation
- **AGENTS.md**: Agent operating manual for maintainers
- **LICENSE**: MIT License
- **CHANGELOG.md**: This file

### Notes

- OOREP's public search endpoints (`/api/lookup_rep`, `/api/lookup_mm`) require authentication
- For full functionality, users should run a local OOREP instance or configure authentication
- Public metadata endpoints work without authentication (remedies list, repertories list, materia medicas list)

[1.1.0]: https://github.com/Dhi13man/oorep-mcp/compare/v1.0.3...v1.1.0
[1.0.3]: https://github.com/Dhi13man/oorep-mcp/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/Dhi13man/oorep-mcp/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/Dhi13man/oorep-mcp/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/Dhi13man/oorep-mcp/compare/v0.0.9...v1.0.0
[0.0.9]: https://github.com/Dhi13man/oorep-mcp/compare/v0.0.8...v0.0.9
[0.0.8]: https://github.com/Dhi13man/oorep-mcp/compare/v0.0.7...v0.0.8
[0.0.7]: https://github.com/Dhi13man/oorep-mcp/compare/v0.0.6...v0.0.7
[0.0.6]: https://github.com/Dhi13man/oorep-mcp/compare/v0.0.5...v0.0.6
[0.0.5]: https://github.com/Dhi13man/oorep-mcp/compare/v0.0.1...v0.0.5
[0.0.1]: https://github.com/Dhi13man/oorep-mcp/releases/tag/v0.0.1

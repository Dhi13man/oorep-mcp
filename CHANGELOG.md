# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/Dhi13man/oorep-mcp/compare/v0.0.6...HEAD
[0.0.6]: https://github.com/Dhi13man/oorep-mcp/compare/v0.0.5...v0.0.6
[0.0.5]: https://github.com/Dhi13man/oorep-mcp/compare/v0.0.1...v0.0.5
[0.0.1]: https://github.com/Dhi13man/oorep-mcp/releases/tag/v0.0.1

# OOREP MCP Server

[![npm version](https://img.shields.io/npm/v/oorep-mcp.svg)](https://www.npmjs.com/package/oorep-mcp)
[![CI](https://github.com/Dhi13man/oorep-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Dhi13man/oorep-mcp/actions/workflows/ci.yml)
[![Test Coverage](https://img.shields.io/badge/coverage-94.6%25-brightgreen.svg)](https://github.com/Dhi13man/oorep-mcp/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Model Context Protocol server providing AI assistants access to OOREP - a comprehensive homeopathic repertory and materia medica database.**

---

## TL;DR

```bash
# Install and run (no setup required)
npx oorep-mcp
```

```typescript
// Or use programmatically
import { createOOREPClient } from 'oorep-mcp/sdk/client';

const client = createOOREPClient();
const results = await client.searchRepertory({ symptom: 'headache worse motion' });
console.log(results.rubrics);
client.destroy();
```

**Ask your AI assistant:** *"Search OOREP for remedies for throbbing headache worse from light"*

---

## Table of Contents

- [What is OOREP?](#what-is-oorep)
- [Features](#features)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Platform Configuration](#platform-configuration)
  - [Claude Code](#claude-code)
  - [Claude Desktop](#claude-desktop)
  - [Codex CLI](#codex-cli)
  - [Gemini CLI](#gemini-cli)
- [API Reference](#api-reference)
  - [Tools](#tools)
  - [Resources](#resources)
  - [Prompts](#prompts)
- [Search Syntax](#search-syntax)
- [SDK Integration](#sdk-integration)
  - [Direct SDK Usage](#direct-sdk-usage)
  - [OpenAI Function Calling](#openai-function-calling)
  - [Vercel AI SDK](#vercel-ai-sdk)
  - [LangChain / LangGraph](#langchain--langgraph)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Disclaimer](#disclaimer)
- [License](#license)

---

## What is OOREP?

**OOREP (Open Online Repertory)** is an open-source homeopathic database containing:

- **12+ Repertories** - Systematic indexes of symptoms mapped to remedies (Kent, Boger, Boericke, etc.)
- **Multiple Materia Medicas** - Detailed remedy descriptions and therapeutic indications
- **600+ Remedies** - Comprehensive remedy database with names, abbreviations, and alternates

### How Homeopathic Data is Structured

```
Repertory Structure:
├── Chapter (e.g., "Head")
│   └── Rubric (e.g., "Pain > Throbbing")
│       └── Remedies with weights (1-4)
│           ├── Belladonna (4) - Highest indication
│           ├── Glonoine (3)
│           └── Natrum muriaticum (2)

Materia Medica Structure:
├── Remedy (e.g., "Belladonna")
│   └── Sections by body system
│       ├── Mind: "Sudden onset, violence, heat..."
│       ├── Head: "Throbbing, bursting pain..."
│       └── ...
```

This MCP server enables AI assistants to query this data programmatically.

---

## Features

| Feature | Description |
|---------|-------------|
| **Search Repertories** | Query symptoms across 12+ repertories, get matching rubrics with weighted remedies |
| **Search Materia Medicas** | Find remedy descriptions and indications from multiple sources |
| **Remedy Information** | Get comprehensive details for 600+ remedies |
| **List Resources** | Browse available repertories, materia medicas, and remedies |
| **Guided Workflows** | Prompts for symptom analysis, remedy comparison, case repertorization |
| **Performance** | Built-in caching (5min TTL), request deduplication, automatic retries |
| **Type Safety** | Full TypeScript with Zod validation on all inputs |
| **Security** | Input sanitization, error message sanitization, no credentials required |
| **SDK Adapters** | Direct integration with OpenAI, Vercel AI SDK, LangChain |

---

## Quick Start

### 1. Add to Claude Desktop (2 minutes)

**macOS:** Edit `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** Edit `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "oorep": {
      "command": "npx",
      "args": ["-y", "oorep-mcp"]
    }
  }
}
```

### 2. Restart Claude Desktop

Quit completely (Cmd+Q / Alt+F4), then reopen.

### 3. Start Using

**You:** "Search OOREP for remedies for headache worse at night"

**Claude will:**
1. Call `search_repertory` with symptom "headache worse night"
2. Return matching rubrics with remedies and their weights
3. Explain the results in context

---

## Installation

### NPX (Recommended)

No installation required:

```bash
npx oorep-mcp
```

### npm Global

```bash
npm install -g oorep-mcp
oorep-mcp
```

### npm Local (for SDK usage)

```bash
npm install oorep-mcp
```

---

## Platform Configuration

### Claude Code

**Option A: CLI**

```bash
claude mcp add oorep -- npx -y oorep-mcp
```

**Option B: Config file** (`~/.claude.json`)

```json
{
  "mcpServers": {
    "oorep": {
      "command": "npx",
      "args": ["-y", "oorep-mcp"]
    }
  }
}
```

Verify: Run `/mcp` in Claude Code

### Claude Desktop

**Config locations:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "oorep": {
      "command": "npx",
      "args": ["-y", "oorep-mcp"],
      "env": {
        "OOREP_MCP_LOG_LEVEL": "info"
      }
    }
  }
}
```

**Important:** Quit completely (Cmd+Q), not just close window.

### Codex CLI

**Config:** `~/.codex/config.toml`

```toml
[mcp_servers.oorep]
command = "npx"
args = ["-y", "oorep-mcp"]
```

Or via CLI:

```bash
codex mcp add oorep -- npx -y oorep-mcp
```

### Gemini CLI

**Config:** `~/.gemini/settings.json`

```json
{
  "mcpServers": {
    "oorep": {
      "command": "npx",
      "args": ["-y", "oorep-mcp"],
      "timeout": 30000
    }
  }
}
```

---

## API Reference

### Tools

#### `search_repertory`

Search for symptoms in homeopathic repertories.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `symptom` | string | Yes | - | Symptom to search (3-200 chars). Supports wildcards. |
| `repertory` | string | No | `publicum` | Repertory abbreviation (e.g., `kent`, `boger`) |
| `minWeight` | number | No | `1` | Minimum remedy weight (1-4) |
| `maxResults` | number | No | `20` | Maximum rubrics to return (1-100) |
| `includeRemedyStats` | boolean | No | `true` | Include aggregated remedy statistics |

**Returns:**

```typescript
{
  totalResults: number;
  rubrics: Array<{
    rubric: string;           // Full path: "Head > Pain > Throbbing"
    text: string | null;      // Additional rubric text
    repertory: string;        // Repertory abbreviation
    remedies: Array<{
      name: string;           // Full name: "Belladonna"
      abbreviation: string;   // "Bell."
      weight: number;         // 1-4
    }>;
  }>;
  remedyStats?: Array<{       // If includeRemedyStats=true
    name: string;
    abbreviation: string;
    count: number;            // Times appearing
    cumulativeWeight: number; // Sum of weights
  }>;
}
```

**Example:**

```
Input:  { symptom: "headache throbbing", repertory: "kent", minWeight: 2 }
Output: { totalResults: 45, rubrics: [...], remedyStats: [...] }
```

---

#### `search_materia_medica`

Search materia medica texts for remedy descriptions.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `symptom` | string | Yes | - | Symptom to search (3-200 chars) |
| `materiamedica` | string | No | `boericke` | Materia medica abbreviation |
| `remedy` | string | No | - | Filter to specific remedy |
| `maxResults` | number | No | `10` | Maximum results (1-50) |

**Returns:**

```typescript
{
  totalResults: number;
  results: Array<{
    remedy: string;           // "Aconitum napellus"
    materiaMedica: string;    // "boericke"
    sections: Array<{
      heading: string;        // "Mind", "Head", etc.
      content: string;        // Section text
      depth: number;          // Heading depth
    }>;
  }>;
}
```

---

#### `get_remedy_info`

Get detailed information about a specific remedy.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `remedy` | string | Yes | Remedy name, abbreviation, or alternate name (1-100 chars) |

**Returns:**

```typescript
{
  id: number;
  nameAbbrev: string;    // "Acon."
  nameLong: string;      // "Aconitum napellus"
  namealt: string[];     // ["Aconite", "Monkshood"]
} | null  // null if not found
```

**Matching behavior:**
- Exact match on abbreviation, long name, or alternate names (case-insensitive)
- Partial match for queries ≥3 characters

---

#### `list_available_repertories`

List all accessible repertories.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `language` | string | No | Filter by language code (e.g., `en`, `de`) |

**Returns:**

```typescript
Array<{
  abbreviation: string;  // "kent"
  title: string;         // "Kent Repertory"
  author: string;        // "James Tyler Kent"
  language: string;      // "en"
}>
```

---

#### `list_available_materia_medicas`

List all accessible materia medica texts.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `language` | string | No | Filter by language code |

**Returns:**

```typescript
Array<{
  abbreviation: string;  // "boericke"
  title: string;         // "Boericke Materia Medica"
  author: string;        // "William Boericke"
  language: string;      // "en"
}>
```

---

### Resources

| URI | Description | Content Type |
|-----|-------------|--------------|
| `oorep://remedies/list` | Complete list of all 600+ remedies | JSON |
| `oorep://repertories/list` | All available repertories with metadata | JSON |
| `oorep://materia-medicas/list` | All available materia medicas | JSON |
| `oorep://help/search-syntax` | Search syntax guide with examples | Text |

---

### Prompts

#### `analyze-symptoms`

Guided workflow for systematic symptom analysis.

**Arguments:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `symptom_description` | string | No | Initial symptom description |

**Workflow:** Guides through symptom gathering → modality analysis → repertory search → synthesis

---

#### `remedy-comparison`

Compare multiple remedies side-by-side.

**Arguments:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `remedies` | string | Yes | Comma-separated remedy names (2-6 remedies) |

**Example:** `remedies: "Aconite, Belladonna, Gelsemium"`

---

#### `repertorization-workflow`

Step-by-step case taking and repertorization.

**Workflow:** 7-step process from symptom collection through remedy differentiation.

---

## Search Syntax

### Basic Search

```
headache                    # Simple term
headache night              # Multiple terms (AND)
```

### Wildcards

```
head*                       # Matches: head, headache, heading
*ache                       # Matches: headache, stomachache
```

### Exact Phrases

```
"worse at night"            # Exact phrase match
"throbbing pain"            # Must appear together
```

### Exclusions

```
headache -migraine          # Headache but not migraine
fever -intermittent         # Fever excluding intermittent
```

### Combined

```
head* pain -chronic "worse motion"
```

### Tips

- Minimum 3 characters per term
- Wildcards only at word boundaries
- Use repertory-specific terminology for better results

---

## SDK Integration

### Direct SDK Usage

```typescript
import { createOOREPClient } from 'oorep-mcp/sdk/client';

const client = createOOREPClient({
  baseUrl: 'https://www.oorep.com',
  timeoutMs: 30000,
  cacheTtlMs: 300000,
});

try {
  // Search repertory
  const results = await client.searchRepertory({
    symptom: 'headache worse motion',
    repertory: 'kent',
    minWeight: 2,
    maxResults: 20,
    includeRemedyStats: true,
  });

  console.log(`Found ${results.totalResults} results`);
  console.log('Top rubric:', results.rubrics[0]?.rubric);

  // Get remedy info
  const remedy = await client.getRemedyInfo({ remedy: 'Belladonna' });
  if (remedy) {
    console.log(`${remedy.nameLong} (${remedy.nameAbbrev})`);
  }

  // Search materia medica
  const mmResults = await client.searchMateriaMedica({
    symptom: 'anxiety',
    remedy: 'Aconite',
    maxResults: 5,
  });

  // List resources
  const repertories = await client.listRepertories({ language: 'en' });
  const materiaMedicas = await client.listMateriaMedicas();

} catch (error) {
  if (error instanceof Error) {
    console.error('OOREP error:', error.message);
  }
} finally {
  // Always cleanup to stop cache timers
  client.destroy();
}
```

### OpenAI Function Calling

```typescript
import OpenAI from 'openai';
import { createOOREPClient } from 'oorep-mcp/sdk/client';
import { openAITools, processToolCalls } from 'oorep-mcp/sdk/openai';

const openai = new OpenAI();
const oorep = createOOREPClient();

try {
  // Initial request with tools
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Find remedies for throbbing headache' }],
    tools: openAITools,
  });

  // Process tool calls
  const toolMessages = await processToolCalls(
    oorep,
    response.choices[0].message.tool_calls
  );

  // Continue conversation with tool results
  if (toolMessages.length > 0) {
    const finalResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'user', content: 'Find remedies for throbbing headache' },
        response.choices[0].message,
        ...toolMessages,
      ],
    });
    console.log(finalResponse.choices[0].message.content);
  }
} catch (error) {
  console.error('Error:', error);
} finally {
  oorep.destroy();
}
```

### Vercel AI SDK

```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createOOREPClient } from 'oorep-mcp/sdk/client';
import { createOOREPTools } from 'oorep-mcp/sdk/vercel-ai';

const client = createOOREPClient();

try {
  const tools = createOOREPTools(client);

  const result = await generateText({
    model: openai('gpt-4'),
    tools,
    maxSteps: 5,  // Allow multiple tool calls
    prompt: 'Find remedies for throbbing headache worse from motion',
  });

  console.log(result.text);

  // Access tool results
  for (const step of result.steps) {
    if (step.toolResults) {
      console.log('Tool results:', step.toolResults);
    }
  }
} catch (error) {
  console.error('Error:', error);
} finally {
  client.destroy();
}
```

### LangChain / LangGraph

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { HumanMessage } from '@langchain/core/messages';
import { createOOREPClient } from 'oorep-mcp/sdk/client';
import { createLangChainTools } from 'oorep-mcp/sdk/langchain';

const client = createOOREPClient();

try {
  const toolDefinitions = createLangChainTools(client);

  // Convert to DynamicStructuredTool instances
  const tools = toolDefinitions.map(
    (def) =>
      new DynamicStructuredTool({
        name: def.name,
        description: def.description,
        schema: def.schema,
        func: async (args) => def.func(args),
      })
  );

  // Create agent
  const model = new ChatOpenAI({ model: 'gpt-4' });
  const agent = createReactAgent({ llm: model, tools });

  // Invoke agent
  const result = await agent.invoke({
    messages: [new HumanMessage('Find remedies for headache with nausea')],
  });

  // Get final message
  const lastMessage = result.messages[result.messages.length - 1];
  console.log(lastMessage.content);
} catch (error) {
  console.error('Error:', error);
} finally {
  client.destroy();
}
```

---

## Configuration

All configuration via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `OOREP_MCP_BASE_URL` | `https://www.oorep.com` | OOREP API base URL |
| `OOREP_MCP_TIMEOUT_MS` | `30000` | Request timeout (ms) |
| `OOREP_MCP_CACHE_TTL_MS` | `300000` | Cache TTL (ms), 0 to disable |
| `OOREP_MCP_MAX_RESULTS` | `100` | Maximum results cap |
| `OOREP_MCP_LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` |
| `OOREP_MCP_DEFAULT_REPERTORY` | `publicum` | Default repertory |
| `OOREP_MCP_DEFAULT_MATERIA_MEDICA` | `boericke` | Default materia medica |

**Example with custom config:**

```json
{
  "mcpServers": {
    "oorep": {
      "command": "npx",
      "args": ["-y", "oorep-mcp"],
      "env": {
        "OOREP_MCP_TIMEOUT_MS": "60000",
        "OOREP_MCP_CACHE_TTL_MS": "600000",
        "OOREP_MCP_LOG_LEVEL": "debug"
      }
    }
  }
}
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    MCP Client                           │
│            (Claude, Codex, Gemini, etc.)                │
└─────────────────────┬───────────────────────────────────┘
                      │ MCP Protocol (stdio)
┌─────────────────────▼───────────────────────────────────┐
│                  OOREP MCP Server                       │
├─────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐   │
│  │  Tools  │  │ Resources│  │ Prompts │  │   SDK    │   │
│  └────┬────┘  └────┬─────┘  └────┬────┘  └────┬─────┘   │
│       └────────────┼─────────────┼────────────┘         │
│                    ▼                                    │
│  ┌─────────────────────────────────────────────────┐    │
│  │              OOREPSDKClient                     │    │
│  │  ┌───────────┐ ┌────────────┐ ┌─────────────┐   │    │
│  │  │   Cache   │ │Deduplicator│ │  Validators │   │    │
│  │  └───────────┘ └────────────┘ └─────────────┘   │    │
│  └───────────────────────┬─────────────────────────┘    │
│                          ▼                              │
│  ┌─────────────────────────────────────────────────┐    │
│  │              OOREPClient (HTTP)                 │    │
│  │  • Session management (cookies)                 │    │
│  │  • Retry logic (3 attempts)                     │    │
│  │  • Timeout handling                             │    │
│  └───────────────────────┬─────────────────────────┘    │
└──────────────────────────┼──────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────┐
│                   OOREP API                             │
│              https://www.oorep.com                      │
└─────────────────────────────────────────────────────────┘
```

**Key Components:**

- **Cache**: In-memory LRU cache with configurable TTL (default 5 min)
- **Deduplicator**: Prevents duplicate concurrent requests for same data
- **Validators**: Zod schemas validate all inputs before API calls
- **Session Management**: Automatic cookie handling for OOREP API

---

## Troubleshooting

### Server Not Appearing

**Symptoms:** MCP indicator missing, tools not available

**Solutions:**
1. **Quit completely** - Cmd+Q (macOS) / Alt+F4 (Windows), not just close
2. **Validate JSON** - Use jsonlint.com to check config syntax
3. **Test manually** - Run `npx -y oorep-mcp` in terminal
4. **Check logs:**
   - macOS: `~/Library/Logs/Claude/mcp*.log`
   - Windows: `%APPDATA%\Claude\Logs\mcp*.log`

### Timeout Errors

**Symptoms:** "Request timed out", slow responses

**Solutions:**
1. Increase timeout: `"OOREP_MCP_TIMEOUT_MS": "60000"`
2. Check network: `curl https://www.oorep.com`
3. Check for proxy/firewall issues

### Empty Results

**Symptoms:** Searches return no results

**Solutions:**
1. Use broader terms (e.g., "headache" not "left-sided temporal headache at 3pm")
2. Remove `minWeight` filter
3. Try different repertory
4. Check OOREP website is accessible

### Memory Issues

**Symptoms:** High memory usage

**Solutions:**
1. Reduce cache TTL: `"OOREP_MCP_CACHE_TTL_MS": "60000"`
2. Reduce max results: `"OOREP_MCP_MAX_RESULTS": "50"`
3. Restart periodically

### Debug Logging

Enable detailed logs:

```json
"env": {
  "OOREP_MCP_LOG_LEVEL": "debug"
}
```

Check logs for:
- `NetworkError` - Connection issues
- `TimeoutError` - Slow responses
- `ValidationError` - Invalid input
- `RateLimitError` - Too many requests

### Get Help

1. [Search existing issues](https://github.com/Dhi13man/oorep-mcp/issues)
2. [Open new issue](https://github.com/Dhi13man/oorep-mcp/issues/new) with:
   - OS and version
   - Node.js version (`node --version`)
   - Configuration (sanitized)
   - Error logs

---

## Development

### Prerequisites

- Node.js ≥ 18.0.0
- npm ≥ 8.0.0

### Setup

```bash
git clone https://github.com/Dhi13man/oorep-mcp.git
cd oorep-mcp
npm install
```

### Commands

```bash
npm run build          # Compile TypeScript
npm run typecheck      # Type checking only
npm run dev            # Development mode with watch
npm test               # Run all tests
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report
npm run lint           # ESLint
npm run format         # Prettier
```

### Test Structure

```
src/
├── **/*.unit.test.ts        # Unit tests (mocked dependencies)
└── **/*.integration.test.ts # Integration tests (real implementations)
```

- **771 tests** with **94.6% coverage**
- Unit tests use mocked dependencies
- Integration tests use real implementations with mocked HTTP

---

## Disclaimer

**This tool is for educational and informational purposes only.**

- **Not medical advice** - Not a substitute for professional medical consultation
- **Consult practitioners** - Always consult qualified homeopathic practitioners
- **Not for diagnosis** - Not intended for diagnosing or treating medical conditions

Homeopathic treatment should only be undertaken under the guidance of qualified professionals.

---

## License

MIT License - see [LICENSE](LICENSE) file.

---

## Links

- [OOREP Website](https://www.oorep.com)
- [OOREP GitHub](https://github.com/nondeterministic/oorep)
- [MCP Documentation](https://modelcontextprotocol.io)
- [Issue Tracker](https://github.com/Dhi13man/oorep-mcp/issues)
- [npm Package](https://www.npmjs.com/package/oorep-mcp)

---

## Acknowledgments

- **OOREP Team** - Creating and maintaining the open-source OOREP platform
- **Anthropic** - Model Context Protocol and Claude
- **MCP Community** - Tools, documentation, and ecosystem support

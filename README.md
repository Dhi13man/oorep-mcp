# OOREP MCP Server

[![npm version](https://img.shields.io/npm/v/oorep-mcp.svg)](https://www.npmjs.com/package/oorep-mcp)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![CI](https://github.com/Dhi13man/oorep-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Dhi13man/oorep-mcp/actions/workflows/ci.yml)
[![CodeQL](https://github.com/Dhi13man/oorep-mcp/actions/workflows/codeql.yml/badge.svg)](https://github.com/Dhi13man/oorep-mcp/actions/workflows/codeql.yml)
[![Test Coverage](https://img.shields.io/badge/coverage-94.6%25-brightgreen.svg)](https://github.com/Dhi13man/oorep-mcp/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Contributors](https://img.shields.io/github/contributors-anon/dhi13man/oorep-mcp?style=flat)](https://github.com/Dhi13man/oorep-mcp/graphs/contributors)
[![GitHub forks](https://img.shields.io/github/forks/dhi13man/oorep-mcp?style=social)](https://github.com/Dhi13man/oorep-mcp/network/members)
[![GitHub Repo stars](https://img.shields.io/github/stars/dhi13man/oorep-mcp?style=social)](https://github.com/Dhi13man/oorep-mcp/stargazers)
[![Last Commit](https://img.shields.io/github/last-commit/dhi13man/oorep-mcp)](https://github.com/Dhi13man/oorep-mcp/commits/master)

[!["Buy Me A Coffee"](https://img.buymeacoffee.com/button-api/?text=Buy%20me%20an%20Ego%20boost&emoji=%F0%9F%98%B3&slug=dhi13man&button_colour=FF5F5F&font_colour=ffffff&font_family=Lato&outline_colour=000000&coffee_colour=FFDD00)](https://www.buymeacoffee.com/dhi13man)

**Model Context Protocol server (and Client SDK) providing AI assistants access to OOREP - a comprehensive homeopathic repertory and materia medica database.**

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

## What is OOREP?

**OOREP (Open Online Repertory)** is an open-source homeopathic database containing:

- **12+ Repertories** - Systematic indexes of symptoms mapped to remedies (Kent, Boger, Boericke, etc.)
- **Multiple Materia Medicas** - Detailed remedy descriptions and therapeutic indications
- **600+ Remedies** - Comprehensive remedy database with names, abbreviations, and alternates

### How Homeopathic Data is Structured

```text
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

## Quick Start

### 1. Add to Claude Desktop

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

## Platform Configuration

### Claude Code

#### Option A: CLI

```bash
claude mcp add oorep -- npx -y oorep-mcp
```

#### Option B: Config file (`~/.claude.json`)

```json
{
  "mcpServers": {
    "oorep": {
      "command": "npx",
      "args": ["-y", "oorep-mcp"],
      "env": {
        "OOREP_MCP_BASE_URL": "https://www.oorep.com",
        "OOREP_MCP_LOG_LEVEL": "info"
      }
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
        "OOREP_MCP_BASE_URL": "https://www.oorep.com",
        "OOREP_MCP_LOG_LEVEL": "info"
      }
    }
  }
}
```

**Important:** Quit completely (Cmd+Q), not just close window.

### Codex CLI

**Config:** `~/.codex/config.toml` (macOS/Linux) or `C:\Users\<Username>\.codex\config.toml` (Windows)

```toml
[mcp_servers.oorep]
command = "npx"
args = ["-y", "oorep-mcp"]
startup_timeout_sec = 15.0
tool_timeout_sec = 60.0

[mcp_servers.oorep.env]
OOREP_MCP_BASE_URL = "https://www.oorep.com"
OOREP_MCP_LOG_LEVEL = "info"
```

Or via CLI:

```bash
codex mcp add oorep --env OOREP_MCP_BASE_URL=https://www.oorep.com --env OOREP_MCP_LOG_LEVEL=info -- npx -y oorep-mcp
```

Verify: Run `codex mcp list`

### Gemini CLI

**Config:** `~/.gemini/settings.json`

```json
{
  "mcpServers": {
    "oorep": {
      "command": "npx",
      "args": ["-y", "oorep-mcp"],
      "env": {
        "OOREP_MCP_BASE_URL": "https://www.oorep.com",
        "OOREP_MCP_LOG_LEVEL": "info"
      },
      "timeout": 30000
    }
  }
}
```

## Usage Examples

Once installed, you can interact with OOREP through Claude naturally:

### Searching for Remedies

**You:** "Can you search OOREP for remedies for headache that's worse at night?"

**Claude will:**

1. Use the `search_repertory` tool
2. Search for "headache worse night" in the default repertory
3. Return matching rubrics with remedy recommendations and their weights

### Getting Detailed Remedy Information

**You:** "Tell me more about Aconite - what conditions is it used for?"

**Claude will:**

1. Use the `get_remedy_info` tool to fetch details about Aconite
2. Provide information about its common uses, characteristics, and therapeutic applications

### Comparing Remedies

**You:** "Compare Aconite and Belladonna for fever symptoms"

**Claude will:**

1. Use the `remedy-comparison` prompt
2. Search materia medicas for both remedies
3. Provide a side-by-side comparison focusing on fever symptoms
4. Highlight key differentiating factors

### Case Repertorization

**You:** "I want to repertorize a case with these symptoms: anxiety, palpitations, and insomnia"

**Claude will:**

1. Use the `repertorization-workflow` prompt
2. Guide you through systematic symptom analysis
3. Search relevant rubrics for each symptom
4. Help synthesize results to identify well-indicated remedies

### Browsing Available Resources

**You:** "What repertories are available in OOREP?"

**Claude will:**

1. Use the `list_available_repertories` tool
2. Show all 12+ available repertories with their names and descriptions

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

### Resources

| URI | Description | Content Type |
|-----|-------------|--------------|
| `oorep://remedies/list` | Complete list of all 600+ remedies | JSON |
| `oorep://repertories/list` | All available repertories with metadata | JSON |
| `oorep://materia-medicas/list` | All available materia medicas | JSON |
| `oorep://help/search-syntax` | Search syntax guide with examples | Text |

### Prompts

#### `analyze-symptoms`

Guided workflow for systematic symptom analysis.

**Arguments:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `symptom_description` | string | No | Initial symptom description |

**Workflow:** Guides through symptom gathering → modality analysis → repertory search → synthesis

#### `remedy-comparison`

Compare multiple remedies side-by-side.

**Arguments:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `remedies` | string | Yes | Comma-separated remedy names (2-6 remedies) |

**Example:** `remedies: "Aconite, Belladonna, Gelsemium"`

#### `repertorization-workflow`

Step-by-step case taking and repertorization.

**Workflow:** 7-step process from symptom collection through remedy differentiation.

## Search Syntax

### Basic Search

```bash
headache                    # Simple term
headache night              # Multiple terms (AND)
```

### Wildcards

```bash
head*                       # Matches: head, headache, heading
*ache                       # Matches: headache, stomachache
```

### Exact Phrases

```bash
"worse at night"            # Exact phrase match
"throbbing pain"            # Must appear together
```

### Exclusions

```bash
headache -migraine          # Headache but not migraine
fever -intermittent         # Fever excluding intermittent
```

### Combined

```bash
head* pain -chronic "worse motion"
```

### Tips

- Minimum 3 characters per term
- Wildcards only at word boundaries
- Use repertory-specific terminology for better results

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
    model: 'gpt-5',
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
      model: 'gpt-5',
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
    model: openai('gpt-5'),
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
  const model = new ChatOpenAI({ model: 'gpt-5' });
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

### Available SDK Tools

All adapters provide these tools:

| Tool | Description |
| --- | --- |
| `search_repertory` | Search for symptoms in homeopathic repertories |
| `search_materia_medica` | Search materia medica texts for remedy descriptions |
| `get_remedy_info` | Get detailed information about a specific remedy |
| `list_available_repertories` | List all accessible repertories |
| `list_available_materia_medicas` | List all accessible materia medicas |

### SDK Configuration

```typescript
const client = createOOREPClient({
  baseUrl: 'https://www.oorep.com',  // OOREP API base URL
  timeoutMs: 30000,                   // Request timeout (ms)
  cacheTtlMs: 300000,                 // Cache TTL (ms, 0 to disable)
  defaultRepertory: 'publicum',       // Default repertory
  defaultMateriaMedica: 'boericke',   // Default materia medica
});
```

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

> The MCP server maintains an anonymous OOREP session automatically. It performs a lightweight bootstrap request to fetch the required cookies and reuses them for subsequent search calls, so no additional authentication setup is necessary for public data.

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

## Architecture

```text
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

## Troubleshooting

### Server Not Appearing in Claude Desktop

**Problem:** The MCP indicator doesn't show up after configuration.

**Solutions:**

1. **Completely quit Claude Desktop** (Cmd+Q on macOS, not just close window)
2. **Restart Claude Desktop** and wait 10-15 seconds for MCP initialization
3. **Check the configuration file** for valid JSON syntax (use a JSON validator)
4. **Check the logs:**
   - **macOS:** `~/Library/Logs/Claude/mcp*.log`
   - **Windows:** `%APPDATA%\Claude\Logs\mcp*.log`
5. **Verify npx works:** Run `npx -y oorep-mcp` in terminal to check if it starts

### Connection Timeout Errors

**Problem:** "Connection timeout" or "Request timed out" errors.

**Solutions:**

1. **Increase timeout** in configuration:

   ```json
   "env": {
     "OOREP_MCP_TIMEOUT_MS": "60000"
   }
   ```

2. **Check network connectivity** to <https://www.oorep.com>:

   ```bash
   curl https://www.oorep.com
   ```

3. **Check for firewall/proxy issues** that might block connections

### No Results Returned

**Problem:** Searches return empty results or "No results found".

**Solutions:**

1. **Try broader search terms** (e.g., "headache" instead of "headache left temple worse 3pm")
2. **Remove filters** like `minWeight` or specific repertory restrictions
3. **Check if OOREP website is accessible** at <https://www.oorep.com>
4. **Try a different repertory:**
   **Ask Claude:** "Search in the Kent repertory instead"

### High Memory Usage

**Problem:** MCP server consuming excessive memory.

**Solutions:**

1. **Reduce cache TTL** to clear cache more frequently:

   ```json
   "env": {
     "OOREP_MCP_CACHE_TTL_MS": "60000"
   }
   ```

2. **Reduce max results:**

   ```json
   "env": {
     "OOREP_MCP_MAX_RESULTS": "50"
   }
   ```

3. **Restart Claude Desktop** periodically to clear cache

### Permission Errors on macOS/Linux

**Problem:** "Permission denied" when running the server.

**Solutions:**

1. **For global install:** Ensure proper npm permissions

   ```bash
   sudo npm install -g oorep-mcp
   ```

2. **For npx (recommended):** No permissions needed, use `-y` flag:

   ```bash
   npx -y oorep-mcp
   ```

### Viewing Detailed Logs

To see detailed debug logs for troubleshooting:

1. **Set log level to debug:**

   ```json
   "env": {
     "OOREP_MCP_LOG_LEVEL": "debug"
   }
   ```

2. **Check MCP logs:**
   - **macOS:** `tail -f ~/Library/Logs/Claude/mcp*.log`
   - **Windows:** Check `%APPDATA%\Claude\Logs\`

3. **Look for specific error patterns:**
   - `NetworkError` - Connection issues
   - `TimeoutError` - Request taking too long
   - `ValidationError` - Invalid input
   - `RateLimitError` - Too many requests

### Still Having Issues?

1. **Check existing issues:** <https://github.com/Dhi13man/oorep-mcp/issues>
2. **Report a new issue:** Include:
   - Your OS and version
   - Node.js version (`node --version`)
   - Claude Desktop version
   - Configuration (remove any sensitive data)
   - Error logs from MCP log files
3. **Join the discussion:** Share your experience and get community help

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

```text
src/
├── **/*.unit.test.ts        # Unit tests (mocked dependencies)
└── **/*.integration.test.ts # Integration tests (real implementations)
```

- **750+ tests** with **90%+ coverage**
- Unit tests use mocked dependencies
- Integration tests use real implementations with mocked HTTP

## Disclaimer

**This tool is for educational and informational purposes only.**

- **Not medical advice** - Not a substitute for professional medical consultation
- **Consult practitioners** - Always consult qualified homeopathic practitioners
- **Not for diagnosis** - Not intended for diagnosing or treating medical conditions

Homeopathic treatment should only be undertaken under the guidance of qualified professionals.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- **OOREP Team**: For creating and maintaining the open-source OOREP platform
- **Anthropic**: For the Model Context Protocol and Claude
- **MCP Community**: For tools, documentation, and support

## Links

- **OOREP Website**: <https://www.oorep.com>
- **OOREP GitHub**: <https://github.com/nondeterministic/oorep>
- **MCP Documentation**: <https://modelcontextprotocol.io>
- **Issue Tracker**: <https://github.com/Dhi13man/oorep-mcp/issues>
- **npm Package**: <https://www.npmjs.com/package/oorep-mcp>

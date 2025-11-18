# OOREP MCP Server

[![npm version](https://img.shields.io/npm/v/oorep-mcp.svg)](https://www.npmjs.com/package/oorep-mcp)
[![CI](https://github.com/Dhi13man/oorep-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Dhi13man/oorep-mcp/actions/workflows/ci.yml)
[![CodeQL](https://github.com/Dhi13man/oorep-mcp/actions/workflows/codeql.yml/badge.svg)](https://github.com/Dhi13man/oorep-mcp/actions/workflows/codeql.yml)
[![Test Coverage](https://img.shields.io/badge/coverage-92%25-brightgreen.svg)](https://github.com/Dhi13man/oorep-mcp/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Model Context Protocol (MCP) server that provides AI assistants with access to [OOREP](https://www.oorep.com) (Open Online Repertory) - a comprehensive homeopathic repertory and materia medica database.

## Features

- 🔍 **Search Repertories**: Query 12+ homeopathic repertories (Kent, Boger, Boericke, etc.) for symptoms and rubrics
- 📚 **Search Materia Medicas**: Access detailed remedy descriptions from multiple materia medicas
- 💊 **Remedy Information**: Get comprehensive details about 600+ homeopathic remedies
- 📋 **List Resources**: Browse available repertories, materia medicas, and remedies
- 🎯 **Guided Workflows**: Use prompts for symptom analysis, remedy comparison, and case repertorization
- ⚡ **Performance**: Built-in caching, request deduplication, and retry logic
- 🛡️ **Type-Safe**: Full TypeScript implementation with Zod validation
- 🔒 **Secure**: Input validation, error sanitization, and no credential storage required

## Installation

### NPX (Recommended)

No installation required! Use directly with:

```bash
npx oorep-mcp
```

### NPM Global

```bash
npm install -g oorep-mcp
```

### NPM Local

```bash
npm install oorep-mcp
```

## Quick Start

### Claude Desktop

1. Locate your Claude Desktop configuration file:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

2. Add the OOREP MCP server:

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

3. Restart Claude Desktop completely (Quit, not just close window)

4. Look for the 🔌 MCP indicator in the bottom-right corner

For full documentation, see the sections below or the [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

## Usage Examples

Once installed, you can interact with OOREP through Claude naturally. Here are some example conversations:

### Example 1: Searching for Remedies

**You:** "Can you search OOREP for remedies for headache that's worse at night?"

**Claude will:**
1. Use the `search_repertory` tool
2. Search for "headache worse night" in the Kent repertory
3. Return matching rubrics with remedy recommendations and their weights

### Example 2: Getting Detailed Remedy Information

**You:** "Tell me more about Aconite - what conditions is it used for?"

**Claude will:**
1. Use the `get_remedy_info` tool to fetch details about Aconite
2. Provide information about its common uses, characteristics, and therapeutic applications

### Example 3: Comparing Remedies

**You:** "Compare Aconite and Belladonna for fever symptoms"

**Claude will:**
1. Use the `remedy-comparison` prompt
2. Search materia medicas for both remedies
3. Provide a side-by-side comparison focusing on fever symptoms
4. Highlight key differentiating factors

### Example 4: Case Repertorization

**You:** "I want to repertorize a case with these symptoms: anxiety, palpitations, and insomnia"

**Claude will:**
1. Use the `repertorization-workflow` prompt
2. Guide you through systematic symptom analysis
3. Search relevant rubrics for each symptom
4. Help synthesize results to identify well-indicated remedies

### Example 5: Browsing Available Resources

**You:** "What repertories are available in OOREP?"

**Claude will:**
1. Use the `list_available_repertories` tool
2. Show all 12+ available repertories with their names and descriptions

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
2. **Check network connectivity** to www.oorep.com:
   ```bash
   curl https://www.oorep.com
   ```
3. **Check for firewall/proxy issues** that might block connections

### No Results Returned

**Problem:** Searches return empty results or "No results found".

**Solutions:**
1. **Try broader search terms** (e.g., "headache" instead of "headache left temple worse 3pm")
2. **Remove filters** like `minWeight` or specific repertory restrictions
3. **Check if OOREP website is accessible** at https://www.oorep.com
4. **Try a different repertory:**
   ```json
   Ask Claude: "Search in the Kent repertory instead"
   ```

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

1. **Check existing issues:** https://github.com/Dhi13man/oorep-mcp/issues
2. **Report a new issue:** Include:
   - Your OS and version
   - Node.js version (`node --version`)
   - Claude Desktop version
   - Configuration (remove any sensitive data)
   - Error logs from MCP log files
3. **Join the discussion:** Share your experience and get community help

## Available Tools

- `search_repertory` - Search for symptoms in homeopathic repertories
- `search_materia_medica` - Search materia medica texts for remedies
- `get_remedy_info` - Get detailed information about a specific remedy
- `list_available_repertories` - List all accessible repertories
- `list_available_materia_medicas` - List all accessible materia medicas

## Available Resources

- `oorep://remedies/list` - Complete list of remedies
- `oorep://repertories/list` - List of repertories
- `oorep://materia-medicas/list` - List of materia medicas
- `oorep://help/search-syntax` - Search syntax guide

## Available Prompts

- `analyze-symptoms` - Guided symptom analysis workflow
- `remedy-comparison` - Compare multiple remedies
- `repertorization-workflow` - Step-by-step case taking

## Configuration

The server is configured entirely through environment variables. The defaults work for the public <https://www.oorep.com> deployment, but you can override them as needed:

| Variable | Default | Description |
| --- | --- | --- |
| `OOREP_MCP_BASE_URL` | `https://www.oorep.com` | Base URL for the upstream OOREP instance |
| `OOREP_MCP_TIMEOUT_MS` | `30000` | HTTP timeout per request (milliseconds) |
| `OOREP_MCP_CACHE_TTL_MS` | `300000` | In-memory cache TTL for search results (milliseconds) |
| `OOREP_MCP_MAX_RESULTS` | `100` | Hard cap for search results returned to MCP clients |
| `OOREP_MCP_LOG_LEVEL` | `info` | Log level (`debug`, `info`, `warn`, `error`) |
| `OOREP_MCP_DEFAULT_REPERTORY` | `publicum` | Default repertory abbreviation when callers omit one |
| `OOREP_MCP_DEFAULT_MATERIA_MEDICA` | `boericke` | Default materia medica abbreviation when omitted |

> ℹ️ The MCP server now maintains an anonymous OOREP session automatically. It performs a lightweight bootstrap request to fetch the required cookies and reuses them for subsequent search calls, so no additional authentication setup is necessary for public data.

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

### Build

```bash
npm run build        # Compile TypeScript
npm run typecheck    # Type checking
npm run dev          # Run in development mode
```

### Testing

```bash
npm test             # Run tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
```

## Important Disclaimer

**This tool is for educational and informational purposes only.**

- Not a substitute for professional medical advice
- Always consult a qualified homeopathic practitioner
- Not for diagnosing or treating medical conditions

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

# OOREP MCP Server

[![npm version](https://img.shields.io/npm/v/oorep-mcp.svg)](https://www.npmjs.com/package/oorep-mcp)
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

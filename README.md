# oorep-mcp

Model Context Protocol (MCP) server that surfaces [OOREP](https://www.oorep.com/) repertory and materia medica data through MCP-compliant tools, resources, and prompts. This repository currently contains the scaffolding for the TypeScript-based implementation.

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Configure environment variables** (defaults will land in future commits):
   - `OOREP_MCP_BASE_URL` – OOREP instance to query (e.g., `https://www.oorep.com` or `http://localhost:9000`).
   - `OOREP_MCP_TIMEOUT_MS` – HTTP timeout (ms, optional).
3. **Run the dev server**
   ```bash
   npm run dev
   ```

This will launch the MCP server over stdio using `tsx` so MCP-enabled clients can connect during development.

## Project Layout

```
AGENTS.md                 # Operating instructions for contributors
README.md                 # You are here
package.json / tsconfig   # Node + TypeScript config
src/                      # Runtime implementation (server entry point, tools, http client, etc.)
resources/                # Markdown/text exposed as MCP resources
tests/                    # Unit & integration tests
```

## Next Steps

- Flesh out the HTTP client for OOREP endpoints (`/api/lookup_rep`, `/api/lookup_mm`, etc.).
- Define MCP tools/resources/prompts per the design plan (see AGENTS.md).
- Add linting, formatting, and automated tests once functional code exists.

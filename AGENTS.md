# Agent Operating Manual — OOREP MCP

This repository hosts the implementation of `oorep-mcp`, a Model Context Protocol (MCP) server that exposes OOREP’s repertory and materia medica search endpoints as structured MCP tools. Follow the guidance below whenever you work in this project.

## Mission & Scope

- Build and maintain an open, publishable MCP server that lets any MCP-enabled client query OOREP (remote or self-hosted) safely and efficiently.
- Initial scope is read-only and anonymous: list repertories/materia medicas/remedies and search them. Secure `/api/sec/...` endpoints will be treated as future/advanced work.
- Favor TypeScript and the official `@modelcontextprotocol/sdk` for the server implementation, exposing the functionality over stdio.

## Core Workflow

1. **Perceive**  
   - Understand the requested change or question and review relevant code/docs first.  
   - Prefer referencing existing plans (see `README.md`, design docs, or issue notes) before inventing new approaches.  
   - Ask at most 3 clarifying questions if blockers arise.

2. **Plan**  
   - Break tasks into concrete subtasks before editing.  
   - For anything beyond a trivial tweak, produce a multi-step plan (use the planning tool if applicable).  
   - When creating new MCP tools/endpoints, start from the functional contract (inputs/outputs) before writing code.

3. **Act**  
   - Implement smallest viable increments with clear commits.  
   - Mirror OOREP’s existing API semantics (see `README.md` summary) and keep schemas LLM-friendly.  
   - Default to TypeScript, zod-style validation, and async/await for HTTP calls.

4. **Check**  
   - Add/adjust tests when behavior changes; smoke-test against a local OOREP Docker stack when feasible.  
   - Run `npm run lint` / `npm run test` once they exist.  
   - Verify formatting (Prettier/ESLint once configured).

5. **Reflect**  
   - Summarize what changed and why in responses/PRs.  
   - Call out follow-ups or risks (rate limiting, schema changes upstream, auth assumptions).

## Technical Guardrails

- **Config/Env:**  
  - MCP server must discover OOREP via env vars (e.g., `OOREP_MCP_BASE_URL`, `OOREP_MCP_TIMEOUT_MS`).  
  - Never hardcode secrets. Respect GPL context when bundling upstream artifacts.

- **HTTP Client:**  
  - Wrap upstream requests with timeouts, retry-once behavior for idempotent GETs, and descriptive errors.  
  - Always send a descriptive `User-Agent` (e.g., `oorep-mcp/<version>`).

- **Tool Design:**  
  - Keep schemas minimal yet expressive (IDs, titles, metadata, weights).  
  - Enforce OOREP wildcard rules before hitting the backend to avoid unnecessary 400s.  
  - Cap payload sizes (configurable `max_results`) to stay within LLM context limits.

- **Caching & Rate Limits:**  
  - Cache metadata endpoints with configurable TTLs to protect OOREP.  
  - Provide an internal rate limiter; degrade gracefully when limits hit.

- **Docs:**  
  - Update `README.md`, changelog, and prompt/resource descriptions whenever tool semantics change.  
  - Document how to run against both remote (`https://www.oorep.com`) and local Docker deployments.

## Coding Style & Tooling

- TypeScript, ES2022 modules.  
- Configure `tsconfig.json` targeting `ES2022`, module `NodeNext`.  
- Use ESLint + Prettier once bootstrap is ready.  
- Tests with Vitest or Jest (choose one early and stay consistent).  
- Directory layout guidance:
  - `src/` — runtime code (client, tools, resources, prompts, server entrypoint).
  - `resources/` — static markdown or templates served via MCP resources.
  - `tests/` — unit and integration tests.
  - `scripts/` — helper tooling (dev server, lint, etc.).

## Communication

- Keep responses concise and empathetic; highlight blockers early.  
- When reviewing or reporting, lead with issues before summary.  
- Suggest clear next steps (tests to run, config to set) after completing a task.

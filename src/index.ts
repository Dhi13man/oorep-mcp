#!/usr/bin/env node

/**
 * OOREP MCP Server Entry Point
 * Model Context Protocol server for OOREP homeopathic repertory and materia medica
 */

import { runServer } from './server.js';

runServer().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

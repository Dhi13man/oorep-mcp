#!/usr/bin/env node

/**
 * Test public endpoints that work without authentication
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

let client;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function setup() {
  log('🚀 Testing OOREP MCP Public Endpoints\n', colors.cyan);

  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/index.js'],
    env: {
      ...process.env,
      OOREP_MCP_LOG_LEVEL: 'error',
    },
  });

  client = new Client(
    {
      name: 'oorep-mcp-test-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  await client.connect(transport);
  log('✓ Connected to MCP server\n', colors.green);
}

async function testGetRemedyInfo() {
  log('Testing: get_remedy_info with Aconite', colors.blue);

  try {
    const result = await client.callTool({
      name: 'get_remedy_info',
      arguments: {
        remedy: 'Aconite',
      },
    });

    const data = JSON.parse(result.content[0].text);
    log(`✓ Found: ${data.nameLong} (${data.nameAbbrev})`, colors.green);
    log(`  ID: ${data.id}`, colors.blue);
    if (data.nameAlt && data.nameAlt.length > 0) {
      log(`  Alt names: ${data.nameAlt.join(', ')}`, colors.blue);
    }
  } catch (error) {
    log(`✗ Failed: ${error.message}`, colors.red);
  }
}

async function testListRepertories() {
  log('\nTesting: list_available_repertories', colors.blue);

  try {
    const result = await client.callTool({
      name: 'list_available_repertories',
      arguments: {},
    });

    const data = JSON.parse(result.content[0].text);
    log(`✓ Found ${data.repertories.length} repertories`, colors.green);

    if (data.repertories.length > 0) {
      log(`  Examples:`, colors.blue);
      data.repertories.slice(0, 3).forEach((r) => {
        log(`    - ${r.title} (${r.abbreviation})`, colors.blue);
        if (r.author) log(`      Author: ${r.author}`, colors.blue);
      });
    }
  } catch (error) {
    log(`✗ Failed: ${error.message}`, colors.red);
  }
}

async function testListMateriaMedicas() {
  log('\nTesting: list_available_materia_medicas', colors.blue);

  try {
    const result = await client.callTool({
      name: 'list_available_materia_medicas',
      arguments: {},
    });

    const data = JSON.parse(result.content[0].text);
    log(`✓ Found ${data.materiaMedicas.length} materia medicas`, colors.green);

    if (data.materiaMedicas.length > 0) {
      log(`  Examples:`, colors.blue);
      data.materiaMedicas.slice(0, 3).forEach((mm) => {
        log(`    - ${mm.title} (${mm.abbreviation})`, colors.blue);
        if (mm.author) log(`      Author: ${mm.author}`, colors.blue);
      });
    }
  } catch (error) {
    log(`✗ Failed: ${error.message}`, colors.red);
  }
}

async function testResourcesRemediesList() {
  log('\nTesting: Resource oorep://remedies/list', colors.blue);

  try {
    const result = await client.readResource({
      uri: 'oorep://remedies/list',
    });

    const data = JSON.parse(result.contents[0].text);
    log(`✓ Remedies list contains ${data.length} remedies`, colors.green);
    log(`  First 3:`, colors.blue);
    data.slice(0, 3).forEach((r) => {
      log(`    - ${r.nameLong} (${r.nameAbbrev})`, colors.blue);
    });
  } catch (error) {
    log(`✗ Failed: ${error.message}`, colors.red);
  }
}

async function testResourcesRepertoriesList() {
  log('\nTesting: Resource oorep://repertories/list', colors.blue);

  try {
    const result = await client.readResource({
      uri: 'oorep://repertories/list',
    });

    const data = JSON.parse(result.contents[0].text);
    log(`✓ Repertories list contains ${data.length} items`, colors.green);
  } catch (error) {
    log(`✗ Failed: ${error.message}`, colors.red);
  }
}

async function testResourcesHelp() {
  log('\nTesting: Resource oorep://help/search-syntax', colors.blue);

  try {
    const result = await client.readResource({
      uri: 'oorep://help/search-syntax',
    });

    const text = result.contents[0].text;
    log(`✓ Help loaded (${text.length} characters)`, colors.green);
    log(`  Contains wildcards: ${text.includes('Wildcards')}`, colors.blue);
    log(`  Contains exclusions: ${text.includes('Exclusions')}`, colors.blue);
  } catch (error) {
    log(`✗ Failed: ${error.message}`, colors.red);
  }
}

async function testPrompts() {
  log('\nTesting: Prompts', colors.blue);

  try {
    const result = await client.listPrompts();
    log(`✓ Found ${result.prompts.length} prompts`, colors.green);
    result.prompts.forEach((p) => {
      log(`    - ${p.name}`, colors.blue);
    });
  } catch (error) {
    log(`✗ Failed: ${error.message}`, colors.red);
  }
}

async function cleanup() {
  await client.close();
  log('\n✅ All public endpoint tests completed!', colors.green);
}

async function runTests() {
  try {
    await setup();
    await testGetRemedyInfo();
    await testListRepertories();
    await testListMateriaMedicas();
    await testResourcesRemediesList();
    await testResourcesRepertoriesList();
    await testResourcesHelp();
    await testPrompts();
    await cleanup();
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

runTests();

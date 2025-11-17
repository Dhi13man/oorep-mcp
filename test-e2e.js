#!/usr/bin/env node

/**
 * Comprehensive end-to-end test script for OOREP MCP Server
 * Tests all tools, resources, and prompts with real OOREP API
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

let testsPassed = 0;
let testsFailed = 0;
let client;
let serverProcess;

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logTest(name) {
  log(`\n${'='.repeat(80)}`, colors.cyan);
  log(`Testing: ${name}`, colors.cyan);
  log('='.repeat(80), colors.cyan);
}

function logSuccess(message) {
  testsPassed++;
  log(`✓ ${message}`, colors.green);
}

function logError(message, error) {
  testsFailed++;
  log(`✗ ${message}`, colors.red);
  if (error) {
    console.error(error);
  }
}

function logInfo(message) {
  log(`ℹ ${message}`, colors.blue);
}

async function setup() {
  log('\n🚀 Starting OOREP MCP Server E2E Tests\n', colors.yellow);

  // Start the server process
  serverProcess = spawn('node', ['dist/index.js'], {
    env: {
      ...process.env,
      OOREP_MCP_LOG_LEVEL: 'error', // Reduce noise during tests
    },
  });

  serverProcess.stderr.on('data', (data) => {
    // Only show errors during setup
    const msg = data.toString();
    if (msg.includes('ERROR') || msg.includes('Failed')) {
      console.error('Server stderr:', msg);
    }
  });

  // Create client
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
  logSuccess('MCP Server connected');
}

async function testListTools() {
  logTest('List Tools');

  try {
    const result = await client.listTools();

    if (!result.tools || result.tools.length === 0) {
      logError('No tools returned');
      return;
    }

    logSuccess(`Found ${result.tools.length} tools`);

    const expectedTools = [
      'search_repertory',
      'search_materia_medica',
      'get_remedy_info',
      'list_available_repertories',
      'list_available_materia_medicas',
    ];

    for (const toolName of expectedTools) {
      const tool = result.tools.find((t) => t.name === toolName);
      if (tool) {
        logSuccess(`Tool found: ${toolName}`);
        logInfo(`  Description: ${tool.description.substring(0, 80)}...`);
      } else {
        logError(`Tool not found: ${toolName}`);
      }
    }
  } catch (error) {
    logError('Failed to list tools', error);
  }
}

async function testSearchRepertory() {
  logTest('Tool: search_repertory');

  // Test 1: Basic search
  try {
    logInfo('Test 1: Basic symptom search (headache)');
    const result = await client.callTool({
      name: 'search_repertory',
      arguments: {
        symptom: 'headache',
        maxResults: 5,
      },
    });

    if (result.content && result.content.length > 0) {
      const data = JSON.parse(result.content[0].text);
      logSuccess(`Found ${data.totalResults} results`);
      logSuccess(`Returned ${data.rubrics.length} rubrics`);

      if (data.rubrics.length > 0) {
        logInfo(`  First rubric: ${data.rubrics[0].rubric}`);
        logInfo(`  Remedies in first rubric: ${data.rubrics[0].remedies.length}`);
      }

      if (data.remedyStats && data.remedyStats.length > 0) {
        logSuccess(`Remedy stats included (${data.remedyStats.length} remedies)`);
        logInfo(`  Top remedy: ${data.remedyStats[0].name} (count: ${data.remedyStats[0].count}, weight: ${data.remedyStats[0].cumulativeWeight})`);
      }
    } else {
      logError('No content returned');
    }
  } catch (error) {
    logError('Test 1 failed', error);
  }

  // Test 2: Search with specific repertory
  try {
    logInfo('Test 2: Search with specific repertory (kent)');
    const result = await client.callTool({
      name: 'search_repertory',
      arguments: {
        symptom: 'fever',
        repertory: 'kent',
        maxResults: 3,
      },
    });

    const data = JSON.parse(result.content[0].text);
    logSuccess(`Found ${data.rubrics.length} rubrics from Kent's repertory`);
  } catch (error) {
    logError('Test 2 failed', error);
  }

  // Test 3: Validation - symptom too short
  try {
    logInfo('Test 3: Validation test (symptom too short)');
    const result = await client.callTool({
      name: 'search_repertory',
      arguments: {
        symptom: 'ab', // Too short
      },
    });

    logError('Should have failed validation');
  } catch (error) {
    logSuccess('Validation error caught correctly');
  }
}

async function testSearchMateriaMedica() {
  logTest('Tool: search_materia_medica');

  try {
    logInfo('Test: Search materia medica (anxiety)');
    const result = await client.callTool({
      name: 'search_materia_medica',
      arguments: {
        symptom: 'anxiety',
        maxResults: 3,
      },
    });

    const data = JSON.parse(result.content[0].text);
    logSuccess(`Found ${data.totalResults} total results`);
    logSuccess(`Returned ${data.results.length} remedy results`);

    if (data.results.length > 0) {
      logInfo(`  First remedy: ${data.results[0].remedy}`);
      logInfo(`  Sections: ${data.results[0].sections.length}`);
      if (data.results[0].sections.length > 0) {
        logInfo(`  First section content (truncated): ${data.results[0].sections[0].content.substring(0, 100)}...`);
      }
    }
  } catch (error) {
    logError('Test failed', error);
  }
}

async function testGetRemedyInfo() {
  logTest('Tool: get_remedy_info');

  try {
    logInfo('Test: Get info for Aconite');
    const result = await client.callTool({
      name: 'get_remedy_info',
      arguments: {
        remedy: 'Aconite',
      },
    });

    const data = JSON.parse(result.content[0].text);
    logSuccess(`Found remedy: ${data.nameLong}`);
    logInfo(`  Abbreviation: ${data.nameAbbrev}`);
    logInfo(`  ID: ${data.id}`);

    if (data.nameAlt && data.nameAlt.length > 0) {
      logInfo(`  Alternative names: ${data.nameAlt.join(', ')}`);
    }
  } catch (error) {
    logError('Test failed', error);
  }
}

async function testListRepertories() {
  logTest('Tool: list_available_repertories');

  try {
    logInfo('Test: List all repertories');
    const result = await client.callTool({
      name: 'list_available_repertories',
      arguments: {},
    });

    const data = JSON.parse(result.content[0].text);
    logSuccess(`Found ${data.repertories.length} repertories`);

    if (data.repertories.length > 0) {
      const first = data.repertories[0];
      logInfo(`  First: ${first.title} (${first.abbreviation})`);
      if (first.author) logInfo(`    Author: ${first.author}`);
      if (first.language) logInfo(`    Language: ${first.language}`);
    }
  } catch (error) {
    logError('Test failed', error);
  }
}

async function testListMateriaMedicas() {
  logTest('Tool: list_available_materia_medicas');

  try {
    logInfo('Test: List all materia medicas');
    const result = await client.callTool({
      name: 'list_available_materia_medicas',
      arguments: {},
    });

    const data = JSON.parse(result.content[0].text);
    logSuccess(`Found ${data.materiaMedicas.length} materia medicas`);

    if (data.materiaMedicas.length > 0) {
      const first = data.materiaMedicas[0];
      logInfo(`  First: ${first.title} (${first.abbreviation})`);
      if (first.author) logInfo(`    Author: ${first.author}`);
    }
  } catch (error) {
    logError('Test failed', error);
  }
}

async function testListResources() {
  logTest('List Resources');

  try {
    const result = await client.listResources();

    if (!result.resources || result.resources.length === 0) {
      logError('No resources returned');
      return;
    }

    logSuccess(`Found ${result.resources.length} resources`);

    const expectedResources = [
      'oorep://remedies/list',
      'oorep://repertories/list',
      'oorep://materia-medicas/list',
      'oorep://help/search-syntax',
    ];

    for (const uri of expectedResources) {
      const resource = result.resources.find((r) => r.uri === uri);
      if (resource) {
        logSuccess(`Resource found: ${uri}`);
        logInfo(`  Name: ${resource.name}`);
        logInfo(`  Type: ${resource.mimeType}`);
      } else {
        logError(`Resource not found: ${uri}`);
      }
    }
  } catch (error) {
    logError('Failed to list resources', error);
  }
}

async function testReadResources() {
  logTest('Read Resources');

  // Test 1: Read remedies list
  try {
    logInfo('Test 1: Read oorep://remedies/list');
    const result = await client.readResource({
      uri: 'oorep://remedies/list',
    });

    if (result.contents && result.contents.length > 0) {
      const data = JSON.parse(result.contents[0].text);
      logSuccess(`Remedies list contains ${data.length} remedies`);
      if (data.length > 0) {
        logInfo(`  First remedy: ${data[0].nameLong} (${data[0].nameAbbrev})`);
      }
    } else {
      logError('No content in remedies list');
    }
  } catch (error) {
    logError('Test 1 failed', error);
  }

  // Test 2: Read repertories list
  try {
    logInfo('Test 2: Read oorep://repertories/list');
    const result = await client.readResource({
      uri: 'oorep://repertories/list',
    });

    const data = JSON.parse(result.contents[0].text);
    logSuccess(`Repertories list contains ${data.length} items`);
  } catch (error) {
    logError('Test 2 failed', error);
  }

  // Test 3: Read help/search-syntax
  try {
    logInfo('Test 3: Read oorep://help/search-syntax');
    const result = await client.readResource({
      uri: 'oorep://help/search-syntax',
    });

    if (result.contents && result.contents.length > 0) {
      const text = result.contents[0].text;
      logSuccess(`Search syntax help loaded (${text.length} characters)`);
      logInfo(`  Contains wildcards section: ${text.includes('Wildcards')}`);
      logInfo(`  Contains exclusions section: ${text.includes('Exclusions')}`);
    }
  } catch (error) {
    logError('Test 3 failed', error);
  }
}

async function testListPrompts() {
  logTest('List Prompts');

  try {
    const result = await client.listPrompts();

    if (!result.prompts || result.prompts.length === 0) {
      logError('No prompts returned');
      return;
    }

    logSuccess(`Found ${result.prompts.length} prompts`);

    const expectedPrompts = [
      'analyze-symptoms',
      'remedy-comparison',
      'repertorization-workflow',
    ];

    for (const promptName of expectedPrompts) {
      const prompt = result.prompts.find((p) => p.name === promptName);
      if (prompt) {
        logSuccess(`Prompt found: ${promptName}`);
        logInfo(`  Description: ${prompt.description.substring(0, 80)}...`);
        if (prompt.arguments && prompt.arguments.length > 0) {
          logInfo(`  Arguments: ${prompt.arguments.map((a) => a.name).join(', ')}`);
        }
      } else {
        logError(`Prompt not found: ${promptName}`);
      }
    }
  } catch (error) {
    logError('Failed to list prompts', error);
  }
}

async function testGetPrompts() {
  logTest('Get Prompts');

  // Test 1: analyze-symptoms
  try {
    logInfo('Test 1: Get analyze-symptoms prompt');
    const result = await client.getPrompt({
      name: 'analyze-symptoms',
      arguments: {
        symptom_description: 'headache worse at night',
      },
    });

    if (result.messages && result.messages.length > 0) {
      logSuccess('Prompt returned successfully');
      logInfo(`  Messages: ${result.messages.length}`);
      logInfo(`  Contains symptom: ${result.messages[0].content.text.includes('headache worse at night')}`);
    } else {
      logError('No messages in prompt');
    }
  } catch (error) {
    logError('Test 1 failed', error);
  }

  // Test 2: remedy-comparison
  try {
    logInfo('Test 2: Get remedy-comparison prompt');
    const result = await client.getPrompt({
      name: 'remedy-comparison',
      arguments: {
        remedies: 'Aconite,Belladonna,Gelsemium',
      },
    });

    if (result.messages && result.messages.length > 0) {
      logSuccess('Prompt returned successfully');
      logInfo(`  Contains all remedies: ${result.messages[0].content.text.includes('Aconite') && result.messages[0].content.text.includes('Belladonna')}`);
    }
  } catch (error) {
    logError('Test 2 failed', error);
  }

  // Test 3: repertorization-workflow
  try {
    logInfo('Test 3: Get repertorization-workflow prompt');
    const result = await client.getPrompt({
      name: 'repertorization-workflow',
      arguments: {},
    });

    if (result.messages && result.messages.length > 0) {
      logSuccess('Prompt returned successfully');
      const text = result.messages[0].content.text;
      logInfo(`  Contains STEP 1: ${text.includes('STEP 1')}`);
      logInfo(`  Contains workflow: ${text.includes('workflow')}`);
    }
  } catch (error) {
    logError('Test 3 failed', error);
  }
}

async function testErrorHandling() {
  logTest('Error Handling');

  // Test 1: Invalid tool name
  try {
    logInfo('Test 1: Invalid tool name');
    await client.callTool({
      name: 'nonexistent_tool',
      arguments: {},
    });
    logError('Should have thrown error for invalid tool');
  } catch (error) {
    logSuccess('Invalid tool error caught correctly');
  }

  // Test 2: Invalid resource URI
  try {
    logInfo('Test 2: Invalid resource URI');
    await client.readResource({
      uri: 'oorep://invalid/resource',
    });
    logError('Should have thrown error for invalid resource');
  } catch (error) {
    logSuccess('Invalid resource error caught correctly');
  }

  // Test 3: Invalid prompt name
  try {
    logInfo('Test 3: Invalid prompt name');
    await client.getPrompt({
      name: 'nonexistent-prompt',
      arguments: {},
    });
    logError('Should have thrown error for invalid prompt');
  } catch (error) {
    logSuccess('Invalid prompt error caught correctly');
  }
}

async function cleanup() {
  log('\n🧹 Cleaning up...', colors.yellow);

  try {
    await client.close();
    logSuccess('Client closed');
  } catch (error) {
    logError('Failed to close client', error);
  }

  if (serverProcess) {
    serverProcess.kill();
    logSuccess('Server process terminated');
  }
}

async function runTests() {
  try {
    await setup();

    // Test all functionality
    await testListTools();
    await testSearchRepertory();
    await testSearchMateriaMedica();
    await testGetRemedyInfo();
    await testListRepertories();
    await testListMateriaMedicas();
    await testListResources();
    await testReadResources();
    await testListPrompts();
    await testGetPrompts();
    await testErrorHandling();

    await cleanup();

    // Summary
    log('\n' + '='.repeat(80), colors.cyan);
    log('Test Summary', colors.cyan);
    log('='.repeat(80), colors.cyan);
    log(`✓ Passed: ${testsPassed}`, colors.green);
    log(`✗ Failed: ${testsFailed}`, colors.red);
    log(`Total: ${testsPassed + testsFailed}`, colors.blue);

    if (testsFailed === 0) {
      log('\n🎉 All tests passed! OOREP MCP Server is ready for deployment!', colors.green);
      process.exit(0);
    } else {
      log('\n⚠️  Some tests failed. Please review and fix issues.', colors.red);
      process.exit(1);
    }
  } catch (error) {
    logError('Fatal error during testing', error);
    await cleanup();
    process.exit(1);
  }
}

runTests();

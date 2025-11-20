/**
 * OOREP SDK Usage Examples
 *
 * This file demonstrates various ways to use the OOREP SDK
 * with different AI client SDKs.
 */

// =====================================================
// Example 1: Direct SDK Usage (No AI SDK required)
// =====================================================

import { createOOREPClient } from '../src/sdk/index.js';

async function directUsageExample() {
  // Create client with default config
  const client = createOOREPClient();

  // Or with custom config
  // const client = createOOREPClient({
  //   baseUrl: 'https://www.oorep.com',
  //   timeoutMs: 30000,
  //   cacheTtlMs: 300000
  // });

  // Search repertory
  const repertoryResults = await client.searchRepertory({
    symptom: 'headache',
    minWeight: 2,
    maxResults: 10,
    includeRemedyStats: true
  });
  console.log('Repertory results:', repertoryResults);

  // Search materia medica
  const mmResults = await client.searchMateriaMedica({
    symptom: 'anxiety',
    maxResults: 5
  });
  console.log('Materia Medica results:', mmResults);

  // Get remedy info
  const remedyInfo = await client.getRemedyInfo({ remedy: 'acon' });
  console.log('Remedy info:', remedyInfo);

  // List available repertories
  const repertories = await client.listRepertories({ language: 'en' });
  console.log('Available repertories:', repertories);

  // Clean up
  client.destroy();
}

// =====================================================
// Example 2: OpenAI SDK Integration
// =====================================================

// import OpenAI from 'openai';
import { openAITools } from '../src/sdk/adapters/openai.js';

async function openAIExample() {
  // Uncomment when using with actual OpenAI SDK
  // const openai = new OpenAI();
  const client = createOOREPClient();

  console.log('OpenAI Tools:', JSON.stringify(openAITools, null, 2));

  // Example of how to use with OpenAI
  /*
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'user', content: 'Find remedies for throbbing headache worse from motion' }
    ],
    tools: openAITools
  });

  // Process tool calls automatically
  const toolMessages = await processToolCalls(client, response.choices[0].message.tool_calls);

  // Continue conversation with tool results
  const finalResponse = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'user', content: 'Find remedies for throbbing headache worse from motion' },
      response.choices[0].message,
      ...toolMessages
    ]
  });

  console.log('Final response:', finalResponse.choices[0].message.content);
  */

  client.destroy();
}

// =====================================================
// Example 3: Vercel AI SDK Integration
// =====================================================

// import { generateText } from 'ai';
// import { openai } from '@ai-sdk/openai';
import { createOOREPTools } from '../src/sdk/adapters/vercel-ai.js';

async function vercelAIExample() {
  const client = createOOREPClient();
  const tools = createOOREPTools(client);

  console.log('Vercel AI Tools:', Object.keys(tools));

  // Example of how to use with Vercel AI SDK
  /*
  const result = await generateText({
    model: openai('gpt-4'),
    tools,
    prompt: 'What are the best remedies for anxiety with fear of death?'
  });

  console.log('Result:', result.text);
  console.log('Tool calls:', result.toolCalls);
  */

  client.destroy();
}

// =====================================================
// Example 4: LangChain Integration
// =====================================================

// import { ChatOpenAI } from '@langchain/openai';
// import { createReactAgent } from '@langchain/langgraph/prebuilt';
// import { DynamicStructuredTool } from '@langchain/core/tools';
import { createLangChainTools } from '../src/sdk/adapters/langchain.js';

async function langchainExample() {
  const client = createOOREPClient();
  const toolDefinitions = createLangChainTools(client);

  console.log('LangChain Tools:', toolDefinitions.map(t => t.name));

  // Example of how to use with LangChain
  /*
  // Convert to DynamicStructuredTool instances
  const tools = toolDefinitions.map(def => new DynamicStructuredTool(def));

  // Create agent
  const model = new ChatOpenAI({ model: 'gpt-4' });
  const agent = createReactAgent({ llm: model, tools });

  // Invoke
  const result = await agent.invoke({
    messages: [{ role: 'user', content: 'Find remedies for insomnia' }]
  });

  console.log('Agent result:', result);
  */

  client.destroy();
}

// =====================================================
// Example 5: Custom Integration with Tool Definitions
// =====================================================

import { toolDefinitions, getToolDefinition } from '../src/sdk/tools.js';
import { executeOOREPTool } from '../src/sdk/adapters/openai.js';

async function customIntegrationExample() {
  const client = createOOREPClient();

  // Get all tool definitions
  console.log('All tools:', toolDefinitions.map(t => t.name));

  // Get specific tool definition
  const searchTool = getToolDefinition('search_repertory');
  console.log('Search tool definition:', searchTool);

  // Execute tool directly
  const result = await executeOOREPTool(client, 'search_repertory', {
    symptom: 'fever',
    minWeight: 3
  });
  console.log('Direct tool execution result:', result);

  client.destroy();
}

// =====================================================
// Example 6: Error Handling
// =====================================================

import { OOREPError, ValidationError, NetworkError, TimeoutError } from '../src/sdk/index.js';

async function errorHandlingExample() {
  const client = createOOREPClient();

  try {
    // This will throw a validation error (symptom too short)
    await client.searchRepertory({ symptom: 'ab' });
  } catch (error) {
    if (error instanceof ValidationError) {
      console.log('Validation error:', error.message);
    } else if (error instanceof NetworkError) {
      console.log('Network error:', error.message, error.statusCode);
    } else if (error instanceof TimeoutError) {
      console.log('Timeout error:', error.message);
    } else if (error instanceof OOREPError) {
      console.log('OOREP error:', error.message);
    } else {
      console.log('Unknown error:', error);
    }
  }

  client.destroy();
}

// =====================================================
// Example 7: Using with Azure OpenAI
// =====================================================

async function azureOpenAIExample() {
  // Azure OpenAI uses the same tool format as OpenAI
  /*
  import { AzureOpenAI } from 'openai';

  const client = new AzureOpenAI({
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    apiVersion: '2024-02-15-preview'
  });

  const oorep = createOOREPClient();

  const response = await client.chat.completions.create({
    model: 'gpt-4',  // deployment name
    messages: [{ role: 'user', content: 'Find remedies for cough' }],
    tools: openAITools
  });

  const toolMessages = await processToolCalls(oorep, response.choices[0].message.tool_calls);
  */
}

// =====================================================
// Run Examples
// =====================================================

async function main() {
  console.log('=== Direct SDK Usage ===\n');
  await directUsageExample();

  console.log('\n=== OpenAI Integration ===\n');
  await openAIExample();

  console.log('\n=== Vercel AI SDK Integration ===\n');
  await vercelAIExample();

  console.log('\n=== LangChain Integration ===\n');
  await langchainExample();

  console.log('\n=== Custom Integration ===\n');
  await customIntegrationExample();

  console.log('\n=== Error Handling ===\n');
  await errorHandlingExample();
}

main().catch(console.error);

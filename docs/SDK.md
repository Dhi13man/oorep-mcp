# OOREP SDK Integration Guide

This guide covers programmatic use of OOREP tools with popular AI frameworks.

## Installation

```bash
npm install oorep-mcp
```

## Quick Start

```typescript
import { createOOREPClient } from 'oorep-mcp/sdk/client';

const client = createOOREPClient();
const results = await client.searchRepertory({ symptom: 'headache worse motion' });
console.log(results.rubrics);
client.destroy();
```

## SDK Client

### Configuration

```typescript
const client = createOOREPClient({
  baseUrl: 'https://www.oorep.com',  // OOREP API base URL
  timeoutMs: 30000,                   // Request timeout (ms)
  cacheTtlMs: 300000,                 // Cache TTL (ms, 0 to disable)
  defaultRepertory: 'publicum',       // Default repertory
  defaultMateriaMedica: 'boericke',   // Default materia medica
});
```

### Client Methods

```typescript
// Search repertory
const results = await client.searchRepertory({
  symptom: 'headache worse motion',
  repertory: 'kent',
  minWeight: 2,
  maxResults: 20,
  includeRemedyStats: true,
});

// Search materia medica
const mmResults = await client.searchMateriaMedica({
  symptom: 'anxiety',
  remedy: 'Aconite',
  maxResults: 5,
});

// Get remedy info
const remedy = await client.getRemedyInfo({ remedy: 'Belladonna' });

// List resources
const repertories = await client.listRepertories({ language: 'en' });
const materiaMedicas = await client.listMateriaMedicas();

// Always cleanup when done
client.destroy();
```

## Framework Adapters

### OpenAI

```typescript
import OpenAI from 'openai';
import { createOOREPClient } from 'oorep-mcp/sdk/client';
import { openAITools, processToolCalls } from 'oorep-mcp/sdk/openai';

const openai = new OpenAI();
const oorep = createOOREPClient();

try {
  const response = await openai.chat.completions.create({
    model: 'gpt-5-mini',
    messages: [{ role: 'user', content: 'Find remedies for throbbing headache' }],
    tools: openAITools,
  });

  const toolMessages = await processToolCalls(
    oorep,
    response.choices[0].message.tool_calls
  );

  if (toolMessages.length > 0) {
    const finalResponse = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        { role: 'user', content: 'Find remedies for throbbing headache' },
        response.choices[0].message,
        ...toolMessages,
      ],
    });
    console.log(finalResponse.choices[0].message.content);
  }
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
    model: openai('gpt-5-mini'),
    tools,
    maxSteps: 5,
    prompt: 'Find remedies for throbbing headache worse from motion',
  });

  console.log(result.text);

  for (const step of result.steps) {
    if (step.toolResults) {
      console.log('Tool results:', step.toolResults);
    }
  }
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

  const tools = toolDefinitions.map(
    (def) =>
      new DynamicStructuredTool({
        name: def.name,
        description: def.description,
        schema: def.schema,
        func: async (args) => def.func(args),
      })
  );

  const model = new ChatOpenAI({ model: 'gpt-5-mini' });
  const agent = createReactAgent({ llm: model, tools });

  const result = await agent.invoke({
    messages: [new HumanMessage('Find remedies for headache with nausea')],
  });

  const lastMessage = result.messages[result.messages.length - 1];
  console.log(lastMessage.content);
} finally {
  client.destroy();
}
```

### Google Gemini

```typescript
import { GoogleGenAI } from '@google/genai';
import { createOOREPClient } from 'oorep-mcp/sdk/client';
import {
  geminiTools,
  createGeminiToolExecutors,
  executeGeminiFunctionCall,
} from 'oorep-mcp/sdk/google-genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const client = createOOREPClient();
const executors = createGeminiToolExecutors(client);

try {
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: 'Search for homeopathic remedies for throbbing headache',
    config: { tools: geminiTools },
  });

  if (response.functionCalls && response.functionCalls.length > 0) {
    const functionCall = response.functionCalls[0];
    const result = await executeGeminiFunctionCall(executors, functionCall);
    console.log('Tool result:', result);

    // Continue conversation with multi-turn chat
    const chat = ai.chats.create({
      model: 'gemini-2.0-flash',
      config: { tools: geminiTools },
    });

    const finalResponse = await chat.sendMessage({
      role: 'user',
      parts: [
        { text: 'Search for homeopathic remedies for throbbing headache' },
        { functionResponse: { name: functionCall.name, response: result } },
      ],
    });

    console.log(finalResponse.text);
  }
} finally {
  client.destroy();
}
```

## Resources

The SDK provides access to MCP resources for rich context injection:

```typescript
import { createOOREPClient } from 'oorep-mcp/sdk/client';

const client = createOOREPClient();

// Get search syntax help (markdown) - great for system prompts
const searchHelp = await client.getSearchSyntaxHelp();
console.log(searchHelp); // Markdown guide for search syntax

// Get any resource by URI
const remedies = await client.getResource('oorep://remedies/list');
console.log(remedies.text); // JSON with 600+ remedies

// List all available resources
const resources = client.listResources();
// Returns: { uri, name, description, mimeType }[]

client.destroy();
```

### Available Resources

| URI | Description | MIME Type |
|-----|-------------|-----------|
| `oorep://remedies/list` | Complete list of 600+ homeopathic remedies | `application/json` |
| `oorep://repertories/list` | All available repertories with metadata | `application/json` |
| `oorep://materia-medicas/list` | All available materia medicas with metadata | `application/json` |
| `oorep://help/search-syntax` | Search syntax guide with examples | `text/markdown` |

### Using Resources for Better Search Accuracy

Inject the search syntax guide into your system prompt:

```typescript
const searchSyntax = await client.getSearchSyntaxHelp();

const systemPrompt = `You are a homeopathic analysis assistant.

${searchSyntax}

Use the search_repertory tool with the syntax rules above.`;
```

## Prompts

The SDK provides pre-built prompt workflows for common homeopathic analysis tasks:

```typescript
import { createOOREPClient } from 'oorep-mcp/sdk/client';

const client = createOOREPClient();

// Get the repertorization workflow (7-step process)
const workflow = await client.getPrompt('repertorization-workflow');
console.log(workflow.messages[0].content.text);
// Returns structured workflow with steps for case taking

// Analyze symptoms with optional initial description
const analysis = await client.getPrompt('analyze-symptoms', {
  symptom_description: 'throbbing headache worse from light',
});

// Compare multiple remedies
const comparison = await client.getPrompt('remedy-comparison', {
  remedies: 'Belladonna,Gelsemium,Bryonia',
});

// List all available prompts
const prompts = client.listPrompts();
// Returns: { name, description, arguments }[]

client.destroy();
```

### Available Prompts

| Prompt | Description | Arguments |
|--------|-------------|-----------|
| `analyze-symptoms` | Guided workflow for systematic symptom analysis | `symptom_description?` (optional initial symptom) |
| `remedy-comparison` | Compare 2-6 remedies side-by-side | `remedies` (comma-separated, required) |
| `repertorization-workflow` | 7-step case taking and repertorization | None |

### Prompt Message Format

Prompts return messages ready for LLM consumption:

```typescript
interface PromptResult {
  name: PromptName;
  description: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: { type: 'text'; text: string };
  }>;
}
```

### Using Prompts with AI SDKs

```typescript
// With OpenAI
const workflow = await client.getPrompt('repertorization-workflow');
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: workflow.messages.map(m => ({
    role: m.role,
    content: m.content.text,
  })),
  tools: openAITools,
});

// With Gemini
const analysis = await client.getPrompt('analyze-symptoms', {
  symptom_description: 'anxiety worse at night',
});
const response = await ai.models.generateContent({
  model: 'gemini-2.0-flash',
  contents: analysis.messages[0].content.text,
  config: { tools: geminiTools },
});
```

## Available Tools

All adapters provide these tools:

| Tool | Description |
|------|-------------|
| `search_repertory` | Search for symptoms in homeopathic repertories |
| `search_materia_medica` | Search materia medica texts for remedy descriptions |
| `get_remedy_info` | Get detailed information about a specific remedy |
| `list_available_repertories` | List all accessible repertories |
| `list_available_materia_medicas` | List all accessible materia medicas |

## Adapter Comparison

| Adapter | Format | Execution Helper |
|---------|--------|------------------|
| **OpenAI** | `{ type: 'function', function: {...} }` | `processToolCalls()` |
| **Vercel AI** | Zod schemas with `execute` function | Built-in |
| **LangChain** | `DynamicStructuredTool` compatible | `func()` |
| **Google Gemini** | `{ parametersJsonSchema: {...} }` | `executeGeminiFunctionCall()` |

## TypeScript Types

```typescript
import type {
  // Tool argument types
  SearchRepertoryArgs,
  SearchMateriaMedicaArgs,
  GetRemedyInfoArgs,
  ListRepertoriesArgs,
  ListMateriaMedicasArgs,

  // Result types
  RepertorySearchResult,
  MateriaMedicaSearchResult,
  RemedyInfo,
  RepertoryMetadata,
  MateriaMedicaMetadata,

  // Supporting types
  Rubric,
  Remedy,
  MateriaMedicaResult,
  MateriaMedicaSection,

  // Resource types
  ResourceUri,
  ResourceContent,

  // Prompt types
  PromptName,
  PromptMessage,
  PromptResult,
  AnalyzeSymptomsArgs,
  RemedyComparisonArgs,
} from 'oorep-mcp/sdk/client';

import type { OOREPSDKClient, OOREPSDKConfig } from 'oorep-mcp/sdk/client';
```

## Schema Validation

Import Zod schemas for runtime validation:

```typescript
import {
  SearchRepertoryArgsSchema,
  RepertorySearchResultSchema,
  RemedyInfoSchema,
} from 'oorep-mcp';

const validated = SearchRepertoryArgsSchema.parse(untrustedInput);
```

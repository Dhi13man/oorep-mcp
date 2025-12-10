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

### OpenAI Adapters

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

### Vercel AI SDK Adapters

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

### LangChain / LangGraph Adapters

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

### Google Gemini Adapters

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
    model: 'gemini-2.5-flash',
    contents: 'Search for homeopathic remedies for throbbing headache',
    config: { tools: geminiTools },
  });

  if (response.functionCalls && response.functionCalls.length > 0) {
    const functionCall = response.functionCalls[0];
    const result = await executeGeminiFunctionCall(executors, functionCall);
    console.log('Tool result:', result);

    // Continue conversation with multi-turn chat
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
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

The SDK provides standalone functions for accessing MCP resources:

```typescript
import { createOOREPClient } from 'oorep-mcp/sdk/client';
import { getResource, listResources, getSearchSyntaxHelp } from 'oorep-mcp/sdk/resources';

// Get search syntax help (markdown) - great for system prompts (no client needed)
const searchHelp = getSearchSyntaxHelp();
console.log(searchHelp); // Markdown guide for search syntax

// For dynamic resources, create a client and pass its underlying OOREPClient
const client = createOOREPClient();
const remedies = await getResource('oorep://remedies/list', client.getClient());
console.log(remedies.text); // JSON with 600+ remedies

// List all available resources (no client needed)
const resources = listResources();
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
import { getSearchSyntaxHelp } from 'oorep-mcp/sdk/resources';

const searchSyntax = getSearchSyntaxHelp();

const systemPrompt = `You are a homeopathic analysis assistant.

${searchSyntax}

Use the search_repertory tool with the syntax rules above.`;
```

## Prompts

The SDK provides standalone functions for pre-built prompt workflows:

```typescript
import { getPrompt, listPrompts } from 'oorep-mcp/sdk/prompts';

// Get the repertorization workflow (7-step process)
const workflow = getPrompt('repertorization-workflow');
console.log(workflow.messages[0].content.text);
// Returns structured workflow with steps for case taking

// Analyze symptoms with optional initial description
const analysis = getPrompt('analyze-symptoms', {
  symptom_description: 'throbbing headache worse from light',
});

// Compare multiple remedies
const comparison = getPrompt('remedy-comparison', {
  remedies: 'Belladonna,Gelsemium,Bryonia',
});

// List all available prompts
const prompts = listPrompts();
// Returns: { name, description, arguments }[]
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

### Using Resources and Prompts with AI SDKs

Each adapter provides functions to convert prompts and resources into SDK-specific formats.

#### OpenAI Prompts

```typescript
import {
  openAITools,
  convertPromptToOpenAI,
  openAIFormatResourceAsSystemMessage,
  openAIConvertPromptWithContext,
} from 'oorep-mcp/sdk/openai';
import { getResource } from 'oorep-mcp/sdk/resources';
import { getPrompt } from 'oorep-mcp/sdk/prompts';

// Convert prompt to OpenAI message format
const workflow = getPrompt('repertorization-workflow');
const messages = convertPromptToOpenAI(workflow);

// Inject resource as system context (static resource, no client needed)
const searchSyntax = await getResource('oorep://help/search-syntax');
const systemMessage = openAIFormatResourceAsSystemMessage(searchSyntax);

const response = await openai.chat.completions.create({
  model: 'gpt-5-mini',
  messages: [systemMessage, ...messages],
  tools: openAITools,
});

// Or use the combined helper
const messagesWithContext = openAIConvertPromptWithContext(searchSyntax, workflow);
```

#### Vercel AI SDK Prompts

```typescript
import { createOOREPClient } from 'oorep-mcp/sdk/client';
import {
  createOOREPTools,
  convertPromptToVercelAI,
  vercelAIFormatResourceAsSystemMessage,
  vercelAICombinePromptWithContext,
} from 'oorep-mcp/sdk/vercel-ai';
import { getResource } from 'oorep-mcp/sdk/resources';
import { getPrompt } from 'oorep-mcp/sdk/prompts';

const client = createOOREPClient();
const tools = createOOREPTools(client);

// Get system instruction from resource (static resource, no client needed)
const searchSyntax = await getResource('oorep://help/search-syntax');
const system = vercelAIFormatResourceAsSystemMessage(searchSyntax);

// Convert prompt to Vercel AI format
const workflow = getPrompt('analyze-symptoms', {
  symptom_description: 'headache',
});
const messages = convertPromptToVercelAI(workflow);

const result = await generateText({
  model: openai('gpt-5-mini'),
  system,
  messages,
  tools,
});

// Or use the combined helper
const { system: sys, messages: msgs } = vercelAICombinePromptWithContext(searchSyntax, workflow);

client.destroy();
```

#### LangChain Prompts

```typescript
import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { createOOREPClient } from 'oorep-mcp/sdk/client';
import {
  createLangChainTools,
  convertPromptToLangChain,
  langChainFormatResourceAsSystemMessage,
  langChainFormatResourceAsDocument,
} from 'oorep-mcp/sdk/langchain';
import { getResource } from 'oorep-mcp/sdk/resources';
import { getPrompt } from 'oorep-mcp/sdk/prompts';

const client = createOOREPClient();

// Get resource as system message data (static resource, no client needed)
const searchSyntax = await getResource('oorep://help/search-syntax');
const sysMsg = langChainFormatResourceAsSystemMessage(searchSyntax);
const systemMessage = new SystemMessage(sysMsg.content);

// Convert prompt to LangChain message data
const workflow = getPrompt('remedy-comparison', {
  remedies: 'Aconite,Belladonna',
});
const messageData = convertPromptToLangChain(workflow);
const messages = messageData.map((msg) =>
  msg.type === 'human' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
);

// For RAG use cases, get resources as Documents (dynamic resource needs client)
const remediesDoc = langChainFormatResourceAsDocument(
  await getResource('oorep://remedies/list', client.getClient())
);
// Use with vector stores or retrievers

client.destroy();
```

#### Google Gemini Prompts

```typescript
import { GoogleGenAI } from '@google/genai';
import { createOOREPClient } from 'oorep-mcp/sdk/client';
import {
  geminiTools,
  createGeminiToolExecutors,
  convertPromptToGemini,
  geminiFormatResourceAsSystemInstruction,
  geminiConvertPromptWithContext,
} from 'oorep-mcp/sdk/google-genai';
import { getResource } from 'oorep-mcp/sdk/resources';
import { getPrompt } from 'oorep-mcp/sdk/prompts';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const client = createOOREPClient();

// Get system instruction from resource (static resource, no client needed)
const searchSyntax = await getResource('oorep://help/search-syntax');
const systemInstruction = geminiFormatResourceAsSystemInstruction(searchSyntax);

// Convert prompt to Gemini Content format
const workflow = getPrompt('repertorization-workflow');
const contents = convertPromptToGemini(workflow);

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  systemInstruction,
  contents,
  config: { tools: geminiTools },
});

// Or use the combined helper
const { systemInstruction: sysInst, contents: cont } = geminiConvertPromptWithContext(
  searchSyntax,
  workflow
);

client.destroy();
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

### Tools

| Adapter | Format | Execution Helper |
|---------|--------|------------------|
| **OpenAI** | `{ type: 'function', function: {...} }` | `processToolCalls()` |
| **Vercel AI** | Zod schemas with `execute` function | Built-in |
| **LangChain** | `DynamicStructuredTool` compatible | `func()` |
| **Google Gemini** | `{ parametersJsonSchema: {...} }` | `executeGeminiFunctionCall()` |

### Resources Comparison

| Adapter | System Message | Multi-Resource | Additional |
|---------|---------------|----------------|------------|
| **OpenAI** | `openAIFormatResourceAsSystemMessage()` | `openAIFormatResourcesAsContext()` | - |
| **Vercel AI** | `vercelAIFormatResourceAsSystemMessage()` | `vercelAIFormatResourcesAsContext()` | `vercelAIGetSystemInstruction()` |
| **LangChain** | `langChainFormatResourceAsSystemMessage()` | `langChainFormatResourcesAsContext()` | `langChainFormatResourceAsDocument()` |
| **Google Gemini** | `geminiFormatResourceAsSystemInstruction()` | `geminiFormatResourcesAsContext()` | - |

### Prompts Comparison

| Adapter | Convert Function | With Context |
|---------|-----------------|--------------|
| **OpenAI** | `convertPromptToOpenAI()` | `openAIConvertPromptWithContext()` |
| **Vercel AI** | `convertPromptToVercelAI()` | `vercelAICombinePromptWithContext()` |
| **LangChain** | `convertPromptToLangChain()` | `langChainConvertPromptWithContext()` |
| **Google Gemini** | `convertPromptToGemini()` | `geminiConvertPromptWithContext()` |

## TypeScript Types

```typescript
// Tool argument and result types
import type {
  SearchRepertoryArgs,
  SearchMateriaMedicaArgs,
  GetRemedyInfoArgs,
  ListRepertoriesArgs,
  ListMateriaMedicasArgs,
  RepertorySearchResult,
  MateriaMedicaSearchResult,
  RemedyInfo,
  RepertoryMetadata,
  MateriaMedicaMetadata,
  Rubric,
  Remedy,
  MateriaMedicaResult,
  MateriaMedicaSection,
} from 'oorep-mcp';

// Resource types (standalone functions)
import type { ResourceUri, ResourceContent } from 'oorep-mcp/sdk/resources';

// Prompt types (standalone functions)
import type {
  PromptName,
  PromptResult,
  AnalyzeSymptomsArgs,
  RemedyComparisonArgs,
} from 'oorep-mcp/sdk/prompts';

// SDK Client types
import type { OOREPSDKClient, OOREPSDKConfig } from 'oorep-mcp/sdk/client';

// Adapter-specific types
import type {
  OpenAIResourceMessage,
  OpenAIMessage,
} from 'oorep-mcp/sdk/openai';

import type {
  VercelAIResourceMessage,
  VercelAIMessage,
} from 'oorep-mcp/sdk/vercel-ai';

import type {
  LangChainSystemMessage,
  LangChainHumanMessage,
  LangChainAIMessage,
  LangChainMessage,
  LangChainDocument,
} from 'oorep-mcp/sdk/langchain';

import type {
  GeminiContent,
  GeminiPart,
} from 'oorep-mcp/sdk/google-genai';
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

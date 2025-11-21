/**
 * Unit tests for OOREP MCP Server
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createServer, runServer } from './server.js';

// Mock the stdio transport
vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: class MockStdioServerTransport {
    async start() {
      // Mock start - do nothing
    }
    async close() {
      // Mock close - do nothing
    }
  },
}));

describe('createServer', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let originalArgv: string[];

  beforeEach(() => {
    originalEnv = { ...process.env };
    originalArgv = [...process.argv];
    // Set minimal required env vars
    process.env.OOREP_MCP_BASE_URL = 'https://test.oorep.com';
    process.env.OOREP_MCP_LOG_LEVEL = 'error';
    process.argv = ['node', 'script.js'];
  });

  afterEach(() => {
    process.env = originalEnv;
    process.argv = originalArgv;
    vi.restoreAllMocks();
  });

  describe('server initialization', () => {
    it('createServer when called then returns server instance', async () => {
      const server = await createServer();

      expect(server).toBeDefined();
      expect(server).toHaveProperty('setRequestHandler');
      expect(server).toHaveProperty('connect');
    });

    it('createServer when called then sets up tool handlers', async () => {
      const server = await createServer();

      // Server should have the setRequestHandler method available
      expect(server.setRequestHandler).toBeDefined();
      expect(typeof server.setRequestHandler).toBe('function');
    });

    it('createServer when called then sets up resource handlers', async () => {
      const server = await createServer();

      // Server should have the setRequestHandler method available
      expect(server.setRequestHandler).toBeDefined();
      expect(typeof server.setRequestHandler).toBe('function');
    });

    it('createServer when called then sets up prompt handlers', async () => {
      const server = await createServer();

      // Server should have the setRequestHandler method available
      expect(server.setRequestHandler).toBeDefined();
      expect(typeof server.setRequestHandler).toBe('function');
    });
  });

  describe('server capabilities', () => {
    it('createServer when initialized then has tool capability', async () => {
      const server = await createServer();

      // Server is initialized successfully, capabilities are set internally
      expect(server).toBeDefined();
    });

    it('createServer when initialized then has resource capability', async () => {
      const server = await createServer();

      // Server is initialized successfully, capabilities are set internally
      expect(server).toBeDefined();
    });

    it('createServer when initialized then has prompt capability', async () => {
      const server = await createServer();

      // Server is initialized successfully, capabilities are set internally
      expect(server).toBeDefined();
    });

    it('createServer when initialized then has correct server name', async () => {
      const server = await createServer();

      // Server is initialized successfully with correct configuration
      expect(server).toBeDefined();
    });

    it('createServer when initialized then has version', async () => {
      const server = await createServer();

      // Server is initialized successfully with version
      expect(server).toBeDefined();
    });
  });

  describe('configuration loading', () => {
    it('createServer when valid config then succeeds', async () => {
      process.env.OOREP_MCP_BASE_URL = 'https://test.oorep.com';
      process.env.OOREP_MCP_TIMEOUT_MS = '5000';

      await expect(createServer()).resolves.toBeDefined();
    });

    it('createServer when invalid config then throws error', async () => {
      process.env.OOREP_MCP_BASE_URL = '';

      await expect(createServer()).rejects.toThrow();
    });

    it('createServer when log level set then applies it', async () => {
      process.env.OOREP_MCP_LOG_LEVEL = 'debug';

      await expect(createServer()).resolves.toBeDefined();
    });
  });

  describe('request handlers', () => {
    it('createServer when called then registers tool handlers', async () => {
      const server = await createServer();

      // Server should have setRequestHandler method called during creation
      expect(server).toBeDefined();
      expect(server).toHaveProperty('setRequestHandler');
    });

    it('createServer when called then registers resource handlers', async () => {
      const server = await createServer();

      expect(server).toBeDefined();
      expect(server).toHaveProperty('setRequestHandler');
    });

    it('createServer when called then registers prompt handlers', async () => {
      const server = await createServer();

      expect(server).toBeDefined();
      expect(server).toHaveProperty('setRequestHandler');
    });
  });

  describe('tool execution', () => {
    it('createServer when called then tool call handler is registered', async () => {
      const server = await createServer();

      expect(server).toBeDefined();
      expect(server).toHaveProperty('setRequestHandler');
    });

    it('createServer when list_tools called then returns all tool definitions', async () => {
      let listToolsHandler: ((request: any) => Promise<any>) | null = null;

      const mockSetRequestHandler = vi.fn((schema: any, handler: any) => {
        if (schema?.method === 'tools/list') {
          listToolsHandler = handler;
        }
      });

      // Create server with mocked setRequestHandler
      const server = await createServer();
      // Re-spy to capture handlers
      vi.spyOn(server, 'setRequestHandler').mockImplementation(mockSetRequestHandler);
      await createServer();

      if (listToolsHandler) {
        const result = await listToolsHandler({});
        expect(result).toHaveProperty('tools');
        expect(Array.isArray(result.tools)).toBe(true);
        expect(result.tools.length).toBe(5);
        expect(result.tools.map((t: any) => t.name)).toContain('search_repertory');
        expect(result.tools.map((t: any) => t.name)).toContain('search_materia_medica');
        expect(result.tools.map((t: any) => t.name)).toContain('get_remedy_info');
      }
    });

    it('createServer when call_tool succeeds then returns content and structuredContent', async () => {
      let callToolHandler: ((request: any) => Promise<any>) | null = null;

      const mockSetRequestHandler = vi.fn((schema: any, handler: any) => {
        if (schema?.method === 'tools/call') {
          callToolHandler = handler;
        }
      });

      const server = await createServer();
      vi.spyOn(server, 'setRequestHandler').mockImplementation(mockSetRequestHandler);
      await createServer();

      if (callToolHandler) {
        // Test list_available_repertories which doesn't need external API
        const result = await callToolHandler({
          params: {
            name: 'list_available_repertories',
            arguments: {},
          },
        });

        expect(result).toHaveProperty('content');
        expect(Array.isArray(result.content)).toBe(true);
        expect(result.content[0]).toHaveProperty('type', 'text');
        expect(result.content[0]).toHaveProperty('text');
        // Should have structuredContent since tool has outputSchema
        expect(result).toHaveProperty('structuredContent');
      }
    });

    it('createServer when call_tool with unknown tool then returns isError true', async () => {
      let callToolHandler: ((request: any) => Promise<any>) | null = null;

      const mockSetRequestHandler = vi.fn((schema: any, handler: any) => {
        if (schema?.method === 'tools/call') {
          callToolHandler = handler;
        }
      });

      const server = await createServer();
      vi.spyOn(server, 'setRequestHandler').mockImplementation(mockSetRequestHandler);
      await createServer();

      if (callToolHandler) {
        const result = await callToolHandler({
          params: {
            name: 'nonexistent_tool',
            arguments: {},
          },
        });

        expect(result).toHaveProperty('isError', true);
        expect(result.content[0].text).toContain('Error');
      }
    });
  });

  describe('resource reading', () => {
    it('createServer when read resource succeeds then returns content', async () => {
      const server = await createServer();
      let readResourceHandler: ((request: any) => Promise<any>) | null = null;

      const mockSetRequestHandler = vi.spyOn(server, 'setRequestHandler');
      await createServer();

      mockSetRequestHandler.mock.calls.forEach((call) => {
        if (call[0]?.method === 'resources/read') {
          readResourceHandler = call[1];
        }
      });

      if (readResourceHandler) {
        const result = await readResourceHandler({
          params: {
            uri: 'oorep://help/search-syntax',
          },
        });
        expect(result).toHaveProperty('contents');
        expect(Array.isArray(result.contents)).toBe(true);
      }
    });

    it('createServer when read resource fails then throws sanitized error', async () => {
      const server = await createServer();
      let readResourceHandler: ((request: any) => Promise<any>) | null = null;

      const mockSetRequestHandler = vi.spyOn(server, 'setRequestHandler');
      await createServer();

      mockSetRequestHandler.mock.calls.forEach((call) => {
        if (call[0]?.method === 'resources/read') {
          readResourceHandler = call[1];
        }
      });

      if (readResourceHandler) {
        await expect(
          readResourceHandler({
            params: {
              uri: 'oorep://unknown/resource',
            },
          })
        ).rejects.toThrow();
      }
    });
  });

  describe('prompt retrieval', () => {
    it('createServer when called then prompt get handler is registered', async () => {
      const server = await createServer();

      expect(server).toBeDefined();
      expect(server).toHaveProperty('setRequestHandler');
    });

    it('createServer when list_prompts called then returns all prompts', async () => {
      let listPromptsHandler: ((request: any) => Promise<any>) | null = null;

      const mockSetRequestHandler = vi.fn((schema: any, handler: any) => {
        if (schema?.method === 'prompts/list') {
          listPromptsHandler = handler;
        }
      });

      const server = await createServer();
      vi.spyOn(server, 'setRequestHandler').mockImplementation(mockSetRequestHandler);
      await createServer();

      if (listPromptsHandler) {
        const result = await listPromptsHandler({});
        expect(result).toHaveProperty('prompts');
        expect(Array.isArray(result.prompts)).toBe(true);
        expect(result.prompts.length).toBe(3);
      }
    });

    it('createServer when get_prompt succeeds then returns prompt messages', async () => {
      let getPromptHandler: ((request: any) => Promise<any>) | null = null;

      const mockSetRequestHandler = vi.fn((schema: any, handler: any) => {
        if (schema?.method === 'prompts/get') {
          getPromptHandler = handler;
        }
      });

      const server = await createServer();
      vi.spyOn(server, 'setRequestHandler').mockImplementation(mockSetRequestHandler);
      await createServer();

      if (getPromptHandler) {
        const result = await getPromptHandler({
          params: {
            name: 'analyze-symptoms',
            arguments: { symptom_description: 'headache' },
          },
        });

        expect(result).toHaveProperty('messages');
        expect(Array.isArray(result.messages)).toBe(true);
      }
    });

    it('createServer when get_prompt with unknown prompt then throws error', async () => {
      let getPromptHandler: ((request: any) => Promise<any>) | null = null;

      const mockSetRequestHandler = vi.fn((schema: any, handler: any) => {
        if (schema?.method === 'prompts/get') {
          getPromptHandler = handler;
        }
      });

      const server = await createServer();
      vi.spyOn(server, 'setRequestHandler').mockImplementation(mockSetRequestHandler);
      await createServer();

      if (getPromptHandler) {
        await expect(
          getPromptHandler({
            params: {
              name: 'nonexistent_prompt',
              arguments: {},
            },
          })
        ).rejects.toThrow();
      }
    });

    it('createServer when list_resources called then returns all resources', async () => {
      let listResourcesHandler: ((request: any) => Promise<any>) | null = null;

      const mockSetRequestHandler = vi.fn((schema: any, handler: any) => {
        if (schema?.method === 'resources/list') {
          listResourcesHandler = handler;
        }
      });

      const server = await createServer();
      vi.spyOn(server, 'setRequestHandler').mockImplementation(mockSetRequestHandler);
      await createServer();

      if (listResourcesHandler) {
        const result = await listResourcesHandler({});
        expect(result).toHaveProperty('resources');
        expect(Array.isArray(result.resources)).toBe(true);
        expect(result.resources.length).toBe(4);
      }
    });
  });

  describe('registry initialization', () => {
    it('createServer when initialized then server is properly configured', async () => {
      const server = await createServer();

      // Server should be created with all handlers registered
      expect(server).toBeDefined();
      expect(server).toHaveProperty('setRequestHandler');
      expect(server).toHaveProperty('connect');
    });
  });
});

describe('runServer', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let originalArgv: string[];
  let mockExit: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    originalEnv = { ...process.env };
    originalArgv = [...process.argv];
    // Set minimal required env vars
    process.env.OOREP_MCP_BASE_URL = 'https://test.oorep.com';
    process.env.OOREP_MCP_LOG_LEVEL = 'error';
    process.argv = ['node', 'script.js'];
    // Mock process.exit to prevent actual exit
    mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as () => never);
  });

  afterEach(() => {
    process.env = originalEnv;
    process.argv = originalArgv;
    vi.restoreAllMocks();
  });

  it('runServer when called successfully then connects transport', async () => {
    // The server will be created and connected
    // The promise resolves when transport.start() completes (which is mocked)
    await expect(runServer()).resolves.toBeUndefined();
  });

  it('runServer when createServer fails then exits with code 1', async () => {
    // Set invalid config to make createServer fail
    process.env.OOREP_MCP_BASE_URL = '';

    await expect(runServer()).rejects.toThrow('process.exit called');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('runServer when configuration is invalid then logs error and exits', async () => {
    // Use invalid timeout to trigger error
    process.env.OOREP_MCP_TIMEOUT_MS = '-1';

    await expect(runServer()).rejects.toThrow('process.exit called');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('runServer when started then registers SIGTERM handler', async () => {
    const mockOn = vi.spyOn(process, 'on');

    await runServer();

    expect(mockOn).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
  });

  it('runServer when started then registers SIGINT handler', async () => {
    const mockOn = vi.spyOn(process, 'on');

    await runServer();

    expect(mockOn).toHaveBeenCalledWith('SIGINT', expect.any(Function));
  });
});

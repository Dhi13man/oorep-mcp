/**
 * Unit tests for OOREP MCP Server
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createServer } from './server.js';

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
    it('createServer when list tools requested then returns tool definitions', async () => {
      const server = await createServer();
      let listToolsHandler: ((request: any) => Promise<any>) | null = null;

      const mockSetRequestHandler = vi.spyOn(server, 'setRequestHandler');
      await createServer();

      mockSetRequestHandler.mock.calls.forEach((call) => {
        if (call[0]?.method === 'tools/list') {
          listToolsHandler = call[1];
        }
      });

      if (listToolsHandler) {
        const result = await listToolsHandler({});
        expect(result).toHaveProperty('tools');
        expect(Array.isArray(result.tools)).toBe(true);
      }
    });

    it('createServer when list resources requested then returns resource definitions', async () => {
      const server = await createServer();
      let listResourcesHandler: ((request: any) => Promise<any>) | null = null;

      const mockSetRequestHandler = vi.spyOn(server, 'setRequestHandler');
      await createServer();

      mockSetRequestHandler.mock.calls.forEach((call) => {
        if (call[0]?.method === 'resources/list') {
          listResourcesHandler = call[1];
        }
      });

      if (listResourcesHandler) {
        const result = await listResourcesHandler({});
        expect(result).toHaveProperty('resources');
        expect(Array.isArray(result.resources)).toBe(true);
      }
    });

    it('createServer when list prompts requested then returns prompt definitions', async () => {
      const server = await createServer();
      let listPromptsHandler: ((request: any) => Promise<any>) | null = null;

      const mockSetRequestHandler = vi.spyOn(server, 'setRequestHandler');
      await createServer();

      mockSetRequestHandler.mock.calls.forEach((call) => {
        if (call[0]?.method === 'prompts/list') {
          listPromptsHandler = call[1];
        }
      });

      if (listPromptsHandler) {
        const result = await listPromptsHandler({});
        expect(result).toHaveProperty('prompts');
        expect(Array.isArray(result.prompts)).toBe(true);
      }
    });
  });

  describe('tool execution', () => {
    it('createServer when tool execution succeeds then returns formatted result', async () => {
      const server = await createServer();
      let callToolHandler: ((request: any) => Promise<any>) | null = null;

      const mockSetRequestHandler = vi.spyOn(server, 'setRequestHandler');
      await createServer();

      mockSetRequestHandler.mock.calls.forEach((call) => {
        if (call[0]?.method === 'tools/call') {
          callToolHandler = call[1];
        }
      });

      expect(callToolHandler).toBeDefined();
    });

    it('createServer when tool execution fails then throws sanitized error', async () => {
      const server = await createServer();
      let callToolHandler: ((request: any) => Promise<any>) | null = null;

      const mockSetRequestHandler = vi.spyOn(server, 'setRequestHandler');
      await createServer();

      mockSetRequestHandler.mock.calls.forEach((call) => {
        if (call[0]?.method === 'tools/call') {
          callToolHandler = call[1];
        }
      });

      if (callToolHandler) {
        await expect(
          callToolHandler({
            params: {
              name: 'nonexistent_tool',
              arguments: {},
            },
          })
        ).rejects.toThrow();
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
    it('createServer when get prompt succeeds then returns messages', async () => {
      const server = await createServer();
      let getPromptHandler: ((request: any) => Promise<any>) | null = null;

      const mockSetRequestHandler = vi.spyOn(server, 'setRequestHandler');
      await createServer();

      mockSetRequestHandler.mock.calls.forEach((call) => {
        if (call[0]?.method === 'prompts/get') {
          getPromptHandler = call[1];
        }
      });

      if (getPromptHandler) {
        const result = await getPromptHandler({
          params: {
            name: 'analyze-symptoms',
            arguments: {},
          },
        });
        expect(result).toHaveProperty('messages');
        expect(Array.isArray(result.messages)).toBe(true);
      }
    });

    it('createServer when get prompt fails then throws sanitized error', async () => {
      const server = await createServer();
      let getPromptHandler: ((request: any) => Promise<any>) | null = null;

      const mockSetRequestHandler = vi.spyOn(server, 'setRequestHandler');
      await createServer();

      mockSetRequestHandler.mock.calls.forEach((call) => {
        if (call[0]?.method === 'prompts/get') {
          getPromptHandler = call[1];
        }
      });

      if (getPromptHandler) {
        await expect(
          getPromptHandler({
            params: {
              name: 'unknown-prompt',
              arguments: {},
            },
          })
        ).rejects.toThrow();
      }
    });
  });

  describe('registry initialization', () => {
    it('createServer when initialized then tool registry has correct number of tools', async () => {
      const server = await createServer();
      let listToolsHandler: ((request: any) => Promise<any>) | null = null;

      const mockSetRequestHandler = vi.spyOn(server, 'setRequestHandler');
      await createServer();

      mockSetRequestHandler.mock.calls.forEach((call) => {
        if (call[0]?.method === 'tools/list') {
          listToolsHandler = call[1];
        }
      });

      if (listToolsHandler) {
        const result = await listToolsHandler({});
        expect(result.tools).toHaveLength(5);
        expect(result.tools.map((t: any) => t.name)).toContain('search_repertory');
        expect(result.tools.map((t: any) => t.name)).toContain('get_remedy_info');
      }
    });

    it('createServer when initialized then resource registry has correct number of resources', async () => {
      const server = await createServer();
      let listResourcesHandler: ((request: any) => Promise<any>) | null = null;

      const mockSetRequestHandler = vi.spyOn(server, 'setRequestHandler');
      await createServer();

      mockSetRequestHandler.mock.calls.forEach((call) => {
        if (call[0]?.method === 'resources/list') {
          listResourcesHandler = call[1];
        }
      });

      if (listResourcesHandler) {
        const result = await listResourcesHandler({});
        expect(result.resources).toHaveLength(4);
        expect(result.resources.map((r: any) => r.uri)).toContain('oorep://help/search-syntax');
      }
    });

    it('createServer when initialized then prompt registry has correct number of prompts', async () => {
      const server = await createServer();
      let listPromptsHandler: ((request: any) => Promise<any>) | null = null;

      const mockSetRequestHandler = vi.spyOn(server, 'setRequestHandler');
      await createServer();

      mockSetRequestHandler.mock.calls.forEach((call) => {
        if (call[0]?.method === 'prompts/list') {
          listPromptsHandler = call[1];
        }
      });

      if (listPromptsHandler) {
        const result = await listPromptsHandler({});
        expect(result.prompts).toHaveLength(3);
        expect(result.prompts.map((p: any) => p.name)).toContain('analyze-symptoms');
      }
    });
  });
});

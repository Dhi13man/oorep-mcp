/**
 * Unit tests for configuration management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getConfig } from './config.js';

describe('getConfig', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let originalArgv: string[];

  beforeEach(() => {
    originalEnv = { ...process.env };
    originalArgv = [...process.argv];
    // Clear all OOREP env vars
    delete process.env.OOREP_MCP_BASE_URL;
    delete process.env.OOREP_MCP_TIMEOUT_MS;
    delete process.env.OOREP_MCP_CACHE_TTL_MS;
    delete process.env.OOREP_MCP_MAX_RESULTS;
    delete process.env.OOREP_MCP_LOG_LEVEL;
    delete process.env.OOREP_MCP_DEFAULT_REPERTORY;
    delete process.env.OOREP_MCP_DEFAULT_MATERIA_MEDICA;
    process.argv = ['node', 'script.js'];
  });

  afterEach(() => {
    process.env = originalEnv;
    process.argv = originalArgv;
    vi.restoreAllMocks();
  });

  describe('when using default values', () => {
    it('getConfig when no env vars or args then returns defaults', () => {
      const config = getConfig();

      expect(config.baseUrl).toBe('https://www.oorep.com');
      expect(config.timeoutMs).toBe(30000);
      expect(config.cacheTtlMs).toBe(300000);
      expect(config.maxResults).toBe(100);
      expect(config.logLevel).toBe('info');
      expect(config.defaultRepertory).toBe('publicum');
      expect(config.defaultMateriaMedica).toBe('boericke');
    });
  });

  describe('when using environment variables', () => {
    it('getConfig when env vars set then uses env values', () => {
      process.env.OOREP_MCP_BASE_URL = 'https://custom.oorep.com';
      process.env.OOREP_MCP_TIMEOUT_MS = '60000';
      process.env.OOREP_MCP_CACHE_TTL_MS = '600000';
      process.env.OOREP_MCP_MAX_RESULTS = '200';
      process.env.OOREP_MCP_LOG_LEVEL = 'debug';
      process.env.OOREP_MCP_DEFAULT_REPERTORY = 'kent';
      process.env.OOREP_MCP_DEFAULT_MATERIA_MEDICA = 'hering';

      const config = getConfig();

      expect(config.baseUrl).toBe('https://custom.oorep.com');
      expect(config.timeoutMs).toBe(60000);
      expect(config.cacheTtlMs).toBe(600000);
      expect(config.maxResults).toBe(200);
      expect(config.logLevel).toBe('debug');
      expect(config.defaultRepertory).toBe('kent');
      expect(config.defaultMateriaMedica).toBe('hering');
    });
  });

  describe('when using CLI arguments', () => {
    it('getConfig when --base-url provided then overrides default', () => {
      process.argv = ['node', 'script.js', '--base-url', 'https://cli.oorep.com'];

      const config = getConfig();

      expect(config.baseUrl).toBe('https://cli.oorep.com');
    });

    it('getConfig when --timeout provided then overrides default', () => {
      process.argv = ['node', 'script.js', '--timeout', '45000'];

      const config = getConfig();

      expect(config.timeoutMs).toBe(45000);
    });

    it('getConfig when --cache-ttl provided then overrides default', () => {
      process.argv = ['node', 'script.js', '--cache-ttl', '120000'];

      const config = getConfig();

      expect(config.cacheTtlMs).toBe(120000);
    });

    it('getConfig when --max-results provided then overrides default', () => {
      process.argv = ['node', 'script.js', '--max-results', '50'];

      const config = getConfig();

      expect(config.maxResults).toBe(50);
    });

    it('getConfig when --log-level provided then overrides default', () => {
      process.argv = ['node', 'script.js', '--log-level', 'warn'];

      const config = getConfig();

      expect(config.logLevel).toBe('warn');
    });

    it('getConfig when CLI args and env vars both set then CLI args take precedence', () => {
      process.env.OOREP_MCP_TIMEOUT_MS = '30000';
      process.argv = ['node', 'script.js', '--timeout', '60000'];

      const config = getConfig();

      expect(config.timeoutMs).toBe(60000);
    });

    it('getConfig when multiple CLI args then parses all correctly', () => {
      process.argv = [
        'node',
        'script.js',
        '--timeout',
        '45000',
        '--cache-ttl',
        '600000',
        '--max-results',
        '75',
        '--log-level',
        'debug',
      ];

      const config = getConfig();

      expect(config.timeoutMs).toBe(45000);
      expect(config.cacheTtlMs).toBe(600000);
      expect(config.maxResults).toBe(75);
      expect(config.logLevel).toBe('debug');
    });
  });

  describe('when CLI argument is missing value', () => {
    it.each([
      ['--base-url'],
      ['--timeout'],
      ['--cache-ttl'],
      ['--max-results'],
      ['--log-level'],
    ])('getConfig when %s has no value then throws error', (arg: string) => {
      process.argv = ['node', 'script.js', arg];

      expect(() => getConfig()).toThrow();
    });
  });

  describe('when CLI argument has invalid numeric value', () => {
    it('getConfig when --timeout is not a number then throws error', () => {
      process.argv = ['node', 'script.js', '--timeout', 'invalid'];

      expect(() => getConfig()).toThrow();
    });

    it('getConfig when --timeout is NaN then throws error', () => {
      process.argv = ['node', 'script.js', '--timeout', 'NaN'];

      expect(() => getConfig()).toThrow();
    });

    it('getConfig when --cache-ttl is not a number then throws error', () => {
      process.argv = ['node', 'script.js', '--cache-ttl', 'abc'];

      expect(() => getConfig()).toThrow();
    });

    it('getConfig when --max-results is not a number then throws error', () => {
      process.argv = ['node', 'script.js', '--max-results', 'xyz'];

      expect(() => getConfig()).toThrow();
    });
  });

  describe('when validating baseUrl', () => {
    it('getConfig when baseUrl is empty string then throws error', () => {
      process.env.OOREP_MCP_BASE_URL = '';

      expect(() => getConfig()).toThrow();
    });
  });

  describe('when validating timeoutMs', () => {
    it('getConfig when timeout is less than 1000 then throws error', () => {
      process.env.OOREP_MCP_TIMEOUT_MS = '999';

      expect(() => getConfig()).toThrow();
    });

    it('getConfig when timeout is greater than 300000 then throws error', () => {
      process.env.OOREP_MCP_TIMEOUT_MS = '300001';

      expect(() => getConfig()).toThrow();
    });

    it('getConfig when timeout is exactly 1000 then succeeds', () => {
      process.env.OOREP_MCP_TIMEOUT_MS = '1000';

      const config = getConfig();

      expect(config.timeoutMs).toBe(1000);
    });

    it('getConfig when timeout is exactly 300000 then succeeds', () => {
      process.env.OOREP_MCP_TIMEOUT_MS = '300000';

      const config = getConfig();

      expect(config.timeoutMs).toBe(300000);
    });
  });

  describe('when validating maxResults', () => {
    it('getConfig when maxResults is less than 1 then throws error', () => {
      process.env.OOREP_MCP_MAX_RESULTS = '0';

      expect(() => getConfig()).toThrow();
    });

    it('getConfig when maxResults is greater than 500 then throws error', () => {
      process.env.OOREP_MCP_MAX_RESULTS = '501';

      expect(() => getConfig()).toThrow();
    });

    it('getConfig when maxResults is exactly 1 then succeeds', () => {
      process.env.OOREP_MCP_MAX_RESULTS = '1';

      const config = getConfig();

      expect(config.maxResults).toBe(1);
    });

    it('getConfig when maxResults is exactly 500 then succeeds', () => {
      process.env.OOREP_MCP_MAX_RESULTS = '500';

      const config = getConfig();

      expect(config.maxResults).toBe(500);
    });
  });

  describe('when validating logLevel', () => {
    it.each(['debug', 'info', 'warn', 'error'])(
      'getConfig when logLevel is %s then succeeds',
      (level: string) => {
        process.env.OOREP_MCP_LOG_LEVEL = level;

        const config = getConfig();

        expect(config.logLevel).toBe(level);
      }
    );

    it('getConfig when logLevel is invalid then throws error', () => {
      process.env.OOREP_MCP_LOG_LEVEL = 'invalid';

      expect(() => getConfig()).toThrow();
    });
  });

  describe('when validating cacheTtlMs', () => {
    it('getConfig when cacheTtlMs is less than 0 then throws error', () => {
      process.env.OOREP_MCP_CACHE_TTL_MS = '-1';

      expect(() => getConfig()).toThrow();
    });

    it('getConfig when cacheTtlMs is greater than 3600000 then throws error', () => {
      process.env.OOREP_MCP_CACHE_TTL_MS = '3600001';

      expect(() => getConfig()).toThrow();
    });

    it('getConfig when cacheTtlMs is exactly 0 then succeeds', () => {
      process.env.OOREP_MCP_CACHE_TTL_MS = '0';

      const config = getConfig();

      expect(config.cacheTtlMs).toBe(0);
    });

    it('getConfig when cacheTtlMs is exactly 3600000 then succeeds', () => {
      process.env.OOREP_MCP_CACHE_TTL_MS = '3600000';

      const config = getConfig();

      expect(config.cacheTtlMs).toBe(3600000);
    });
  });

  describe('when validating defaultRepertory', () => {
    it('getConfig when defaultRepertory is empty then throws error', () => {
      process.env.OOREP_MCP_DEFAULT_REPERTORY = '';

      expect(() => getConfig()).toThrow();
    });

    it('getConfig when defaultRepertory is only whitespace then throws error', () => {
      process.env.OOREP_MCP_DEFAULT_REPERTORY = '   ';

      expect(() => getConfig()).toThrow();
    });
  });

  describe('when validating defaultMateriaMedica', () => {
    it('getConfig when defaultMateriaMedica is empty then throws error', () => {
      process.env.OOREP_MCP_DEFAULT_MATERIA_MEDICA = '';

      expect(() => getConfig()).toThrow();
    });

    it('getConfig when defaultMateriaMedica is only whitespace then throws error', () => {
      process.env.OOREP_MCP_DEFAULT_MATERIA_MEDICA = '   ';

      expect(() => getConfig()).toThrow();
    });
  });
});

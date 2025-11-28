# Dependency Injection Refactoring Plan

## Executive Summary

This document outlines a comprehensive plan to refactor the OOREP MCP codebase to follow dependency injection (DI) principles, enabling users to customize caching, logging, HTTP client behavior, and other core functionalities.

**Current State:** The codebase has hardcoded dependencies (Cache, Logger, HTTP Client, RequestDeduplicator) that prevent users from customizing behavior.

**Desired State:** A flexible, extensible architecture where users can inject custom implementations while maintaining sensible defaults for ease of use.

**Research Foundation:**
- [TypeScript DI Best Practices](https://dev.to/ruben_alapont/the-power-of-dependency-injection-in-typescript-3m5e)
- [SDK Design Patterns](https://vineeth.io/posts/sdk-development)
- [HTTP Client Abstraction](https://medium.com/@navidbarsalari/how-to-build-an-abstract-http-client-layer-in-typescript-axios-vs-fetch-4ce64c06b0c7)
- [Logging Abstraction](https://dev.to/theogravity/why-loglayer-is-the-logging-abstraction-framework-for-typescript-39mk)
- [Plugin Architecture](https://dev.to/hexshift/designing-a-plugin-system-in-typescript-for-modular-web-applications-4db5)

## Phase 1: Define Interfaces for All Dependencies

### 1.1 Logger Interface (`src/interfaces/ILogger.ts`)

```typescript
/**
 * Logger interface for dependency injection
 * Allows users to provide custom logging implementations
 */
export interface ILogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, error?: Error | unknown, ...args: unknown[]): void;
  setLevel?(level: LogLevel): void;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * No-op logger for when logging is disabled
 */
export class NoOpLogger implements ILogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

/**
 * Console logger - default implementation
 */
export class ConsoleLogger implements ILogger {
  private level: LogLevel;
  private readonly levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(level: LogLevel = 'info') {
    this.level = level;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.level];
  }

  private formatMessage(level: LogLevel, message: string, ...args: unknown[]): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    const formattedArgs =
      args.length > 0 ? ' ' + args.map((arg) => JSON.stringify(arg)).join(' ') : '';
    return `${prefix} ${message}${formattedArgs}`;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.error(this.formatMessage('debug', message, ...args));
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.error(this.formatMessage('info', message, ...args));
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.error(this.formatMessage('warn', message, ...args));
    }
  }

  error(message: string, error?: Error | unknown, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      const errorInfo =
        error instanceof Error ? { message: error.message, stack: error.stack } : error;
      console.error(this.formatMessage('error', message, errorInfo, ...args));
    }
  }
}
```

### 1.2 Cache Interface (`src/interfaces/ICache.ts`)

```typescript
/**
 * Cache interface for dependency injection
 * Allows users to provide custom caching implementations
 * (Redis, Memcached, in-memory, etc.)
 */
export interface ICache<T = unknown> {
  /**
   * Get value from cache
   * @returns value if found and not expired, null otherwise
   */
  get(key: string): T | null;

  /**
   * Set value in cache
   */
  set(key: string, value: T): void;

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean;

  /**
   * Delete specific key
   */
  delete(key: string): void;

  /**
   * Clear all cache entries
   */
  clear(): void;

  /**
   * Get cache statistics (optional)
   */
  getStats?(): { size: number; ttl?: number; [key: string]: unknown };

  /**
   * Destroy the cache and cleanup resources
   */
  destroy?(): void;
}

/**
 * No-op cache for when caching is disabled
 */
export class NoOpCache<T = unknown> implements ICache<T> {
  get(): T | null {
    return null;
  }
  set(): void {}
  has(): boolean {
    return false;
  }
  delete(): void {}
  clear(): void {}
  getStats() {
    return { size: 0, ttl: 0 };
  }
  destroy(): void {}
}
```

### 1.3 Request Deduplicator Interface (`src/interfaces/IRequestDeduplicator.ts`)

```typescript
/**
 * Request deduplicator interface for dependency injection
 * Allows users to provide custom deduplication strategies
 */
export interface IRequestDeduplicator {
  /**
   * Deduplicate requests by key
   * If a request with the same key is already in flight, return the existing promise
   */
  deduplicate<T>(key: string, fn: () => Promise<T>, timeoutMs?: number): Promise<T>;

  /**
   * Get count of pending requests (optional)
   */
  getPendingCount?(): number;
}

/**
 * No-op deduplicator - always executes the function
 */
export class NoOpDeduplicator implements IRequestDeduplicator {
  async deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
    return fn();
  }
  getPendingCount(): number {
    return 0;
  }
}
```

### 1.4 HTTP Client Interface (`src/interfaces/IHttpClient.ts`)

```typescript
/**
 * HTTP client interface for dependency injection
 * Allows users to provide custom HTTP clients (fetch, axios, node-fetch, etc.)
 */
export interface IHttpClient {
  /**
   * Make an HTTP GET request
   */
  get<T = unknown>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>>;

  /**
   * Make an HTTP POST request
   */
  post?<T = unknown>(url: string, body?: unknown, options?: HttpRequestOptions): Promise<HttpResponse<T>>;

  /**
   * Make an HTTP PUT request
   */
  put?<T = unknown>(url: string, body?: unknown, options?: HttpRequestOptions): Promise<HttpResponse<T>>;

  /**
   * Make an HTTP DELETE request
   */
  delete?<T = unknown>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
}

export interface HttpRequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
}

export interface HttpResponse<T = unknown> {
  status: number;
  statusText: string;
  headers: Map<string, string>;
  data: T | null;
  ok: boolean;
}

/**
 * HTTP error thrown by HTTP client
 */
export class HttpError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: HttpResponse<unknown>
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
```

### 1.5 Session Manager Interface (`src/interfaces/ISessionManager.ts`)

```typescript
/**
 * Session manager interface for handling authentication/cookies
 * Allows users to provide custom session management strategies
 */
export interface ISessionManager {
  /**
   * Ensure session is initialized
   * @param forceRefresh - force a new session even if one exists
   */
  ensureSession(forceRefresh?: boolean): Promise<void>;

  /**
   * Get headers for authenticated requests
   */
  getAuthHeaders(): Record<string, string>;

  /**
   * Handle response and update session if needed
   */
  handleResponse(response: HttpResponse<unknown>): void;

  /**
   * Clear session
   */
  clearSession(): void;
}
```

## Phase 2: Refactor Existing Implementations

### 2.1 Update Cache to Implement ICache

**File:** `src/lib/cache.ts`

```typescript
import type { ICache } from '../interfaces/ICache.js';
import type { ILogger } from '../interfaces/ILogger.js';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * In-memory cache implementation with TTL support
 * Implements ICache interface for dependency injection
 */
export class InMemoryCache<T = unknown> implements ICache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private ttl: number;
  private cleanupTimer?: NodeJS.Timeout;
  private logger?: ILogger;

  constructor(ttlMs: number, logger?: ILogger) {
    this.ttl = ttlMs;
    this.logger = logger;

    // Set up periodic cleanup
    const cleanupInterval = Math.min(ttlMs, 3600000);
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, cleanupInterval);

    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      this.logger?.debug(`Cache miss: ${key}`);
      return null;
    }

    const age = Date.now() - entry.timestamp;
    if (age >= this.ttl) {
      this.logger?.debug(`Cache expired: ${key} (age: ${age}ms, ttl: ${this.ttl}ms)`);
      this.store.delete(key);
      return null;
    }

    this.logger?.debug(`Cache hit: ${key}`);
    return entry.data;
  }

  set(key: string, data: T): void {
    this.store.set(key, {
      data,
      timestamp: Date.now(),
    });
    this.logger?.debug(`Cache set: ${key}`);
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.store.delete(key);
    this.logger?.debug(`Cache deleted: ${key}`);
  }

  clear(): void {
    const size = this.store.size;
    this.store.clear();
    this.logger?.debug(`Cache cleared: ${size} entries removed`);
  }

  getStats(): { size: number; ttl: number } {
    return {
      size: this.store.size,
      ttl: this.ttl,
    };
  }

  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.store.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      this.logger?.debug(`Cache cleanup: ${removed} expired entries removed`);
    }

    return removed;
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
    this.logger?.debug('Cache destroyed');
  }
}
```

### 2.2 Update RequestDeduplicator to Implement IRequestDeduplicator

**File:** `src/lib/deduplicator.ts` (new file)

```typescript
import type { IRequestDeduplicator } from '../interfaces/IRequestDeduplicator.js';
import type { ILogger } from '../interfaces/ILogger.js';

/**
 * Map-based request deduplication implementation
 * Implements IRequestDeduplicator interface for dependency injection
 */
export class MapRequestDeduplicator implements IRequestDeduplicator {
  private pending = new Map<string, Promise<unknown>>();
  private logger?: ILogger;

  constructor(logger?: ILogger) {
    this.logger = logger;
  }

  async deduplicate<T>(key: string, fn: () => Promise<T>, timeoutMs = 60000): Promise<T> {
    if (this.pending.has(key)) {
      this.logger?.debug(`Request deduplication: using existing request for ${key}`);
      return this.pending.get(key) as Promise<T>;
    }

    let timeoutTimer: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutTimer = setTimeout(() => {
        this.pending.delete(key);
        reject(new Error(`Request timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      if (timeoutTimer.unref) {
        timeoutTimer.unref();
      }
    });

    const requestPromise = fn().finally(() => {
      this.pending.delete(key);
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
      }
    });

    this.pending.set(key, Promise.race([requestPromise, timeoutPromise]));
    return this.pending.get(key) as Promise<T>;
  }

  getPendingCount(): number {
    return this.pending.size;
  }
}
```

### 2.3 Create Fetch-based HTTP Client

**File:** `src/lib/http-client.ts` (new file)

```typescript
import type { IHttpClient, HttpRequestOptions, HttpResponse, HttpError } from '../interfaces/IHttpClient.js';
import type { ILogger } from '../interfaces/ILogger.js';

/**
 * Fetch-based HTTP client implementation
 * Implements IHttpClient interface for dependency injection
 */
export class FetchHttpClient implements IHttpClient {
  private logger?: ILogger;
  private defaultTimeout: number;

  constructor(options: { logger?: ILogger; timeout?: number } = {}) {
    this.logger = options.logger;
    this.defaultTimeout = options.timeout ?? 30000;
  }

  async get<T = unknown>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.request<T>('GET', url, undefined, options);
  }

  async post<T = unknown>(url: string, body?: unknown, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.request<T>('POST', url, body, options);
  }

  async put<T = unknown>(url: string, body?: unknown, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.request<T>('PUT', url, body, options);
  }

  async delete<T = unknown>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.request<T>('DELETE', url, undefined, options);
  }

  private async request<T>(
    method: string,
    url: string,
    body?: unknown,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    const timeout = options?.timeout ?? this.defaultTimeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      this.logger?.debug(`HTTP ${method} ${url}`);

      const response = await fetch(url, {
        method,
        headers: options?.headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: options?.signal ?? controller.signal,
      });

      clearTimeout(timeoutId);

      // Extract headers
      const headers = new Map<string, string>();
      response.headers.forEach((value, key) => {
        headers.set(key, value);
      });

      // Parse body
      let data: T | null = null;
      const text = await response.text();
      if (text) {
        try {
          data = JSON.parse(text) as T;
        } catch {
          // If not JSON, just use the text
          data = text as T;
        }
      }

      const httpResponse: HttpResponse<T> = {
        status: response.status,
        statusText: response.statusText,
        headers,
        data,
        ok: response.ok,
      };

      if (!response.ok) {
        throw new HttpError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          httpResponse
        ) as Error;
      }

      return httpResponse;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }
  }
}
```

## Phase 3: Refactor OOREPClient to Accept Injected Dependencies

**File:** `src/lib/oorep-client.ts`

```typescript
import type { IHttpClient } from '../interfaces/IHttpClient.js';
import type { ILogger } from '../interfaces/ILogger.js';
import type { ISessionManager } from '../interfaces/ISessionManager.js';

export interface OOREPClientConfig {
  baseUrl: string;
  timeoutMs: number;
  defaultRepertory: string;
  defaultMateriaMedica: string;
  // Injectable dependencies
  httpClient?: IHttpClient;
  logger?: ILogger;
  sessionManager?: ISessionManager;
}

/**
 * OOREP HTTP Client with dependency injection support
 */
export class OOREPClient {
  private readonly baseUrl: string;
  private readonly httpClient: IHttpClient;
  private readonly logger?: ILogger;
  private readonly sessionManager: ISessionManager;
  private readonly defaultRepertory: string;
  private readonly defaultMateriaMedica: string;

  constructor(config: OOREPClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.httpClient = config.httpClient ?? new FetchHttpClient({ timeout: config.timeoutMs, logger: config.logger });
    this.logger = config.logger;
    this.sessionManager = config.sessionManager ?? new CookieSessionManager(this.httpClient, this.baseUrl, this.logger);
    this.defaultRepertory = config.defaultRepertory;
    this.defaultMateriaMedica = config.defaultMateriaMedica;
  }

  // ... rest of the implementation using this.httpClient, this.logger, this.sessionManager
}
```

## Phase 4: Refactor OOREPSDKClient with Builder Pattern

**File:** `src/sdk/client.ts`

```typescript
import type { ICache } from '../interfaces/ICache.js';
import type { IRequestDeduplicator } from '../interfaces/IRequestDeduplicator.js';
import type { ILogger } from '../interfaces/ILogger.js';
import type { IHttpClient } from '../interfaces/IHttpClient.js';

/**
 * Configuration options for the OOREP SDK client with dependency injection
 */
export interface OOREPSDKConfig {
  /** Base URL for OOREP API (default: https://www.oorep.com) */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
  /** Cache TTL in milliseconds (default: 300000 = 5 minutes) */
  cacheTtlMs?: number;
  /** Default repertory abbreviation (default: publicum) */
  defaultRepertory?: string;
  /** Default materia medica abbreviation (default: boericke) */
  defaultMateriaMedica?: string;

  // Injectable dependencies
  /** Custom cache implementation */
  cache?: ICache;
  /** Custom request deduplicator */
  deduplicator?: IRequestDeduplicator;
  /** Custom logger */
  logger?: ILogger;
  /** Custom HTTP client */
  httpClient?: IHttpClient;
  /** Custom OOREP client (advanced usage) */
  client?: OOREPClient;
}

/**
 * OOREP SDK Client with full dependency injection support
 */
export class OOREPSDKClient {
  private client: OOREPClient;
  private cache: ICache;
  private deduplicator: IRequestDeduplicator;
  private logger: ILogger;
  private config: Required<Omit<OOREPSDKConfig, 'cache' | 'deduplicator' | 'logger' | 'httpClient' | 'client'>>;

  constructor(config: OOREPSDKConfig = {}) {
    // Set up defaults
    this.config = {
      baseUrl: config.baseUrl ?? 'https://www.oorep.com',
      timeoutMs: config.timeoutMs ?? 30000,
      cacheTtlMs: config.cacheTtlMs ?? 300000,
      defaultRepertory: config.defaultRepertory ?? 'publicum',
      defaultMateriaMedica: config.defaultMateriaMedica ?? 'boericke',
    };

    // Injectable dependencies with sensible defaults
    this.logger = config.logger ?? new ConsoleLogger('warn');
    this.cache = config.cache ?? new InMemoryCache(this.config.cacheTtlMs, this.logger);
    this.deduplicator = config.deduplicator ?? new MapRequestDeduplicator(this.logger);

    // Create or use provided HTTP client
    const httpClient = config.httpClient ?? new FetchHttpClient({
      timeout: this.config.timeoutMs,
      logger: this.logger,
    });

    // Create or use provided OOREP client
    this.client = config.client ?? new OOREPClient({
      baseUrl: this.config.baseUrl,
      timeoutMs: this.config.timeoutMs,
      defaultRepertory: this.config.defaultRepertory,
      defaultMateriaMedica: this.config.defaultMateriaMedica,
      httpClient,
      logger: this.logger,
    });
  }

  // ... rest of implementation using this.cache, this.deduplicator, this.logger, this.client
}
```

## Phase 5: Update Registries to Accept Injected Clients

### 5.1 ToolRegistry

```typescript
export class ToolRegistry {
  private tools = new Map<string, ToolHandler>();
  private definitions: ToolDefinition[] = [];

  constructor(
    private config: OOREPConfig,
    private client?: OOREPSDKClient  // Injectable client
  ) {
    this.registerAllTools();
  }

  private registerAllTools(): void {
    // If client provided, pass it to tools
    // Otherwise, each tool creates its own (backward compatible)
    const clientConfig = this.client ? { client: this.client } : undefined;

    this.registerTool(
      searchRepertoryToolDefinition,
      new SearchRepertoryTool(this.config, clientConfig)
    );
    // ... other tools
  }
}
```

### 5.2 ResourceRegistry

```typescript
export class ResourceRegistry {
  private client: OOREPClient;
  private remediesCache: ICache<unknown>;
  private repertoriesCache: ICache<unknown>;
  private materiaMedicasCache: ICache<unknown>;

  constructor(
    config: OOREPConfig,
    options?: {
      client?: OOREPClient;
      cache?: ICache;
      logger?: ILogger;
    }
  ) {
    this.client = options?.client ?? new OOREPClient(config);

    // Use provided cache or create defaults
    if (options?.cache) {
      this.remediesCache = options.cache;
      this.repertoriesCache = options.cache;
      this.materiaMedicasCache = options.cache;
    } else {
      this.remediesCache = new InMemoryCache(3600000, options?.logger);
      this.repertoriesCache = new InMemoryCache(300000, options?.logger);
      this.materiaMedicasCache = new InMemoryCache(300000, options?.logger);
    }
  }
}
```

## Phase 6: Create Convenience Builder/Factory Functions

**File:** `src/sdk/client-builder.ts` (new file)

```typescript
/**
 * Fluent builder for OOREPSDKClient
 * Provides a convenient way to configure the client with custom implementations
 */
export class OOREPClientBuilder {
  private config: OOREPSDKConfig = {};

  withBaseUrl(baseUrl: string): this {
    this.config.baseUrl = baseUrl;
    return this;
  }

  withTimeout(timeoutMs: number): this {
    this.config.timeoutMs = timeoutMs;
    return this;
  }

  withCacheTtl(cacheTtlMs: number): this {
    this.config.cacheTtlMs = cacheTtlMs;
    return this;
  }

  withCache(cache: ICache): this {
    this.config.cache = cache;
    return this;
  }

  withLogger(logger: ILogger): this {
    this.config.logger = logger;
    return this;
  }

  withHttpClient(httpClient: IHttpClient): this {
    this.config.httpClient = httpClient;
    return this;
  }

  withDeduplicator(deduplicator: IRequestDeduplicator): this {
    this.config.deduplicator = deduplicator;
    return this;
  }

  withDefaultRepertory(repertory: string): this {
    this.config.defaultRepertory = repertory;
    return this;
  }

  withDefaultMateriaMedica(materiaMedica: string): this {
    this.config.defaultMateriaMedica = materiaMedica;
    return this;
  }

  build(): OOREPSDKClient {
    return new OOREPSDKClient(this.config);
  }
}

/**
 * Create a client builder
 */
export function buildOOREPClient(): OOREPClientBuilder {
  return new OOREPClientBuilder();
}
```

## Phase 7: Update Tests

### 7.1 Test Structure

- Create test implementations of all interfaces (MockLogger, MockCache, etc.)
- Test that custom implementations are used when provided
- Test that defaults work when nothing is provided
- Test backward compatibility

### 7.2 Example Test

```typescript
describe('OOREPSDKClient with DI', () => {
  it('should use provided custom logger', async () => {
    const mockLogger = new MockLogger();
    const client = new OOREPSDKClient({ logger: mockLogger });

    await client.searchRepertory({ symptom: 'headache' });

    expect(mockLogger.logs).toContain('Looking up repertory');
  });

  it('should use provided custom cache', async () => {
    const mockCache = new MockCache();
    const client = new OOREPSDKClient({ cache: mockCache });

    await client.searchRepertory({ symptom: 'headache' });

    expect(mockCache.getCalls.length).toBeGreaterThan(0);
  });

  it('should use defaults when no dependencies provided', () => {
    const client = new OOREPSDKClient();

    expect(client).toBeDefined();
    // Should work with defaults
  });
});
```

## Phase 8: Update Documentation

### 8.1 README.md Updates

Add new section: **Customization and Extensibility**

```markdown
## Customization and Extensibility

### Custom Cache Implementation

Provide your own cache implementation for Redis, Memcached, or any storage backend:

\`\`\`typescript
import { createOOREPClient, type ICache } from 'oorep-mcp/sdk/client';
import Redis from 'ioredis';

class RedisCache implements ICache {
  private redis: Redis;

  constructor(redisClient: Redis) {
    this.redis = redisClient;
  }

  async get(key: string): Promise<unknown | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: unknown): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', 300); // 5 min TTL
  }

  // ... implement other methods
}

const redis = new Redis();
const client = createOOREPClient({
  cache: new RedisCache(redis),
});
\`\`\`

### Custom Logger

Integrate with your logging framework (Winston, Pino, Bunyan, etc.):

\`\`\`typescript
import { createOOREPClient, type ILogger } from 'oorep-mcp/sdk/client';
import winston from 'winston';

class WinstonLogger implements ILogger {
  private winston: winston.Logger;

  constructor(logger: winston.Logger) {
    this.winston = logger;
  }

  debug(message: string, ...args: unknown[]): void {
    this.winston.debug(message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.winston.info(message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.winston.warn(message, ...args);
  }

  error(message: string, error?: Error | unknown, ...args: unknown[]): void {
    this.winston.error(message, { error, ...args });
  }
}

const winstonLogger = winston.createLogger({ /* config */ });
const client = createOOREPClient({
  logger: new WinstonLogger(winstonLogger),
});
\`\`\`

### Custom HTTP Client

Use Axios, node-fetch, or any HTTP library:

\`\`\`typescript
import { createOOREPClient, type IHttpClient, type HttpResponse } from 'oorep-mcp/sdk/client';
import axios, { AxiosInstance } from 'axios';

class AxiosHttpClient implements IHttpClient {
  private axios: AxiosInstance;

  constructor(axiosInstance: AxiosInstance) {
    this.axios = axiosInstance;
  }

  async get<T>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    const response = await this.axios.get(url, {
      headers: options?.headers,
      timeout: options?.timeout,
    });

    return {
      status: response.status,
      statusText: response.statusText,
      headers: new Map(Object.entries(response.headers)),
      data: response.data as T,
      ok: response.status >= 200 && response.status < 300,
    };
  }

  // ... implement other methods
}

const axiosInstance = axios.create({ /* config */ });
const client = createOOREPClient({
  httpClient: new AxiosHttpClient(axiosInstance),
});
\`\`\`

### Builder Pattern

Use the fluent builder for readable configuration:

\`\`\`typescript
import { buildOOREPClient } from 'oorep-mcp/sdk/client';

const client = buildOOREPClient()
  .withBaseUrl('https://custom-oorep.example.com')
  .withTimeout(60000)
  .withCacheTtl(600000)
  .withLogger(customLogger)
  .withCache(redisCache)
  .withHttpClient(axiosClient)
  .build();
\`\`\`

### Disable Features

Disable caching or deduplication when not needed:

\`\`\`typescript
import { createOOREPClient, NoOpCache, NoOpDeduplicator } from 'oorep-mcp/sdk/client';

const client = createOOREPClient({
  cache: new NoOpCache(),           // Disable caching
  deduplicator: new NoOpDeduplicator(), // Disable deduplication
});
\`\`\`
```

## Phase 9: Backward Compatibility

### Critical Requirements

1. **Zero Breaking Changes**: Existing code must continue to work without modifications
2. **Opt-in Customization**: Dependency injection is opt-in via config options
3. **Sensible Defaults**: Default implementations match current behavior exactly
4. **Deprecation Path**: No deprecations initially - purely additive changes

### Compatibility Checklist

- [ ] `new OOREPSDKClient()` with no args still works
- [ ] `createOOREPClient()` with no args still works
- [ ] All SDK adapters (OpenAI, Vercel AI, LangChain) work unchanged
- [ ] MCP server continues to work with existing config
- [ ] All existing tests pass without modification
- [ ] Package exports remain the same (add new exports for interfaces)

## Phase 10: Migration Path for Users

### Optional Migration Timeline

**Version 0.1.0** (Current + DI)
- Add all interfaces and injectable constructors
- Maintain full backward compatibility
- Add documentation for customization

**Version 0.2.0** (6 months later)
- Potentially deprecate direct use of global logger singleton
- Add migration guide for recommended patterns

**Version 1.0.0** (12+ months later)
- Stabilize DI API
- Declare interfaces as stable public API

## Risk Mitigation

### Identified Risks

1. **Risk**: Breaking existing code
   - **Mitigation**: Comprehensive backward compatibility tests, optional parameters only

2. **Risk**: Performance regression
   - **Mitigation**: Benchmark tests, defaults match current implementations exactly

3. **Risk**: Increased complexity
   - **Mitigation**: Clear documentation, builder pattern for ease of use, examples

4. **Risk**: Incomplete interface definitions
   - **Mitigation**: Thorough analysis of all use cases, community feedback period

5. **Risk**: Testing overhead
   - **Mitigation**: Create comprehensive mock implementations for testing

## Success Criteria

1. ✅ All interfaces defined and documented
2. ✅ All existing implementations updated to implement interfaces
3. ✅ OOREPSDKClient accepts all injectable dependencies
4. ✅ Builder pattern implemented and tested
5. ✅ 100% backward compatibility verified
6. ✅ All existing tests pass
7. ✅ New tests for DI scenarios pass
8. ✅ Documentation updated with examples
9. ✅ Performance benchmarks show no regression
10. ✅ Community feedback incorporated

## Implementation Order

1. Create `src/interfaces/` directory and all interface files
2. Update `src/lib/cache.ts` to implement `ICache`
3. Move and update `RequestDeduplicator` to implement `IRequestDeduplicator`
4. Create `FetchHttpClient` implementing `IHttpClient`
5. Update `Logger` to implement `ILogger`
6. Create `CookieSessionManager` implementing `ISessionManager`
7. Refactor `OOREPClient` to accept injected dependencies
8. Refactor `OOREPSDKClient` to accept injected dependencies
9. Update `ToolRegistry` and tools to support injection
10. Update `ResourceRegistry` to support injection
11. Create builder pattern implementation
12. Update tests
13. Update documentation
14. Benchmark and validate
15. Release

## Conclusion

This comprehensive plan transforms the OOREP MCP codebase from a tightly-coupled architecture to a flexible, extensible system following industry best practices for dependency injection in TypeScript.

The approach:
- Maintains 100% backward compatibility
- Enables advanced customization for power users
- Follows established patterns from the TypeScript community
- Provides clear migration path
- Includes comprehensive testing strategy

**Estimated Implementation Time**: 3-5 days for full implementation and testing
**Estimated Documentation Time**: 1-2 days
**Total**: 4-7 days

# Dependency Injection Plan - Validation & Corrections

## Validation Summary

After thorough review of the implementation plan, I've identified several critical issues and areas for improvement.

## ✅ What's Correct

### Strengths of the Plan

1. **Comprehensive Coverage**: All major dependencies identified and addressed
2. **Interface-First Design**: Follows TypeScript best practices
3. **Backward Compatibility**: Explicit focus on maintaining existing behavior
4. **Builder Pattern**: Excellent developer experience
5. **Documentation**: Comprehensive examples for common use cases
6. **Research-Based**: Grounded in industry best practices
7. **Phased Approach**: Logical implementation order

## ❌ Critical Issues Found

### Issue #1: Synchronous Cache Interface (BLOCKER)

**Problem**: The `ICache` interface uses synchronous methods, but real-world cache implementations (Redis, Memcached, etc.) are asynchronous.

```typescript
// Current (WRONG):
export interface ICache<T = unknown> {
  get(key: string): T | null;  // Synchronous - won't work with Redis!
  set(key: string, value: T): void;
}
```

**Impact**: Users cannot actually use Redis, Memcached, or any async cache backend.

**Solution**: Make all cache methods asynchronous and update all calling code:

```typescript
export interface ICache<T = unknown> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T): Promise<void>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  getStats?(): Promise<{ size: number; ttl?: number; [key: string]: unknown }>;
  destroy?(): Promise<void>;
}

// Wrapper for backward compatibility with sync caches
export class SyncCacheAdapter<T = unknown> implements ICache<T> {
  constructor(private syncCache: { get(key: string): T | null; set(key: string, value: T): void; /* ... */ }) {}

  async get(key: string): Promise<T | null> {
    return this.syncCache.get(key);
  }

  async set(key: string, value: T): Promise<void> {
    this.syncCache.set(key, value);
  }
  // ... other methods
}
```

**Code Changes Required**:
- All cache usage in `OOREPSDKClient` must be updated to `await`
- Tests must be updated to handle async caches
- Documentation must clarify async nature

### Issue #2: Error Handling in Injectable Dependencies

**Problem**: Plan doesn't specify how to handle errors thrown by user-provided dependencies.

**Scenarios**:
1. Logger throws an error - should not crash the application
2. Cache throws an error - should fallback gracefully
3. HTTP client throws unexpected error - should wrap and sanitize

**Solution**: Add error handling wrappers:

```typescript
/**
 * Safe logger wrapper that never throws
 */
export class SafeLoggerWrapper implements ILogger {
  constructor(private logger: ILogger) {}

  debug(message: string, ...args: unknown[]): void {
    try {
      this.logger.debug(message, ...args);
    } catch (error) {
      // Silent fail - logging errors should never crash the app
      console.error('[OOREP] Logger error:', error);
    }
  }

  // ... same for all methods
}

/**
 * Safe cache wrapper with fallback
 */
export class SafeCacheWrapper<T = unknown> implements ICache<T> {
  constructor(private cache: ICache<T>, private fallback?: ICache<T>) {}

  async get(key: string): Promise<T | null> {
    try {
      return await this.cache.get(key);
    } catch (error) {
      console.error('[OOREP] Cache error:', error);
      if (this.fallback) {
        return await this.fallback.get(key);
      }
      return null; // Graceful degradation
    }
  }

  // ... same for all methods
}
```

**Implementation Note**: Automatically wrap all user-provided dependencies in safety wrappers.

### Issue #3: Missing Session Manager Implementation

**Problem**: Plan references `CookieSessionManager` but doesn't provide implementation.

**Solution**: Add complete implementation in Phase 2:

```typescript
/**
 * Cookie-based session manager for OOREP API
 */
export class CookieSessionManager implements ISessionManager {
  private cookieJar = new Map<string, string>();
  private sessionInitPromise: Promise<void> | null = null;

  constructor(
    private httpClient: IHttpClient,
    private baseUrl: string,
    private logger?: ILogger
  ) {}

  async ensureSession(forceRefresh = false): Promise<void> {
    // Implementation from current OOREPClient
    if (this.sessionInitPromise) {
      await this.sessionInitPromise;
      if (forceRefresh && this.cookieJar.size > 0) {
        return;
      }
    }

    if (!forceRefresh && this.cookieJar.size > 0) {
      return;
    }

    if (forceRefresh && !this.sessionInitPromise) {
      this.cookieJar.clear();
    }

    if (!this.sessionInitPromise) {
      this.sessionInitPromise = this.bootstrapSession().finally(() => {
        this.sessionInitPromise = null;
      });
    }

    await this.sessionInitPromise;
  }

  private async bootstrapSession(): Promise<void> {
    const url = `${this.baseUrl}/api/available_remedies?limit=1`;
    this.logger?.debug('Initializing OOREP session', { url });

    const response = await this.httpClient.get(url);
    this.storeCookies(response);

    if (!response.ok) {
      throw new Error(`Failed to initialize OOREP session (HTTP ${response.status})`);
    }

    this.logger?.debug('OOREP session initialized');
  }

  private storeCookies(response: HttpResponse<unknown>): void {
    const setCookieHeaders: string[] = [];
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        setCookieHeaders.push(value);
      }
    });

    setCookieHeaders.forEach((header) => {
      const [cookiePair] = header.split(';');
      const [name, ...valueParts] = cookiePair.split('=');
      if (!name || valueParts.length === 0) return;

      const value = valueParts.join('=').trim();
      if (value) {
        this.cookieJar.set(name.trim(), value);
      }
    });
  }

  getAuthHeaders(): Record<string, string> {
    if (this.cookieJar.size === 0) {
      return {};
    }

    const cookieHeader = Array.from(this.cookieJar.entries())
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');

    return {
      Cookie: cookieHeader,
    };
  }

  handleResponse(response: HttpResponse<unknown>): void {
    this.storeCookies(response);
  }

  clearSession(): void {
    this.cookieJar.clear();
  }
}
```

### Issue #4: HttpError Type Confusion

**Problem**: `HttpError` is defined as a class but then cast as `Error` in throw statement:

```typescript
throw new HttpError(...) as Error;  // Why the cast?
```

**Solution**: Remove the cast or clarify why it's needed:

```typescript
export class HttpError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: HttpResponse<unknown>
  ) {
    super(message);
    this.name = 'HttpError';
    Object.setPrototypeOf(this, HttpError.prototype); // Fix instanceof in TypeScript
  }
}

// Then just:
throw new HttpError(...);  // No cast needed
```

### Issue #5: Missing Interface Exports

**Problem**: Plan doesn't specify which interfaces should be exported from package.json `exports` field.

**Solution**: Add to `package.json`:

```json
{
  "exports": {
    "./interfaces": {
      "types": "./dist/interfaces/index.d.ts",
      "import": "./dist/interfaces/index.js"
    }
  }
}
```

And create `src/interfaces/index.ts`:

```typescript
export type { ICache } from './ICache.js';
export type { ILogger, LogLevel } from './ILogger.js';
export type { IHttpClient, HttpRequestOptions, HttpResponse } from './IHttpClient.js';
export type { IRequestDeduplicator } from './IRequestDeduplicator.js';
export type { ISessionManager } from './ISessionManager.js';

// Export implementations
export { NoOpCache, InMemoryCache } from '../lib/cache.js';
export { NoOpLogger, ConsoleLogger } from '../lib/logger.js';
export { NoOpDeduplicator, MapRequestDeduplicator } from '../lib/deduplicator.js';
export { FetchHttpClient, HttpError } from '../lib/http-client.js';
export { CookieSessionManager } from '../lib/session-manager.js';
```

## ⚠️ Important Considerations

### Consideration #1: Circular Dependency Risk

**Problem**: If a user creates a custom logger that uses the OOREP client, it creates a circular dependency:

```typescript
// User code (BAD):
class OOREPLogger implements ILogger {
  constructor(private client: OOREPSDKClient) {}

  info(message: string): void {
    // Try to log to OOREP API
    this.client.searchRepertory({ symptom: message });  // CIRCULAR!
  }
}

const logger = new OOREPLogger(client);  // Requires client
const client = createOOREPClient({ logger });  // Requires logger - BOOM!
```

**Mitigation**: Document this clearly with a warning:

```markdown
### ⚠️ Avoiding Circular Dependencies

Do NOT create custom loggers, caches, or HTTP clients that depend on the OOREP client itself.
This will create circular dependencies and cause initialization failures.

**Bad Example**:
```typescript
// ❌ DON'T DO THIS
class MyLogger implements ILogger {
  constructor(private oorepClient: OOREPSDKClient) {}  // CIRCULAR!
}
```

**Good Example**:
```typescript
// ✅ DO THIS
class MyLogger implements ILogger {
  constructor(private externalService: ExternalLoggingService) {}  // Independent
}
```
```

### Consideration #2: Shared vs Isolated Dependencies

**Problem**: If multiple tools/registries are created, should they share a cache/logger or have isolated instances?

**Current behavior**: Each tool creates its own OOREPSDKClient with its own cache/logger.

**New behavior options**:
1. **Shared (recommended)**: Single client shared across all tools
2. **Isolated**: Each component gets its own client (current behavior)

**Solution**: Support both patterns:

```typescript
// Pattern 1: Shared client (recommended for efficiency)
const sharedClient = createOOREPClient({ cache: redisCache });
const toolRegistry = new ToolRegistry(config, { sharedClient });
const resourceRegistry = new ResourceRegistry(config, { sharedClient });

// Pattern 2: Isolated clients (more control)
const tool1 = new SearchRepertoryTool(config, {
  client: createOOREPClient({ cache: cache1 })
});
const tool2 = new SearchMateriaMedicaTool(config, {
  client: createOOREPClient({ cache: cache2 })
});
```

### Consideration #3: Type Complexity for End Users

**Problem**: TypeScript types for dependency injection can be intimidating:

```typescript
function createOOREPClient<TCache extends ICache = ICache>(config: OOREPSDKConfig): OOREPSDKClient;
```

**Solution**: Keep types simple, avoid excessive generics:

```typescript
// Simple - users don't need to specify types
function createOOREPClient(config?: OOREPSDKConfig): OOREPSDKClient;
```

The `ICache<T>` generic is internal - users don't need to know about it.

### Consideration #4: Performance Impact of Async Cache

**Problem**: Making cache async means every cache access requires `await`, which could impact performance.

**Measurements needed**:
- Benchmark sync vs async cache access
- Measure overhead of Promise creation
- Test with high-frequency access patterns

**Mitigation**:
1. Document performance characteristics
2. Provide both sync and async cache interfaces
3. Let users choose based on their needs

**Proposed dual interface**:

```typescript
export interface ISyncCache<T = unknown> {
  get(key: string): T | null;
  set(key: string, value: T): void;
  // ... sync methods
}

export interface IAsyncCache<T = unknown> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T): Promise<void>;
  // ... async methods
}

// OOREPSDKClient accepts either
export interface OOREPSDKConfig {
  cache?: ISyncCache | IAsyncCache;
  // ...
}
```

Then internally detect which type and handle appropriately.

## 📋 Additional Requirements

### Requirement #1: Migration Guide

Create a detailed migration guide for users upgrading from previous versions:

```markdown
## Migration Guide

### Migrating to v0.1.0 (Dependency Injection Support)

No breaking changes! Your existing code will continue to work.

**Before (v0.0.9)**:
```typescript
const client = createOOREPClient();
```

**After (v0.1.0 - optional customization)**:
```typescript
import { createOOREPClient } from 'oorep-mcp/sdk/client';
import { InMemoryCache } from 'oorep-mcp/interfaces';
import Redis from 'ioredis';

// Option 1: Keep using defaults (no changes needed)
const client = createOOREPClient();

// Option 2: Customize with Redis
const client = createOOREPClient({
  cache: new RedisCache(new Redis())
});
```
```

### Requirement #2: Comprehensive Type Tests

Add type tests to ensure correct TypeScript inference:

```typescript
// type-tests.ts
import { createOOREPClient, type ICache, type ILogger } from 'oorep-mcp/sdk/client';

// Test: Should accept config with no dependencies
const client1 = createOOREPClient();

// Test: Should accept config with custom cache
const client2 = createOOREPClient({
  cache: new MyCache(),
});

// Test: Should accept config with all dependencies
const client3 = createOOREPClient({
  cache: new MyCache(),
  logger: new MyLogger(),
  httpClient: new MyHttpClient(),
  deduplicator: new MyDeduplicator(),
});

// Test: Should type-check custom implementations
class MyCache implements ICache {
  async get(key: string): Promise<unknown | null> { return null; }
  async set(key: string, value: unknown): Promise<void> {}
  async has(key: string): Promise<boolean> { return false; }
  async delete(key: string): Promise<void> {}
  async clear(): Promise<void> {}
}

// This should compile without errors
```

### Requirement #3: Debugging Support

Add debugging capabilities to help users troubleshoot custom implementations:

```typescript
export interface OOREPSDKConfig {
  // ... existing options

  /**
   * Enable debug mode to trace dependency usage
   */
  debug?: boolean;

  /**
   * Custom implementation validators
   */
  validateDependencies?: boolean;
}

// Internal validation
function validateCache(cache: ICache): void {
  if (typeof cache.get !== 'function') {
    throw new Error('Invalid cache: missing get() method');
  }
  if (typeof cache.set !== 'function') {
    throw new Error('Invalid cache: missing set() method');
  }
  // ... validate all required methods
}
```

## 🔄 Updated Implementation Order

Based on the validation, here's the corrected implementation order:

1. **Phase 0: Preparation**
   - Create `src/interfaces/` directory structure
   - Set up test infrastructure for DI

2. **Phase 1: Core Interfaces**
   - Define `ILogger` interface (with async/sync consideration)
   - Define `ICache` interface (**async version**)
   - Define `IRequestDeduplicator` interface
   - Define `IHttpClient` interface
   - Define `ISessionManager` interface
   - Create `src/interfaces/index.ts` barrel export

3. **Phase 2: Safety Wrappers**
   - Implement `SafeLoggerWrapper`
   - Implement `SafeCacheWrapper`
   - Create error handling utilities

4. **Phase 3: Default Implementations**
   - Update `InMemoryCache` to implement `ICache` (**async**)
   - Update `ConsoleLogger` to implement `ILogger`
   - Create `MapRequestDeduplicator` implementing `IRequestDeduplicator`
   - Create `FetchHttpClient` implementing `IHttpClient`
   - Create `CookieSessionManager` implementing `ISessionManager`

5. **Phase 4: Update Core Client**
   - Refactor `OOREPClient` to accept injected dependencies
   - Update all internal cache calls to use `await`
   - Add safety wrapper logic

6. **Phase 5: Update SDK Client**
   - Refactor `OOREPSDKClient` to accept injected dependencies
   - Update all cache operations to async
   - Add safety wrapper application
   - Implement debug mode

7. **Phase 6: Update Registries**
   - Update `ToolRegistry` with optional shared client
   - Update `ResourceRegistry` with optional shared client
   - Update individual tools to support injection

8. **Phase 7: Builder Pattern**
   - Implement `OOREPClientBuilder`
   - Add convenience factory functions

9. **Phase 8: Testing**
   - Create mock implementations
   - Test backward compatibility
   - Test custom implementations
   - Add type tests
   - Benchmark performance

10. **Phase 9: Documentation**
    - Update README with customization section
    - Create migration guide
    - Add troubleshooting guide
    - Document performance characteristics

11. **Phase 10: Package Exports**
    - Update `package.json` exports
    - Verify TypeScript types are exported correctly
    - Test package installation and imports

## ✅ Validation Checklist

Before proceeding to implementation, ensure:

- [ ] All interfaces support async operations where needed (especially `ICache`)
- [ ] Safety wrappers are implemented for all user-provided dependencies
- [ ] `CookieSessionManager` implementation is complete
- [ ] `HttpError` extends `Error` correctly
- [ ] Package exports include all interface types
- [ ] Circular dependency risks are documented
- [ ] Shared vs isolated dependency patterns are supported
- [ ] Type complexity is minimized for end users
- [ ] Performance impact is measured and documented
- [ ] Migration guide is comprehensive
- [ ] Type tests are included
- [ ] Debugging support is implemented
- [ ] All backward compatibility requirements are met

## Conclusion

The original plan is **90% correct** but has critical issues that must be addressed:

1. ✅ **Must fix**: Async cache interface
2. ✅ **Must add**: Error handling wrappers
3. ✅ **Must implement**: `CookieSessionManager`
4. ⚠️ **Should improve**: Type exports and documentation
5. ⚠️ **Should consider**: Performance implications

Once these corrections are made, the plan will be **99%+ ready** for implementation.

**Recommendation**: Proceed with implementation after incorporating these corrections.

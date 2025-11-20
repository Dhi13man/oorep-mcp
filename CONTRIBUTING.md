# Contributing to OOREP MCP Server

Thank you for your interest in contributing to the OOREP MCP server! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

This project follows a simple code of conduct:
- Be respectful and constructive
- Welcome newcomers and help them learn
- Focus on what is best for the community
- Show empathy towards other community members

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue on GitHub with:

1. **Clear title** describing the issue
2. **Steps to reproduce** the bug
3. **Expected behavior** vs actual behavior
4. **Environment details:**
   - OS and version
   - Node.js version
   - Claude Desktop version (if applicable)
   - MCP server configuration
5. **Error logs** from MCP log files (see README troubleshooting section)
6. **Screenshots** if applicable

### Suggesting Features

Feature requests are welcome! Please create an issue with:

1. **Clear description** of the feature
2. **Use case** explaining why this would be valuable
3. **Proposed implementation** (if you have ideas)
4. **Alternatives considered** (if any)

### Submitting Pull Requests

1. **Fork the repository** and create a new branch from `main`
2. **Make your changes** following the code style guidelines below
3. **Write tests** for new functionality
4. **Ensure all tests pass** (`npm test`)
5. **Update documentation** (README, JSDoc comments, etc.)
6. **Submit a pull request** with a clear description

## Development Setup

### Prerequisites

- Node.js ≥ 18.0.0
- npm ≥ 8.0.0
- Git

### Setup Instructions

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/oorep-mcp.git
cd oorep-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

### Development Workflow

```bash
# Run in development mode (with auto-reload)
npm run dev

# Type check
npm run typecheck

# Lint code
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Code Style Guidelines

### TypeScript

- Use **TypeScript strict mode** (already configured)
- Prefer **explicit types** over inference for function parameters and return types
- Use **Zod schemas** for runtime validation
- Avoid `any` types - use `unknown` and type guards instead
- Use **async/await** instead of raw promises

### Code Organization

- **One class/interface per file** (with exceptions for closely related types)
- **Collocate tests** with source files (`*.test.ts` next to `*.ts`)
- **Group imports** in this order:
  1. Node.js built-in modules
  2. External dependencies
  3. Internal modules (relative imports)
- **Export types and interfaces** explicitly

### Naming Conventions

- **Classes**: `PascalCase` (e.g., `OOREPClient`, `Cache`)
- **Functions/methods**: `camelCase` (e.g., `searchRepertory`, `validateInput`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_TIMEOUT_MS`)
- **Interfaces**: `PascalCase` (e.g., `OOREPConfig`, `CacheEntry`)
- **Type aliases**: `PascalCase` (e.g., `LogLevel`, `ToolDefinition`)

### Documentation

- **JSDoc comments** for all public functions, classes, and interfaces
- **Inline comments** for complex logic
- **README updates** for new features or behavior changes
- **CHANGELOG updates** following [Keep a Changelog](https://keepachangelog.com/) format

### Example

```typescript
/**
 * Search for symptoms in homeopathic repertories
 * @param symptom - The symptom to search for
 * @param repertory - Optional specific repertory to search
 * @returns Promise resolving to search results
 * @throws {ValidationError} If symptom is invalid
 * @throws {NetworkError} If API request fails
 */
async function searchRepertory(
  symptom: string,
  repertory?: string
): Promise<RepertorySearchResult> {
  // Validate input
  validateSymptom(symptom);

  // Perform search
  const results = await client.searchRepertory({
    symptom,
    repertory,
  });

  return results;
}
```

## Testing Guidelines

### Writing Tests

- **Test coverage** should be ≥ 85% for lines and functions
- **Test all code paths** including error cases
- **Use descriptive test names** in "when X then Y" format
- **Group related tests** with `describe` blocks
- **Mock external dependencies** (HTTP calls, file system, etc.)
- **Clean up** in `afterEach` hooks

### Test Structure

```typescript
describe('MyClass', () => {
  describe('myMethod', () => {
    it('when valid input then returns expected result', () => {
      // Arrange
      const instance = new MyClass();
      const input = 'valid';

      // Act
      const result = instance.myMethod(input);

      // Assert
      expect(result).toBe('expected');
    });

    it('when invalid input then throws ValidationError', () => {
      // Arrange
      const instance = new MyClass();
      const input = '';

      // Act & Assert
      expect(() => instance.myMethod(input)).toThrow(ValidationError);
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npx vitest run src/lib/cache.test.ts
```

## Commit Message Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring (no functional changes)
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, build config, etc.)
- `ci`: CI/CD changes

### Examples

```
feat(tools): add support for remedy comparison

fix(cache): resolve memory leak in Cache cleanup

docs(readme): add troubleshooting section

test(client): add tests for retry logic
```

## Pull Request Guidelines

### Before Submitting

- [ ] All tests pass (`npm test`)
- [ ] Code is linted (`npm run lint`)
- [ ] Code is formatted (`npm run format`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Documentation is updated (if applicable)
- [ ] CHANGELOG is updated (for user-facing changes)

### PR Description Template

```markdown
## Summary
Brief description of changes

## Motivation
Why is this change needed?

## Changes
- List of specific changes made
- Another change
- ...

## Testing
How was this tested?

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] CHANGELOG updated
- [ ] All CI checks pass
```

## Release Process

Releases are automated using GitHub Actions:

1. **Version bump** following semantic versioning
2. **Update CHANGELOG.md** with release notes
3. **Create GitHub release** with tag
4. **Publish to npm** automatically via CI

Regular contributors may request release privileges after several successful contributions.

## Getting Help

- **Questions?** Open a [GitHub Discussion](https://github.com/Dhi13man/oorep-mcp/discussions)
- **Bug reports**: Create an [issue](https://github.com/Dhi13man/oorep-mcp/issues)
- **Need clarification**: Comment on existing issues or PRs

## Recognition

Contributors are recognized in:
- Git commit history
- GitHub contributors page
- Release notes (for significant contributions)

Thank you for contributing to OOREP MCP Server! 🎉

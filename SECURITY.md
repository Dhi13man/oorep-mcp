# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.0.7   | :white_check_mark: |
| < 0.0.7 | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

1. **Do NOT** create a public GitHub issue for security vulnerabilities
2. Send an email to the maintainers through GitHub's private vulnerability reporting
3. Or open a [private security advisory](https://github.com/Dhi13man/oorep-mcp/security/advisories/new)

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **Initial response**: Within 48 hours
- **Status update**: Within 7 days
- **Fix timeline**: Depends on severity (critical: 24-48h, high: 7 days, medium: 30 days)

## Security Measures

### Input Validation

All user inputs are validated using Zod schemas before processing:

- **Symptom searches**: 3-200 characters, alphanumeric with limited special characters
- **Remedy names**: 1-100 characters
- **Wildcards**: Only at word boundaries (no mid-word wildcards)
- **Invalid characters**: `@`, `#`, `$`, etc. are rejected

### Error Handling

- All errors are sanitized before being returned to clients
- Internal error details (stack traces, file paths) are never exposed
- Network errors return generic messages

### No Credential Storage

- The server does not store any user credentials
- OOREP sessions are anonymous and cookie-based
- No sensitive data is persisted to disk

### Dependencies

- All dependencies are regularly updated
- Security vulnerabilities are monitored via GitHub Dependabot
- CodeQL scanning is enabled for static analysis

## Security Best Practices for Users

### Environment Variables

```bash
# Never commit .env files with secrets
# Use environment-specific configurations
OOREP_MCP_LOG_LEVEL=info  # Use 'error' in production
```

### Network Security

- The server only makes outbound HTTPS requests to OOREP
- No inbound network connections are opened (stdio transport only)
- All API communication uses TLS 1.2+

### Logging

- Set `OOREP_MCP_LOG_LEVEL=error` in production to minimize log output
- Debug logs may contain request details - use only for development

## Known Limitations

1. **No rate limiting**: The server does not implement rate limiting. If OOREP implements rate limits, you may receive RateLimitError responses.

2. **Cache in memory**: Search results are cached in memory. Restarting the server clears all cached data.

3. **No encryption at rest**: No data is persisted, so encryption at rest is not applicable.

## Acknowledgments

We thank the security research community for responsibly disclosing vulnerabilities.

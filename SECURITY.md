# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

1. **Do not** open a public GitHub issue for security vulnerabilities.
2. Submit a [private vulnerability report](https://github.com/Dhi13man/oorep-mcp/security/advisories/new).
3. If private reporting is unavailable, email **<dhiman.seal@hotmail.com>**.
4. Include the following information:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- The maintainer will acknowledge the report and coordinate validation privately.
- Remediation and disclosure timing depends on severity, exploitability, and the
  availability of a safe fix.
- Please allow reasonable time for a patch and package release before disclosure.

### Disclosure Policy

- We follow responsible disclosure practices
- Security fixes will be released as patch versions
- Credit will be given to reporters (unless anonymity is requested)
- Public disclosure after fix is released and users have time to update

## Security Measures

This project implements the following security practices:

- **Input Validation**: All inputs validated using Zod schemas
- **Error Sanitization**: Internal errors are sanitized before exposure
- **No Secrets**: No credentials stored or required
- **Dependency Scanning**: Dependabot enabled for automated updates
- **CodeQL Analysis**: Weekly security scans via GitHub Actions
- **Minimal Dependencies**: Only 2 production dependencies

## Scope

The following are in scope for security reports:

- Code in this repository
- npm package `oorep-mcp`
- Security of MCP protocol implementation

Out of scope:

- OOREP API (report to OOREP maintainers)
- Third-party dependencies (report to respective maintainers)
- Social engineering attacks

## Contact

- **Maintainer**: Dhiman Seal
- **Email**: <dhiman.seal@hotmail.com>
- **GitHub**: [@Dhi13man](https://github.com/Dhi13man)

# SecretCloak MCP

> Ephemeral Synthetic Token Injector & Zero-Leak Credential Vault for Autonomous Coding Agents.

[![MCP 2026-07-28](https://img.shields.io/badge/MCP-2026--07--28-blue.svg)](https://modelcontextprotocol.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## The Problem
When autonomous agents are instructed to debug API interactions or setup test environments, they frequently compromise sensitive credentials:
1. **Context Spills**: Reading `.env` files into LLM context, which persists in conversation transcripts and third-party AI provider logs.
2. **Accidental Commits**: Committing real tokens (`sk_live_...`, `AKIA...`, JWTs) to git branches or pull requests.
3. **Terminal Leaks**: Printing authorization tokens into bash output.

## The Solution
SecretCloak MCP implements an in-memory synthetic vault architecture:
- **Synthetic Token Substitution**: Replaces live credentials with deterministic handles (`$VAULT:TOKEN_TYPE_HASH`).
- **PreToolUse Hard Block**: Exit code 2 blocks any agent attempts to cat, dump, or git-add `.env` or `.pem` files.
- **In-Memory Subprocess Injection**: Swaps synthetic handles for real tokens in memory at the exact execution boundary without persisting secrets to disk or agent context.
- **Repository Leak Auditor**: Scans staged diffs and source code for unmasked high-entropy tokens.

## Available MCP Tools

### `mask_secrets`
Redacts credentials from text and returns synthetic vault handles.

### `unmask_for_execution`
Resolves synthetic handles to real credentials in memory for authorized command dispatch.

### `audit_repository_secrets`
Scans codebase files for unmasked credentials with exact file and line coordinates.

## Live Verification
```bash
node tests/run_live_test.mjs
```

## License
MIT © 2026 SecretCloak Systems

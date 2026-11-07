---
name: secretcloak
description: Ephemeral Synthetic Token Injector & Zero-Leak Credential Vault for Autonomous Coding Agents.
version: 1.0.0
tags:
  - security
  - secret-redaction
  - env-firewall
  - credentials
  - zero-leak
  - synthetic-tokens
---

# SecretCloak: Zero-Leak Credential Vault & Synthetic Token Injector

SecretCloak prevents autonomous coding agents from exposing production secrets, API keys, and database passwords to LLM context windows, log files, or git commits.

## The Problem

Autonomous agents frequently compromise security credentials through normal development activities:
1. **Context Ingestion**: The agent executes `cat .env` or reads configuration files into context, leaking live AWS/Stripe keys to external LLM providers and disk transcripts.
2. **Commit Accidents**: The agent stages `.env` or creates a test fixture containing live credentials, committing it directly to Git.
3. **Stdout Spills**: Verbose curl or debug statements echo Authorization headers into terminal output.

## Core Capabilities

1. **Synthetic Token Masking**:
   - Replaces high-entropy tokens (`sk_live_...`, `AKIA...`, `ghp_...`, Bearer tokens) with synthetic handles (`$VAULT:TOKEN_ID`).
2. **Ephemeral In-Memory Unmasking**:
   - Injects real secrets into subprocess environments in memory at the exact execution boundary, with zero disk or context persistence.
3. **Hard PreToolUse `.env` Interceptor**:
   - Exit code 2 blocks any command attempting to read, dump, or commit `.env` or `.pem` files.
4. **Credential Leak Scanner**:
   - Scans commits and code diffs for entropy spikes and known secret patterns before pushing.

## Available MCP Tools

- `mask_secrets`: Sanitizes text or JSON by replacing sensitive credentials with synthetic vault handles.
- `unmask_for_execution`: Swaps synthetic handles with actual secrets in-memory for authorized command execution.
- `audit_repository_secrets`: Scans repository files or staging diffs for credential leaks.

## Hook Integration

SecretCloak installs a `PreToolUse` hook in `hooks/hooks.json` that blocks reading or committing raw `.env` files and redacts secrets from tool outputs.

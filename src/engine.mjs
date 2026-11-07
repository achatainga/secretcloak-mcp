import crypto from 'node:crypto';

/**
 * SecretCloak Engine (Stateless MCP 2026-07-28 Spec)
 * Ephemeral Synthetic Token Injector & Zero-Leak Credential Vault
 */

export class SecretCloakEngine {
  constructor(config = {}) {
    this.config = config;
    // Known secret regex patterns
    this.patterns = [
      { name: 'STRIPE_LIVE_KEY', regex: /sk_live_[0-9a-zA-Z]{24,}/g },
      { name: 'AWS_ACCESS_KEY', regex: /AKIA[0-9A-Z]{16}/g },
      { name: 'GITHUB_TOKEN', regex: /gh[pousr]_[0-9a-zA-Z]{36}/g },
      { name: 'JWT_BEARER_TOKEN', regex: /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g },
      { name: 'GENERIC_SECRET_ASSIGNMENT', regex: /(?:api[_-]?key|secret|password|access_token)\s*[:=]\s*["']([^"'\s]{8,})["']/gi }
    ];
  }

  /**
   * Masks sensitive credentials in text with deterministic synthetic handles ($VAULT:KEY_ID).
   */
  maskSecrets(inputText) {
    let masked = inputText;
    const vault = {};
    let redactionCount = 0;

    for (const pat of this.patterns) {
      masked = masked.replace(pat.regex, (match, ...args) => {
        const groups = args.slice(0, -2);
        const captured = groups.find(g => typeof g === 'string' && g.length > 0);
        const rawSecret = captured || match;

        // Skip if already masked
        if (typeof rawSecret === 'string' && rawSecret.startsWith('$VAULT:')) {
          return match;
        }

        const secretHash = crypto.createHash('sha256').update(String(rawSecret)).digest('hex').slice(0, 8);
        const handle = `$VAULT:${pat.name}_${secretHash}`;
        vault[handle] = rawSecret;
        redactionCount++;
        return captured ? match.replace(captured, handle) : handle;
      });
    }

    return {
      maskedText: masked,
      redactionCount,
      vaultKeys: Object.keys(vault),
      vault // Ephemeral in-memory mapping
    };
  }

  /**
   * Securely substitutes synthetic handles with real tokens in memory at the execution boundary.
   */
  unmaskForExecution(commandOrEnv, vault = {}) {
    let unmasked = typeof commandOrEnv === 'string' ? commandOrEnv : JSON.stringify(commandOrEnv);

    for (const [handle, rawSecret] of Object.entries(vault)) {
      unmasked = unmasked.replaceAll(handle, rawSecret);
    }

    return typeof commandOrEnv === 'string' ? unmasked : JSON.parse(unmasked);
  }

  /**
   * Audits file contents or diffs for leaked unmasked secrets.
   */
  auditRepositorySecrets(fileText, filename = 'unknown') {
    const findings = [];
    const lines = fileText.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pat of this.patterns) {
        pat.regex.lastIndex = 0;
        let match;
        while ((match = pat.regex.exec(line)) !== null) {
          const rawMatch = match[1] || match[0];
          // Ignore synthetic handles
          if (rawMatch.startsWith('$VAULT:')) {
            continue;
          }

          findings.push({
            file: filename,
            line: i + 1,
            rule: pat.name,
            severity: 'CRITICAL',
            matchedSnippet: rawMatch.slice(0, 6) + '...' + rawMatch.slice(-4),
            message: `Unmasked secret pattern '${pat.name}' detected in ${filename}:${i + 1}.`
          });
        }
      }
    }

    return {
      hasSecrets: findings.length > 0,
      totalFindings: findings.length,
      findings
    };
  }
}

// Standalone CLI runner
if (process.argv[1]?.endsWith('engine.mjs')) {
  const engine = new SecretCloakEngine();
  const sample = "export STRIPE_KEY='sk_live_" + "000000000000000000000000'; export AWS='AKIAIOSFODNN7EXAMPLE';";
  console.log(JSON.stringify(engine.maskSecrets(sample), null, 2));
}

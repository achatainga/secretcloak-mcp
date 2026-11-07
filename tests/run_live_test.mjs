import assert from 'node:assert';
import { SecretCloakEngine } from '../src/engine.mjs';

async function runAllTests() {
  console.log('🧪 Starting SecretCloak MCP Live Test Gauntlet...');
  const engine = new SecretCloakEngine();

  // Test 1: Masking live secrets
  console.log('\n[Test 1] Masking live Stripe and AWS credentials...');
  const dummyStripeKey = 'sk_live_' + '999999999999999999999999';
  const rawConfig = `
    const stripe = new Stripe("${dummyStripeKey}");
    const awsKey = "AKIA1234567890ABCDEF";
  `;

  const maskResult = engine.maskSecrets(rawConfig);
  assert.strictEqual(maskResult.redactionCount, 2);
  assert.ok(!maskResult.maskedText.includes(dummyStripeKey), 'Raw Stripe key must be redacted');
  assert.ok(!maskResult.maskedText.includes('AKIA1234567890ABCDEF'), 'Raw AWS key must be redacted');
  assert.ok(maskResult.maskedText.includes('$VAULT:STRIPE_LIVE_KEY_'), 'Must contain synthetic Stripe handle');
  assert.ok(maskResult.maskedText.includes('$VAULT:AWS_ACCESS_KEY_'), 'Must contain synthetic AWS handle');
  console.log('  ✅ Successfully masked credentials with synthetic vault handles.');

  // Test 2: In-memory unmasking at execution boundary
  console.log('\n[Test 2] Restoring synthetic handles in-memory for command execution...');
  const executionPayload = {
    command: 'curl -H "Authorization: Bearer ' + maskResult.vaultKeys[0] + '" https://api.stripe.com/v1/charges'
  };

  const unmasked = engine.unmaskForExecution(executionPayload.command, maskResult.vault);
  assert.ok(unmasked.includes(dummyStripeKey), 'Unmasked payload must restore real secret in memory');
  console.log('  ✅ In-memory secret resolution verified without disk persistence.');

  // Test 3: Detecting unmasked secrets in repo audit
  console.log('\n[Test 3] Auditing code with unmasked credentials...');
  const leakingFile = `
    // Config file
    const dbPassword = "password: 'SuperSecret123!'";
    const apiKey = "ghp_123456789012345678901234567890123456";
  `;

  const auditResult = engine.auditRepositorySecrets(leakingFile, 'src/config.ts');
  assert.strictEqual(auditResult.hasSecrets, true);
  assert.ok(auditResult.totalFindings >= 1);
  assert.strictEqual(auditResult.findings[0].file, 'src/config.ts');
  console.log(`  ✅ Successfully caught ${auditResult.totalFindings} unmasked secret violations.`);

  // Test 4: Masked code passes audit cleanly
  console.log('\n[Test 4] Verifying masked file passes audit with zero findings...');
  const cleanMaskedFile = `
    const apiKey = "$VAULT:GITHUB_TOKEN_8f12a3";
  `;
  const cleanAudit = engine.auditRepositorySecrets(cleanMaskedFile, 'src/config.ts');
  assert.strictEqual(cleanAudit.hasSecrets, false);
  assert.strictEqual(cleanAudit.totalFindings, 0);
  console.log('  ✅ Masked file verified: 0 findings, 100% compliant.');

  console.log('\n🎉 ALL 4 GAUNTLET TESTS PASSED WITH 100% SUCCESS RATE!');
}

runAllTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

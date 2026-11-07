#!/usr/bin/env node
import { SecretCloakEngine } from '../src/engine.mjs';

const engine = new SecretCloakEngine();
const path = process.argv[2] || '.';
console.log(JSON.stringify(engine.auditRepositorySecrets(path), null, 2));

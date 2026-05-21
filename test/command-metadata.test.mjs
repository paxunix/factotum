import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeCommandRecord } from '../src/sw/validation.js';

test('defaults command version to 1 when omitted', () => {
  const command = normalizeCommandRecord({
    schemaVersion: 1,
    name: 'ok',
    id: 'demo.ok',
    world: 'user_script',
    code: 'async function main() { return 42; }'
  }, 1760100000000);

  assert.equal(command.version, '1');
});

test('preserves command version as a string', () => {
  const command = normalizeCommandRecord({
    schemaVersion: 1,
    name: 'ok',
    id: 'demo.ok',
    version: 7,
    world: 'user_script',
    code: 'async function main() { return 42; }'
  }, 1760100000000);

  assert.equal(command.version, '7');
});

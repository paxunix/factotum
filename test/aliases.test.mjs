import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveCommand } from '../src/sw/omnibox.js';
import { normalizeAliasMap } from '../src/sw/validation.js';

test('normalizes alias maps into de-duplicated target arrays', () => {
  assert.deepEqual(normalizeAliasMap({
    cmd1: { name: 'pick', id: 'fixture.A' },
    cmd2: [
      { name: 'pick', id: 'fixture.A' },
      { name: 'pick', id: 'fixture.A' },
      { name: 'pick', id: 'fixture.B' }
    ]
  }), {
    cmd1: [{ name: 'pick', id: 'fixture.A' }],
    cmd2: [
      { name: 'pick', id: 'fixture.A' },
      { name: 'pick', id: 'fixture.B' }
    ]
  });
});

test('exact alias resolution picks the highest-MRU enabled target', () => {
  const commands = [
    { name: 'pick', id: 'fixture.A', updatedAt: 1, mruAt: 10, disabled: false },
    { name: 'pick', id: 'fixture.B', updatedAt: 2, mruAt: 20, disabled: false },
    { name: 'pick', id: 'fixture.C', updatedAt: 3, mruAt: 30, disabled: true }
  ];
  const aliases = {
    cmd1: [
      { name: 'pick', id: 'fixture.A' },
      { name: 'pick', id: 'fixture.B' },
      { name: 'pick', id: 'fixture.C' }
    ]
  };

  const resolution = resolveCommand(commands, aliases, 'cmd1');

  assert.equal(resolution.ok, true);
  assert.equal(resolution.resolutionType, 'alias');
  assert.equal(resolution.command.name, 'pick');
  assert.equal(resolution.command.id, 'fixture.B');
});

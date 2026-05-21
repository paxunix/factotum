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
  assert.equal(resolution.resolutionType, 'exact-alias');
  assert.equal(resolution.command.name, 'pick');
  assert.equal(resolution.command.id, 'fixture.B');
});

test('prefix resolution ranks exact names before exact aliases and name prefixes', () => {
  const commands = [
    { name: 'pick', id: 'fixture.A', updatedAt: 1, mruAt: 10, disabled: false },
    { name: 'picker', id: 'fixture.B', updatedAt: 2, mruAt: 50, disabled: false },
    { name: 'archive', id: 'fixture.C', updatedAt: 3, mruAt: 40, disabled: false }
  ];
  const aliases = {
    pick: [{ name: 'archive', id: 'fixture.C' }],
    pi: [{ name: 'picker', id: 'fixture.B' }]
  };

  const exactResolution = resolveCommand(commands, aliases, 'pick');
  assert.equal(exactResolution.ok, true);
  assert.equal(exactResolution.command.id, 'fixture.A');
  assert.equal(exactResolution.resolutionType, 'exact-name');

  const prefixResolution = resolveCommand(commands, aliases, 'pi');
  assert.equal(prefixResolution.ok, true);
  assert.deepEqual(prefixResolution.candidates.map((candidate) => candidate.command.id), ['fixture.B', 'fixture.A', 'fixture.C']);
  assert.deepEqual(prefixResolution.candidates.map((candidate) => candidate.matchKind), ['exact-alias', 'prefix-name', 'prefix-alias']);
});

test('prefix resolution is case-insensitive and omits disabled commands', () => {
  const commands = [
    { name: 'Pick', id: 'fixture.A', updatedAt: 1, mruAt: 10, disabled: false },
    { name: 'PICKER', id: 'fixture.B', updatedAt: 2, mruAt: 20, disabled: true }
  ];
  const aliases = {
    PiAlt: [{ name: 'PICKER', id: 'fixture.B' }]
  };

  const resolution = resolveCommand(commands, aliases, 'pI');

  assert.equal(resolution.ok, true);
  assert.equal(resolution.command.id, 'fixture.A');
  assert.deepEqual(resolution.candidates.map((candidate) => candidate.command.id), ['fixture.A']);
});

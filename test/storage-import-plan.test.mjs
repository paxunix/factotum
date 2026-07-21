import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeImportBundle,
  planBundleImport
} from '../src/sw/storage.js';

function command(name, id, overrides = {}) {
  return {
    schemaVersion: 1,
    name,
    id,
    version: '1',
    world: 'user_script',
    code: 'async function main() {}',
    createdAt: 100,
    updatedAt: 100,
    ...overrides
  };
}

test('normalizes bundle import data before planning', () => {
  const normalized = normalizeImportBundle({
    bundleSchemaVersion: 1,
    commands: [
      command('pick', 'fixture.pick', { description: 'Pick things' })
    ],
    invalidCommands: [
      {
        name: 'broken',
        id: 'fixture.broken',
        validationError: { message: 'bad world' },
        command: { name: 'broken', id: 'fixture.broken', world: 'bad' }
      }
    ],
    aliases: {
      p: [
        { name: 'pick', id: 'fixture.pick' },
        { name: 'pick', id: 'fixture.pick' }
      ]
    }
  });

  assert.deepEqual(normalized.commands.map((item) => [item.name, item.id, item.description]), [
    ['pick', 'fixture.pick', { 'en-US': 'Pick things' }]
  ]);
  assert.deepEqual(normalized.invalidCommands.map((item) => [item.name, item.id, item.key, item.validationError.message]), [
    ['broken', 'fixture.broken', 'broken@fixture.broken', 'bad world']
  ]);
  assert.deepEqual(normalized.aliases, {
    p: [{ name: 'pick', id: 'fixture.pick' }]
  });
});

test('plans command overwrites, invalid quarantine, and alias collisions', () => {
  const normalized = normalizeImportBundle({
    bundleSchemaVersion: 1,
    commands: [
      command('pick', 'fixture.pick'),
      command('pick', 'fixture.pick', { code: 'async function main() { return 1; }' })
    ],
    invalidCommands: [
      {
        name: 'broken',
        id: 'fixture.broken',
        validationError: { message: 'bad world' },
        command: { name: 'broken', id: 'fixture.broken', world: 'bad' }
      },
      {
        name: 'pick',
        id: 'fixture.pick',
        command: { name: 'pick', id: 'fixture.pick' }
      }
    ],
    aliases: {
      p: [{ name: 'pick', id: 'fixture.pick' }],
      fresh: [{ name: 'broken', id: 'fixture.broken' }]
    }
  });

  const plan = planBundleImport(normalized, {
    existingCommands: [
      { name: 'pick', id: 'fixture.pick' },
      { name: 'broken', id: 'fixture.broken', invalid: true }
    ],
    existingAliases: {
      p: [{ name: 'old', id: 'fixture.old' }]
    },
    aliasMode: 'skip'
  });

  assert.deepEqual(plan.commandActions.map((action) => action.key), [
    'pick@fixture.pick',
    'pick@fixture.pick'
  ]);
  assert.deepEqual(plan.invalidCommandActions.map((action) => action.key), [
    'broken@fixture.broken',
    'pick@fixture.pick'
  ]);
  assert.deepEqual(plan.aliases, {
    p: [{ name: 'old', id: 'fixture.old' }],
    fresh: [{ name: 'broken', id: 'fixture.broken' }]
  });
  assert.deepEqual(plan.warnings.map((warning) => [warning.code, warning.key || warning.alias]), [
    ['DUPLICATE_COMMAND', 'pick@fixture.pick'],
    ['DUPLICATE_COMMAND', 'pick@fixture.pick'],
    ['DUPLICATE_COMMAND', 'pick@fixture.pick'],
    ['DUPLICATE_COMMAND', 'broken@fixture.broken'],
    ['INVALID_COMMAND_QUARANTINED', 'broken@fixture.broken'],
    ['DUPLICATE_INVALID_COMMAND', 'pick@fixture.pick'],
    ['DUPLICATE_COMMAND', 'pick@fixture.pick'],
    ['INVALID_COMMAND_QUARANTINED', 'pick@fixture.pick'],
    ['ALIAS_COLLISION', 'p']
  ]);
});

test('plans alias overwrite mode as full substitution for incoming aliases', () => {
  const normalized = normalizeImportBundle({
    bundleSchemaVersion: 1,
    aliases: {
      p: [{ name: 'pick', id: 'fixture.pick' }]
    }
  });

  const plan = planBundleImport(normalized, {
    existingAliases: {
      p: [{ name: 'old', id: 'fixture.old' }],
      keep: [{ name: 'keep', id: 'fixture.keep' }]
    },
    aliasMode: 'overwrite'
  });

  assert.deepEqual(plan.aliases, {
    p: [{ name: 'pick', id: 'fixture.pick' }],
    keep: [{ name: 'keep', id: 'fixture.keep' }]
  });
  assert.deepEqual(plan.warnings, []);
});

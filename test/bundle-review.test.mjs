import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildBundleReviewModel,
  buildReviewedBundle,
  determineReviewState,
  getVisibleBundleReviewItems,
  selectVisibleBundleReviewItems
} from '../src/ui/bundle_review.js';
import { normalizeAliasMap, normalizeCommandRecord } from '../src/sw/validation.js';

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

function buildReview({ bundle, installedEntries = [], installedAliases = {} }) {
  return buildBundleReviewModel({
    bundle,
    installedEntries,
    installedAliases,
    normalizeAliasMap,
    normalizeCommandRecord,
    resolveDescription: (description) => description?.['en-US'] || '',
    invalidDescription: 'Invalid command'
  });
}

test('determines review state for valid and invalid overwrite cases', () => {
  const existingValid = {
    invalid: false,
    record: command('pick', 'fixture.pick', { code: 'async function main() { return 1; }' })
  };
  const existingInvalid = {
    invalid: true,
    rawRecord: { name: 'pick', id: 'fixture.pick', world: 'bad' }
  };

  assert.equal(determineReviewState(null, command('pick', 'fixture.pick')), 'new');
  assert.equal(determineReviewState(existingValid, existingValid.record), 'same');
  assert.equal(determineReviewState(existingValid, command('pick', 'fixture.pick')), 'overwrite');
  assert.equal(determineReviewState(existingInvalid, command('pick', 'fixture.pick')), 'overwrite-invalid');
  assert.equal(determineReviewState(existingInvalid, existingInvalid.rawRecord, true), 'same');
  assert.equal(determineReviewState(existingValid, { name: 'pick' }, true), 'overwrite-valid');
});

test('builds review model with command, invalid command, and alias states', () => {
  const installedRecord = normalizeCommandRecord(command('pick', 'fixture.pick'));
  const review = buildReview({
    bundle: {
      exportedAt: 123,
      commands: [
        installedRecord,
        command('clean', 'fixture.clean', { description: { 'en-US': 'Clean things' } })
      ],
      invalidCommands: [
        {
          name: 'broken',
          id: 'fixture.broken',
          command: { name: 'broken', id: 'fixture.broken' },
          validationError: { message: 'bad world' }
        }
      ],
      aliases: {
        p: [{ name: 'pick', id: 'fixture.pick' }],
        c: [{ name: 'clean', id: 'fixture.clean' }]
      }
    },
    installedEntries: [
      { key: 'pick@fixture.pick', invalid: false, record: installedRecord },
      { key: 'broken@fixture.broken', invalid: true, rawRecord: { name: 'old', id: 'fixture.broken' } }
    ],
    installedAliases: {
      p: [{ name: 'pick', id: 'fixture.pick' }]
    }
  });

  assert.deepEqual(review.commands.map((item) => [item.key, item.state, item.detail, item.aliases]), [
    ['pick@fixture.pick', 'same', '', ['p']],
    ['clean@fixture.clean', 'new', 'Clean things', ['c']]
  ]);
  assert.deepEqual(review.invalidCommands.map((item) => [item.key, item.state, item.detail]), [
    ['broken@fixture.broken', 'overwrite-invalid', 'bad world']
  ]);
  assert.deepEqual(review.aliases.map((item) => [item.alias, item.state, item.detail]), [
    ['p', 'same', 'pick@fixture.pick'],
    ['c', 'new', 'clean@fixture.clean']
  ]);
});

test('filters and sorts visible review items independently by kind', () => {
  const review = buildReview({
    bundle: {
      commands: [
        command('zeta', 'fixture.z', { updatedAt: 300 }),
        command('alpha', 'fixture.a', { updatedAt: 100 }),
        command('middle', 'fixture.m', { updatedAt: 200 })
      ],
      aliases: {
        z: [{ name: 'zeta', id: 'fixture.z' }],
        a: [{ name: 'alpha', id: 'fixture.a' }]
      }
    }
  });

  assert.deepEqual(
    getVisibleBundleReviewItems(review.commands, 'commands', {
      mode: 'export',
      commandsSortKey: 'updatedAt',
      commandsSortDirection: 'desc'
    }).map((item) => item.command.name),
    ['zeta', 'middle', 'alpha']
  );

  assert.deepEqual(
    getVisibleBundleReviewItems(review.aliases, 'aliases', {
      mode: 'export',
      aliasesFilter: 'fixture.a',
      aliasesSortKey: 'targets',
      aliasesSortDirection: 'asc'
    }).map((item) => item.alias),
    ['a']
  );
});

test('selection helpers affect only visible items and reviewed bundle output', () => {
  const review = buildReview({
    bundle: {
      exportedAt: 500,
      commands: [
        command('alpha', 'fixture.a'),
        command('zeta', 'fixture.z')
      ],
      invalidCommands: [
        {
          name: 'broken',
          id: 'fixture.broken',
          command: { name: 'broken', id: 'fixture.broken' }
        }
      ],
      aliases: {
        a: [{ name: 'alpha', id: 'fixture.a' }],
        z: [{ name: 'zeta', id: 'fixture.z' }]
      }
    }
  });

  selectVisibleBundleReviewItems(review, 'commands', false, {
    mode: 'export',
    commandsFilter: 'alpha',
    commandsSortKey: 'name',
    commandsSortDirection: 'asc'
  });
  review.invalidCommands[0].selected = false;
  review.aliases[1].selected = false;

  const reviewedBundle = buildReviewedBundle(review, 999);

  assert.deepEqual(review.commands.map((item) => [item.command.name, item.selected]), [
    ['alpha', false],
    ['zeta', true]
  ]);
  assert.deepEqual(reviewedBundle.commands.map((item) => item.name), ['zeta']);
  assert.equal(reviewedBundle.invalidCommands, undefined);
  assert.deepEqual(Object.keys(reviewedBundle.aliases), ['a']);
  assert.equal(reviewedBundle.exportedAt, 500);
});

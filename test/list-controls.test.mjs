import assert from 'node:assert/strict';
import test from 'node:test';

import {
  compareCommandValues,
  filterAndSortListItems,
  getSortDirectionIconName,
  itemMatchesTextFilter,
  toggleSortDirection
} from '../src/ui/list_controls.js';

test('toggles sort direction and normalizes invalid values', () => {
  assert.equal(toggleSortDirection('asc'), 'desc');
  assert.equal(toggleSortDirection('desc'), 'asc');
  assert.equal(toggleSortDirection('bogus'), 'desc');
});

test('maps sort direction state to accurate icon names', () => {
  assert.equal(getSortDirectionIconName('updatedAt', 'asc'), 'arrowDown19');
  assert.equal(getSortDirectionIconName('updatedAt', 'desc'), 'arrowUp91');
  assert.equal(getSortDirectionIconName('name', 'asc'), 'arrowDownAZ');
  assert.equal(getSortDirectionIconName('id', 'desc'), 'arrowUpZA');
});

test('compares command records by configured sort key', () => {
  const alpha = { name: 'alpha', id: 'fixture.b', updatedAt: 100 };
  const zeta = { name: 'zeta', id: 'fixture.a', updatedAt: 200 };

  assert.equal(Math.sign(compareCommandValues(alpha, zeta, 'name')), -1);
  assert.equal(Math.sign(compareCommandValues(alpha, zeta, 'id')), 1);
  assert.equal(Math.sign(compareCommandValues(alpha, zeta, 'updatedAt')), -1);
});

test('matches text filters case-insensitively across provided values', () => {
  const item = { name: 'Pick', id: 'fixture.pick', aliases: ['choose'] };
  const values = (value) => [value.name, value.id, ...value.aliases];

  assert.equal(itemMatchesTextFilter(item, 'PICK', values), true);
  assert.equal(itemMatchesTextFilter(item, 'choose', values), true);
  assert.equal(itemMatchesTextFilter(item, 'missing', values), false);
});

test('filters and sorts list items with shared mechanics', () => {
  const items = [
    { name: 'zeta', id: 'fixture.z', updatedAt: 300 },
    { name: 'alpha', id: 'fixture.a', updatedAt: 100 },
    { name: 'middle', id: 'fixture.m', updatedAt: 200 }
  ];

  assert.deepEqual(
    filterAndSortListItems(items, {
      filterText: 'fixture',
      getFilterValues: (item) => [item.name, item.id],
      compareItems: (left, right) => compareCommandValues(left, right, 'updatedAt'),
      direction: 'desc'
    }).map((item) => item.name),
    ['zeta', 'middle', 'alpha']
  );
});

import assert from 'node:assert/strict';
import test from 'node:test';

import { formatMessage, getMessage } from '../src/shared/i18n.js';

const originalChrome = globalThis.chrome;

test.afterEach(() => {
  if (originalChrome === undefined) {
    delete globalThis.chrome;
  } else {
    globalThis.chrome = originalChrome;
  }
});

test('returns fallback when chrome i18n is unavailable or empty', () => {
  delete globalThis.chrome;
  assert.equal(getMessage('missingKey', 'Fallback'), 'Fallback');

  globalThis.chrome = {
    i18n: {
      getMessage() {
        return '';
      }
    }
  };
  assert.equal(getMessage('emptyKey', 'Fallback'), 'Fallback');
});

test('passes substitutions through to chrome i18n', () => {
  globalThis.chrome = {
    i18n: {
      getMessage(key, substitutions) {
        return `${key}:${substitutions.join(',')}`;
      }
    }
  };

  assert.equal(getMessage('hello', 'Fallback', ['one', 'two']), 'hello:one,two');
});

test('formats fallback placeholders when localized message is missing', () => {
  globalThis.chrome = {
    i18n: {
      getMessage() {
        return '';
      }
    }
  };

  assert.equal(formatMessage('countKey', 'Imported $COUNT$ command(s).', 3), 'Imported 3 command(s).');
  assert.equal(formatMessage('commandKey', 'Saved command: $COMMAND$', 'pick@demo'), 'Saved command: pick@demo');
});

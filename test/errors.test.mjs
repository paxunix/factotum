import assert from 'node:assert/strict';
import test from 'node:test';

import { createCodedError, deserializeError, serializeError } from '../src/shared/errors.js';

test('serializes standard error fields with fallback code', () => {
  const error = new TypeError('bad value');
  error.stack = 'STACK';

  assert.deepEqual(serializeError(error, 'BAD_VALUE'), {
    name: 'TypeError',
    message: 'bad value',
    stack: 'STACK',
    code: 'BAD_VALUE'
  });
});

test('preserves error code and details when serializing', () => {
  const error = createCodedError('RPC_FAILED', 'No such method', { method: 'tabs.nope' });
  error.stack = 'STACK';

  assert.deepEqual(serializeError(error, 'ERROR'), {
    name: 'Error',
    message: 'No such method',
    stack: 'STACK',
    code: 'RPC_FAILED',
    details: { method: 'tabs.nope' }
  });
});

test('serializes missing errors with fallback message and code', () => {
  assert.deepEqual(serializeError(null, 'INVALID_INVOCATION', 'Invocation ended unexpectedly.'), {
    message: 'Invocation ended unexpectedly.',
    code: 'INVALID_INVOCATION'
  });
});

test('deserializes error payloads back into Error instances', () => {
  const error = deserializeError({
    name: 'TypeError',
    message: 'bad value',
    stack: 'STACK',
    code: 'BAD_VALUE',
    details: { field: 'name' }
  });

  assert.equal(error instanceof Error, true);
  assert.equal(error.name, 'TypeError');
  assert.equal(error.message, 'bad value');
  assert.equal(error.stack, 'STACK');
  assert.equal(error.code, 'BAD_VALUE');
  assert.deepEqual(error.details, { field: 'name' });
});

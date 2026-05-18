import assert from 'node:assert/strict';
import test from 'node:test';

import { parseCommandArgv } from '../src/sw/argv.mjs';

test('maps short and long aliases to canonical option names', () => {
  const optionsSpec = {
    args: '<word...>',
    options: [
      {
        flags: ['-d', '--delete'],
        value: 'boolean',
        default: false
      }
    ]
  };

  assert.deepEqual(parseCommandArgv(['alpha', '--delete'], optionsSpec), {
    tokens: ['alpha', '--delete'],
    positionals: ['alpha'],
    options: {
      delete: true
    }
  });

  assert.deepEqual(parseCommandArgv(['alpha', '-d'], optionsSpec), {
    tokens: ['alpha', '-d'],
    positionals: ['alpha'],
    options: {
      delete: true
    }
  });
});

test('applies typed values and defaults from optionsSpec', () => {
  const optionsSpec = {
    options: [
      {
        flags: ['--name'],
        value: 'string'
      },
      {
        flags: ['--limit'],
        value: 'number',
        default: 10
      }
    ]
  };

  assert.deepEqual(parseCommandArgv(['--name', 'bookmarks'], optionsSpec), {
    tokens: ['--name', 'bookmarks'],
    positionals: [],
    options: {
      name: 'bookmarks',
      limit: 10
    }
  });

  assert.deepEqual(parseCommandArgv(['--limit=3'], optionsSpec), {
    tokens: ['--limit=3'],
    positionals: [],
    options: {
      limit: 3
    }
  });
});

test('rejects unknown flags when optionsSpec declares options', () => {
  const optionsSpec = {
    options: [
      {
        flags: ['--delete'],
        value: 'boolean'
      }
    ]
  };

  assert.throws(
    () => parseCommandArgv(['--bogus'], optionsSpec),
    (error) => error.code === 'UNKNOWN_OPTION' && error.option === '--bogus'
  );
});

test('uses parser semantics for combined shorts, --, and --flag=value', () => {
  const optionsSpec = {
    options: [
      {
        flags: ['-a', '--alpha'],
        value: 'boolean'
      },
      {
        flags: ['-b', '--beta'],
        value: 'boolean'
      },
      {
        flags: ['--limit'],
        value: 'number'
      }
    ]
  };

  assert.deepEqual(parseCommandArgv(['-ab', '--limit=3'], optionsSpec), {
    tokens: ['-ab', '--limit=3'],
    positionals: [],
    options: {
      alpha: true,
      beta: true,
      limit: 3
    }
  });

  assert.deepEqual(parseCommandArgv(['--', '--not-an-option'], optionsSpec), {
    tokens: ['--', '--not-an-option'],
    positionals: ['--not-an-option'],
    options: {}
  });

  assert.throws(
    () => parseCommandArgv(['-ac'], optionsSpec),
    (error) => error.code === 'UNKNOWN_OPTION' && error.option === '-c'
  );
});

test('validates required options', () => {
  const optionsSpec = {
    options: [
      {
        flags: ['--query'],
        value: 'string',
        required: true
      }
    ]
  };

  assert.throws(
    () => parseCommandArgv([], optionsSpec),
    (error) => error.code === 'MISSING_REQUIRED_OPTION' && error.option === 'query'
  );
});

test('always allows help flags for runtime handling', () => {
  const optionsSpec = {
    options: [
      {
        flags: ['--delete'],
        value: 'boolean'
      }
    ]
  };

  assert.deepEqual(parseCommandArgv(['--help'], optionsSpec), {
    tokens: ['--help'],
    positionals: [],
    options: {
      help: true
    }
  });

  assert.deepEqual(parseCommandArgv(['-h'], optionsSpec), {
    tokens: ['-h'],
    positionals: [],
    options: {
      help: true
    }
  });
});

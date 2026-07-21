import assert from 'node:assert/strict';
import test from 'node:test';

import { buildUserScriptRunnerCode } from '../src/sw/runner_template.js';

function buildRunnerCode(debug = false) {
  return buildUserScriptRunnerCode({
    invocation: {
      invocationId: 'inv-1',
      argv: {
        tokens: debug ? ['--debug'] : [],
        positionals: [],
        options: debug ? { debug: true } : {}
      },
      nonce: 'nonce-1',
      command: {
        name: 'demo',
        id: 'fixture.runner',
        world: 'user_script',
        code: 'async function main(argv, ctx) { ctx.out.info(argv.tokens); return 7; }'
      }
    },
    controlType: 'fcmd_control',
    requires: [
      {
        url: 'chrome-extension://ext/requires/demo.js',
        kind: 'module',
        world: 'user_script'
      }
    ],
    markerIds: {
      completion: 'completion-marker',
      cancel: 'cancel-marker',
      output: 'output-marker'
    },
    rpcUnsupported: {
      denylistedNamespaces: ['debugger', 'management'],
      eventMethods: ['addListener'],
      denylistedMethods: ['connect']
    }
  });
}

test('builds parseable runner code with user source before runtime wrapper', () => {
  const code = buildRunnerCode();

  assert.doesNotThrow(() => new Function(code));
  assert.ok(code.indexOf('BEGIN USER COMMAND SOURCE') < code.indexOf('async function main(argv, ctx)'));
  assert.ok(code.indexOf('async function main(argv, ctx)') < code.indexOf('END USER COMMAND SOURCE'));
  assert.ok(code.indexOf('END USER COMMAND SOURCE') < code.indexOf('const __factotumMeta'));
});

test('embeds debug stop, metadata, RPC control type, and sourceURL', () => {
  const code = buildRunnerCode(true);

  assert.match(code, /if \(true\) \{/);
  assert.match(code, /Factotum built-in --debug stop/);
  assert.match(code, /debugger;/);
  assert.match(code, /type: 'fcmd_control'/);
  assert.match(code, /# sourceURL=demo@fixture\.runner/);
  assert.match(code, /"completionMarkerId":"completion-marker"/);
  assert.match(code, /"cancelMarkerId":"cancel-marker"/);
  assert.match(code, /"outputMarkerId":"output-marker"/);
  assert.match(code, /"url":"chrome-extension:\/\/ext\/requires\/demo\.js"/);
  assert.match(code, /"denylistedNamespaces":\["debugger","management"\]/);
});

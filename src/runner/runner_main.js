const CONTROL_TYPE = 'fcmd_control';
const RUNNER_WORLD = 'main';
const activeRuns = new Map();

function serializeError(error) {
  return {
    name: error?.name || 'Error',
    message: error?.message || String(error),
    stack: error?.stack
  };
}

async function executeCommand(message, state) {
  const signal = {
    get aborted() {
      return state.aborted;
    }
  };

  const ctx = {
    signal,
    chrome: {},
    main: {},
    log: (...args) => console.log('[factotum command]', ...args),
    warn: (...args) => console.warn('[factotum command]', ...args),
    error: (...args) => console.error('[factotum command]', ...args)
  };

  const invoke = new Function('argvTokens', 'ctx', `
    let main;
    ${message.command.code}
    if (typeof main === 'function') {
      return main(argvTokens, ctx);
    }
    return undefined;
  `);

  return invoke(message.argvTokens, ctx);
}

chrome.runtime.onMessage.addListener((message) => {
  if (!message || message.type !== CONTROL_TYPE) {
    return undefined;
  }

  if (message.op === 'CANCEL') {
    const state = activeRuns.get(message.invocationId);
    if (state) {
      state.aborted = true;
    }
    return undefined;
  }

  if (message.op !== 'INIT_COMMAND' || message.world !== RUNNER_WORLD) {
    return undefined;
  }

  if (activeRuns.has(message.invocationId)) {
    return undefined;
  }

  const state = { aborted: false };
  activeRuns.set(message.invocationId, state);

  Promise.resolve()
    .then(() => executeCommand(message, state))
    .then(() => {
      chrome.runtime.sendMessage({
        type: CONTROL_TYPE,
        op: 'COMMAND_RESULT',
        invocationId: message.invocationId
      });
    })
    .catch((error) => {
      chrome.runtime.sendMessage({
        type: CONTROL_TYPE,
        op: 'COMMAND_ERROR',
        invocationId: message.invocationId,
        error: serializeError(error)
      });
    })
    .finally(() => {
      activeRuns.delete(message.invocationId);
    });

  return undefined;
});

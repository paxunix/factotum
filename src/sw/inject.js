import { markInvocationStart, resolveInvocationInput } from './dispatch.js';
import {
  cancelInvocation,
  clearInvocation,
  createInvocation,
  finishInvocation,
  getInvocationById,
  getInvocationByTabId,
  isTabBusy,
  updateInvocationStatus
} from './invocations.js';

const CONTROL_TYPE = 'fcmd_control';
const teardownTimers = new Map();

function getMessage(key, fallback) {
  return chrome.i18n.getMessage(key) || fallback;
}

function serializeError(error, fallbackCode = 'ERROR') {
  if (!error) {
    return { message: fallbackCode, code: fallbackCode };
  }

  return {
    name: error.name || 'Error',
    message: error.message || String(error),
    stack: error.stack,
    code: error.code || fallbackCode
  };
}

function isInjectableUrl(url) {
  return typeof url === 'string' && /^(https?|file):/i.test(url);
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab || null;
}

async function sendControlMessage(tabId, message) {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: CONTROL_TYPE,
      ...message
    });
  } catch (error) {
    if (!String(error.message || error).includes('Receiving end does not exist')) {
      throw error;
    }
  }
}

async function injectScript(tabId, file, world = 'ISOLATED') {
  await chrome.scripting.executeScript({
    target: { tabId, allFrames: false },
    files: [file],
    world
  });
}

async function ensureOverlay(tabId, invocation, state = 'RUNNING', message = '') {
  await injectScript(tabId, 'overlay/overlay.js', 'ISOLATED');
  await sendControlMessage(tabId, {
    op: 'INIT_OVERLAY',
    invocationId: invocation.invocationId,
    commandRef: `${invocation.command.name}@${invocation.command.id}`,
    state,
    message
  });
}

async function setOverlayStatus(tabId, invocationId, state, message = '') {
  await sendControlMessage(tabId, {
    op: 'SET_STATUS',
    invocationId,
    state,
    message
  });
}

async function teardownOverlay(tabId, invocationId) {
  await sendControlMessage(tabId, {
    op: 'TEARDOWN',
    invocationId
  });
}

function scheduleTeardown(invocation, delayMs = 1200) {
  const existing = teardownTimers.get(invocation.invocationId);
  if (existing) {
    clearTimeout(existing);
  }

  const timeoutId = setTimeout(async () => {
    teardownTimers.delete(invocation.invocationId);
    await teardownOverlay(invocation.tabId, invocation.invocationId);
    clearInvocation(invocation.invocationId);
  }, delayMs);

  teardownTimers.set(invocation.invocationId, timeoutId);
}

async function injectMainHost(tabId) {
  await injectScript(tabId, 'bridge/main_host.js', 'MAIN');
}

async function injectRunner(invocation) {
  const runnerFile = invocation.command.world === 'main'
    ? 'runner/runner_main.js'
    : 'runner/runner_isolated.js';
  const runnerWorld = invocation.command.world === 'main' ? 'MAIN' : 'ISOLATED';

  await injectScript(invocation.tabId, runnerFile, runnerWorld);
  await sendControlMessage(invocation.tabId, {
    op: 'INIT_COMMAND',
    invocationId: invocation.invocationId,
    world: invocation.command.world,
    command: invocation.command,
    argvTokens: invocation.argvTokens,
    parsedOpts: invocation.parsedOpts
  });
}

async function showTerminalOverlay(tabId, commandRef, state, message) {
  const invocation = {
    invocationId: `transient-${Date.now()}`,
    command: { name: commandRef, id: '' }
  };
  await ensureOverlay(tabId, invocation, state, message);
  await teardownOverlay(tabId, invocation.invocationId);
}

async function handleResolutionFailure(tab, resolution) {
  if (isInjectableUrl(tab?.url)) {
    const invocation = {
      invocationId: `transient-${Date.now()}`,
      command: { name: resolution.cmdToken || '', id: '' }
    };
    await ensureOverlay(tab.id, invocation, 'ERROR', resolution.message);
    setTimeout(() => {
      teardownOverlay(tab.id, invocation.invocationId).catch(() => {});
    }, 5000);
  }
}

async function handleBusyTab(tabId) {
  const runningInvocation = getInvocationByTabId(tabId);
  if (!runningInvocation) {
    return;
  }

  await setOverlayStatus(tabId, runningInvocation.invocationId, 'BUSY', getMessage('overlayBusy', 'Tab is busy.'));
  setTimeout(() => {
    const current = getInvocationById(runningInvocation.invocationId);
    if (current && current.status === 'RUNNING') {
      setOverlayStatus(tabId, current.invocationId, 'RUNNING', '').catch(() => {});
    }
  }, 1000);
}

async function executeResolvedInvocation(tab, resolution) {
  if (!isInjectableUrl(tab.url)) {
    console.error('[factotum] cannot inject into tab', tab.url);
    return {
      ok: false,
      code: 'CANNOT_INJECT',
      message: getMessage('overlayCannotInject', 'Cannot run on this page.')
    };
  }

  if (isTabBusy(tab.id)) {
    await handleBusyTab(tab.id);
    return {
      ok: false,
      code: 'TAB_BUSY',
      message: getMessage('overlayBusy', 'Tab is busy.')
    };
  }

  const invocation = createInvocation({
    tabId: tab.id,
    command: resolution.command,
    argvTokens: resolution.argvTokens,
    parsedOpts: resolution.parsedOpts,
    sourceText: resolution.effectiveCmdToken
  });

  invocation.mruAt = await markInvocationStart(resolution.command);

  await ensureOverlay(tab.id, invocation, 'RUNNING', '');
  await injectMainHost(tab.id);

  try {
    await injectRunner(invocation);
    return { ok: true, invocation };
  } catch (error) {
    const serialized = serializeError(error, 'ERROR');
    finishInvocation(invocation.invocationId, 'ERROR', { error: serialized });
    await setOverlayStatus(tab.id, invocation.invocationId, 'ERROR', serialized.message);
    scheduleTeardown(invocation, 5000);
    return { ok: false, code: serialized.code, message: serialized.message };
  }
}

export async function executeOmniboxInput(text) {
  const tab = await getActiveTab();
  if (!tab) {
    return;
  }

  const resolution = await resolveInvocationInput(text);
  if (!resolution.ok) {
    await handleResolutionFailure(tab, resolution);
    console.error('[factotum] invocation failed', resolution.code, resolution.message);
    return resolution;
  }

  const result = await executeResolvedInvocation(tab, resolution);
  if (result.ok) {
    console.log('[factotum] invocation started', {
      invocationId: result.invocation.invocationId,
      command: `${result.invocation.command.name}@${result.invocation.command.id}`,
      world: result.invocation.command.world,
      argvTokens: result.invocation.argvTokens
    });
    return result;
  }

  console.error('[factotum] invocation failed', result.code, result.message);
  return result;
}

export async function handleRuntimeControlMessage(message, sender) {
  if (!message || message.type !== CONTROL_TYPE) {
    return undefined;
  }

  if (message.op === 'CANCEL_REQUEST') {
    const invocation = getInvocationById(message.invocationId);
    if (invocation) {
      await requestCancel(invocation, 'CANCELED');
    }
    return undefined;
  }

  if (message.op === 'COMMAND_RESULT') {
    const invocation = finishInvocation(message.invocationId, 'DONE');
    if (invocation) {
      await setOverlayStatus(invocation.tabId, invocation.invocationId, 'DONE', getMessage('overlayDone', 'Done.'));
      scheduleTeardown(invocation, 1200);
    }
    return undefined;
  }

  if (message.op === 'COMMAND_ERROR') {
    const invocation = finishInvocation(message.invocationId, 'ERROR', {
      error: message.error
    });
    if (invocation) {
      await setOverlayStatus(invocation.tabId, invocation.invocationId, 'ERROR', message.error?.message || getMessage('overlayError', 'Command failed.'));
      scheduleTeardown(invocation, 5000);
    }
  }

  return undefined;
}

export async function requestCancel(invocation, reason = 'CANCELED') {
  const current = typeof invocation === 'string' ? getInvocationById(invocation) : invocation;
  if (!current) {
    return;
  }

  cancelInvocation(current.invocationId, reason);
  await sendControlMessage(current.tabId, {
    op: 'CANCEL',
    invocationId: current.invocationId
  });
  await setOverlayStatus(current.tabId, current.invocationId, 'CANCELED', getMessage('overlayCanceled', 'Canceled.'));
  scheduleTeardown(current, 2500);
}

export async function cancelForTabClose(tabId) {
  const invocation = getInvocationByTabId(tabId);
  if (!invocation) {
    return;
  }

  cancelInvocation(invocation.invocationId, 'CANCELED');
  clearInvocation(invocation.invocationId);
}

export async function cancelForNavigation(tabId) {
  const invocation = getInvocationByTabId(tabId);
  if (!invocation) {
    return;
  }

  await requestCancel(invocation, 'CANCELED');
}

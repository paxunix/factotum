import { markInvocationStart, resolveInvocationInput } from './dispatch.js';
import {
  cancelInvocation,
  clearInvocation,
  createInvocation,
  finishInvocation,
  getInvocationById,
  getInvocationByTabId,
  isTabBusy
} from './invocations.js';

const CONTROL_TYPE = 'fcmd_control';
const teardownTimers = new Map();
const invocationPorts = new Map();

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

async function isUserScriptsAvailable() {
  try {
    await chrome.userScripts.getScripts();
    return true;
  } catch {
    return false;
  }
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
    const text = String(error.message || error);
    if (!text.includes('Receiving end does not exist') && !text.includes('message channel is closed')) {
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
    invocationPorts.get(invocation.invocationId)?.disconnect();
    invocationPorts.delete(invocation.invocationId);
    try {
      await teardownOverlay(invocation.tabId, invocation.invocationId);
    } finally {
      clearInvocation(invocation.invocationId);
    }
  }, delayMs);

  teardownTimers.set(invocation.invocationId, timeoutId);
}

async function injectMainHost(tabId) {
  await injectScript(tabId, 'bridge/main_host.js', 'MAIN');
}

function buildExecuteCode(invocation) {
  const meta = JSON.stringify({
    invocationId: invocation.invocationId,
    argvTokens: invocation.argvTokens,
    world: invocation.command.world,
    commandRef: `${invocation.command.name}@${invocation.command.id}`,
    nonce: invocation.nonce
  });

  return `
    (async () => {
      const __factotumMeta = ${meta};
      const __factotumState = { aborted: false };
      const __factotumPort = chrome.runtime.connect({ name: __factotumMeta.invocationId });
      let __factotumCallSeq = 0;
      const __factotumPendingMainCalls = new Map();
      __factotumPort.onMessage.addListener((message) => {
        if (message && message.op === 'CANCEL') {
          __factotumState.aborted = true;
        }
      });

      const __factotumMainListener = (event) => {
        const data = event.data;
        if (!data || data.channel !== '__factotum_main_bridge__') {
          return;
        }
        if (data.invocationId !== __factotumMeta.invocationId || data.nonce !== __factotumMeta.nonce) {
          return;
        }
        const pending = __factotumPendingMainCalls.get(data.callId);
        if (!pending) {
          return;
        }
        __factotumPendingMainCalls.delete(data.callId);
        if (data.ok) {
          pending.resolve(data.result);
        } else {
          const error = new Error(data.error?.message || 'MAIN bridge call failed');
          error.name = data.error?.name || 'Error';
          error.code = data.error?.code || 'BRIDGE_FAILED';
          error.stack = data.error?.stack;
          pending.reject(error);
        }
      };
      window.addEventListener('message', __factotumMainListener);

      function __factotumSendMain(op, payload) {
        const callId = 'main-' + (++__factotumCallSeq);
        return new Promise((resolve, reject) => {
          __factotumPendingMainCalls.set(callId, { resolve, reject });
          window.postMessage({
            channel: '__factotum_main_bridge__',
            invocationId: __factotumMeta.invocationId,
            nonce: __factotumMeta.nonce,
            callId,
            op,
            ...payload
          }, '*');
        });
      }

      const ctx = {
        signal: {
          get aborted() {
            return __factotumState.aborted;
          }
        },
        chrome: new Proxy({}, {
          get() {
            throw new Error('ctx.chrome is not implemented yet.');
          }
        }),
        main: {
          define(name, fn) {
            if (typeof name !== 'string' || typeof fn !== 'function') {
              throw new Error('ctx.main.define(name, fn) requires a string name and function');
            }
            return __factotumSendMain('DEFINE', {
              name,
              source: fn.toString()
            });
          },
          call(name, args = []) {
            if (typeof name !== 'string') {
              throw new Error('ctx.main.call(name, args) requires a string name');
            }
            return __factotumSendMain('CALL', {
              name,
              args: Array.isArray(args) ? args : []
            });
          }
        },
        log(...args) {
          console.log('[factotum command]', ...args);
        },
        warn(...args) {
          console.warn('[factotum command]', ...args);
        },
        error(...args) {
          console.error('[factotum command]', ...args);
        }
      };

      try {
        chrome.runtime.sendMessage({
          type: CONTROL_TYPE,
          op: 'COMMAND_EVENT',
          invocationId: __factotumMeta.invocationId,
          event: 'started',
          detail: {
            commandRef: __factotumMeta.commandRef,
            world: __factotumMeta.world
          }
        });

        console.info('[factotum execute]', __factotumMeta.commandRef, __factotumMeta.world);
        const __factotumMain = (() => {
          ${invocation.command.code}
          return typeof main === 'function' ? main : undefined;
        })();
        if (typeof __factotumMain !== 'function') {
          chrome.runtime.sendMessage({
            type: CONTROL_TYPE,
            op: 'COMMAND_EVENT',
            invocationId: __factotumMeta.invocationId,
            event: 'no_main',
            detail: {
              commandRef: __factotumMeta.commandRef,
              world: __factotumMeta.world
            }
          });
          return undefined;
        }
        const __factotumResult = await __factotumMain(__factotumMeta.argvTokens, ctx);
        chrome.runtime.sendMessage({
          type: CONTROL_TYPE,
          op: 'COMMAND_EVENT',
          invocationId: __factotumMeta.invocationId,
          event: 'completed',
          detail: {
            commandRef: __factotumMeta.commandRef,
            world: __factotumMeta.world,
            mainDefined: true
          }
        });
        return __factotumResult;
      } finally {
        window.removeEventListener('message', __factotumMainListener);
        __factotumPort.disconnect();
      }
    })();
  `;
}

async function executeUserScript(invocation) {
  const world = invocation.command.world === 'main' ? 'MAIN' : 'USER_SCRIPT';
  const results = await chrome.userScripts.execute({
    target: {
      tabId: invocation.tabId,
      frameIds: [0]
    },
    js: [{ code: buildExecuteCode(invocation) }],
    world
  });

  return Array.isArray(results) ? results[0] : null;
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

async function finalizeInvocationSuccess(invocation, result) {
  const current = getInvocationById(invocation.invocationId);
  if (!current) {
    return { ok: false, code: 'INVALID_INVOCATION', message: 'Invocation ended unexpectedly.' };
  }

  if (current.canceled) {
    try {
      await setOverlayStatus(current.tabId, current.invocationId, 'CANCELED', getMessage('overlayCanceled', 'Canceled.'));
    } catch {}
    scheduleTeardown(current, 2500);
    return { ok: false, code: 'CANCELED', message: getMessage('overlayCanceled', 'Canceled.') };
  }

  finishInvocation(current.invocationId, 'DONE', { result });
  await setOverlayStatus(current.tabId, current.invocationId, 'DONE', getMessage('overlayDone', 'Done.'));
  scheduleTeardown(current, 1200);
  return { ok: true, invocation: current, result };
}

async function finalizeInvocationError(invocation, error) {
  const current = getInvocationById(invocation.invocationId);
  if (!current) {
    return { ok: false, code: 'INVALID_INVOCATION', message: 'Invocation ended unexpectedly.' };
  }

  const serialized = serializeError(error, 'ERROR');
  finishInvocation(current.invocationId, 'ERROR', { error: serialized });
  await setOverlayStatus(current.tabId, current.invocationId, 'ERROR', serialized.message);
  scheduleTeardown(current, 5000);
  return { ok: false, code: serialized.code, message: serialized.message };
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

  if (!await isUserScriptsAvailable()) {
    return {
      ok: false,
      code: 'USER_SCRIPTS_UNAVAILABLE',
      message: getMessage('overlayUserScriptsUnavailable', 'User Scripts is not enabled for this extension.')
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
    const injectionResult = await executeUserScript(invocation);
    if (injectionResult?.error) {
      throw Object.assign(new Error(injectionResult.error), { code: 'ERROR' });
    }

    return finalizeInvocationSuccess(invocation, injectionResult?.result ?? injectionResult);
  } catch (error) {
    return finalizeInvocationError(invocation, error);
  }
}

export async function configureUserScriptWorld() {
  if (!await isUserScriptsAvailable()) {
    return false;
  }

  await chrome.userScripts.configureWorld({
    messaging: true,
    csp: "script-src 'self'"
  });
  return true;
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
    console.log('[factotum] invocation finished', {
      invocationId: result.invocation.invocationId,
      command: `${result.invocation.command.name}@${result.invocation.command.id}`,
      world: result.invocation.command.world,
      execution: result.invocation.execution || null
    });
    return result;
  }

  console.error('[factotum] invocation failed', result.code, result.message);
  return result;
}

function handleCommandEvent(message) {
  const invocation = getInvocationById(message.invocationId);
  if (invocation) {
    invocation.execution = {
      ...(invocation.execution || {}),
      lastEvent: message.event,
      detail: message.detail || null
    };
  }
}

export async function handleRuntimeControlMessage(message) {
  if (!message || message.type !== CONTROL_TYPE) {
    return undefined;
  }

  if (message.op === 'COMMAND_EVENT') {
    handleCommandEvent(message);
    return undefined;
  }

  if (message.op === 'CANCEL_REQUEST') {
    const invocation = getInvocationById(message.invocationId);
    if (invocation) {
      await requestCancel(invocation, 'CANCELED');
    }
  }

  return undefined;
}

export async function handleUserScriptMessage(message) {
  if (!message || message.type !== CONTROL_TYPE) {
    return undefined;
  }

  if (message.op === 'COMMAND_EVENT') {
    handleCommandEvent(message);
  }

  return undefined;
}

export function handleUserScriptConnect(port) {
  const invocation = getInvocationById(port.name);
  if (!invocation) {
    port.disconnect();
    return;
  }

  invocationPorts.set(invocation.invocationId, port);

  if (invocation.canceled) {
    port.postMessage({ op: 'CANCEL' });
  }

  port.onDisconnect.addListener(() => {
    if (invocationPorts.get(invocation.invocationId) === port) {
      invocationPorts.delete(invocation.invocationId);
    }
  });
}

export async function requestCancel(invocation, reason = 'CANCELED') {
  const current = typeof invocation === 'string' ? getInvocationById(invocation) : invocation;
  if (!current) {
    return;
  }

  cancelInvocation(current.invocationId, reason);
  try {
    invocationPorts.get(current.invocationId)?.postMessage({ op: 'CANCEL' });
  } catch {}
  try {
    await setOverlayStatus(current.tabId, current.invocationId, 'CANCELED', getMessage('overlayCanceled', 'Canceled.'));
  } catch {}
  scheduleTeardown(current, 2500);
}

export async function cancelForTabClose(tabId) {
  const invocation = getInvocationByTabId(tabId);
  if (!invocation) {
    return;
  }

  invocationPorts.get(invocation.invocationId)?.disconnect();
  invocationPorts.delete(invocation.invocationId);
  cancelInvocation(invocation.invocationId, 'CANCELED');
  clearInvocation(invocation.invocationId);
}

export async function cancelForNavigation(tabId) {
  const invocation = getInvocationByTabId(tabId);
  if (!invocation) {
    return;
  }

  cancelInvocation(invocation.invocationId, 'CANCELED');
  try {
    invocationPorts.get(invocation.invocationId)?.postMessage({ op: 'CANCEL' });
  } catch {}
  invocationPorts.get(invocation.invocationId)?.disconnect();
  invocationPorts.delete(invocation.invocationId);
  clearInvocation(invocation.invocationId);
}

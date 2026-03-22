import { markInvocationStart, resolveInvocationInput } from './dispatch.js';
import {
  cancelInvocation,
  clearInvocation,
  createInvocation,
  finishInvocation,
  getInvocationById,
  getInvocationByTabId,
  isTabBusy,
  releaseTabBusy
} from './invocations.js';
import { escapeHtml } from '../shared/html.js';

const CONTROL_TYPE = 'fcmd_control';
const COMPLETION_MARKER_PREFIX = '__factotum_completion__';
const teardownTimers = new Map();
const invocationPorts = new Map();
const invocationCompletion = new Map();

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
    if (
      !text.includes('Receiving end does not exist')
      && !text.includes('message channel is closed')
      && !text.includes('No tab with id')
    ) {
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

async function setOverlayHelp(tabId, invocationId, commandRef, html) {
  await sendControlMessage(tabId, {
    op: 'SET_HELP',
    invocationId,
    commandRef,
    html
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

function getCompletionMarkerId(invocationId) {
  return `${COMPLETION_MARKER_PREFIX}${invocationId}`;
}

function clearCompletionWaiter(invocationId) {
  invocationCompletion.delete(invocationId);
}

function waitForInvocationCompletion(invocationId) {
  const existing = invocationCompletion.get(invocationId);
  if (existing) {
    return existing.promise;
  }

  let settled = false;
  let resolvePromise;
  let rejectPromise;
  const promise = new Promise((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  const completion = {
    promise,
    resolve(value) {
      if (settled) {
        return;
      }
      settled = true;
      clearCompletionWaiter(invocationId);
      resolvePromise(value);
    },
    reject(error) {
      if (settled) {
        return;
      }
      settled = true;
      clearCompletionWaiter(invocationId);
      rejectPromise(error);
    }
  };

  invocationCompletion.set(invocationId, completion);
  return promise;
}

async function readInvocationCompletionMarker(tabId, invocationId) {
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId, allFrames: false },
      world: 'ISOLATED',
      func: (markerId) => {
        const marker = document.getElementById(markerId);
        if (!marker) {
          return null;
        }
        const text = marker.textContent || '';
        marker.remove();
        return text;
      },
      args: [getCompletionMarkerId(invocationId)]
    });

    if (!result?.result) {
      return null;
    }

    return JSON.parse(result.result);
  } catch {
    return null;
  }
}

function resolveLocaleMapEntry(map, locale = 'en-US') {
  if (!map || typeof map !== 'object' || Array.isArray(map)) {
    return undefined;
  }

  const entries = Object.entries(map);
  if (entries.length === 0) {
    return undefined;
  }

  const preferred = String(locale || 'en-US').toLowerCase();
  const primary = preferred.split('-')[0];

  for (const [key, value] of entries) {
    if (key.toLowerCase() === preferred) {
      return value;
    }
  }

  for (const [key, value] of entries) {
    if (key.toLowerCase().split('-')[0] === primary) {
      return value;
    }
  }

  for (const [key, value] of entries) {
    if (key.toLowerCase() === 'en-us') {
      return value;
    }
  }

  return entries[0][1];
}

async function getTabLocale(tabId) {
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId, allFrames: false },
      world: 'ISOLATED',
      func: () => {
        if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
          return navigator.languages[0] || navigator.language || 'en-US';
        }
        return navigator.language || 'en-US';
      }
    });

    return result?.result || 'en-US';
  } catch {
    return 'en-US';
  }
}

function buildHelpUsage(command) {
  const optionsSpec = command.optionsSpec || {};
  const displayName = optionsSpec.name || command.name;
  const optionSynopsis = (optionsSpec.options || [])
    .map((option) => {
      const longFlag = option.flags.find((flag) => flag.startsWith('--')) || option.flags[0];
      return longFlag ? `[${longFlag}]` : '';
    })
    .filter(Boolean)
    .join(' ');
  const args = optionsSpec.args ? ` ${optionsSpec.args}` : '';

  return `${displayName}${optionSynopsis ? ` ${optionSynopsis}` : ''}${args}`;
}

function buildHelpOptions(command, locale) {
  const options = command.optionsSpec?.options || [];
  if (options.length === 0) {
    return '';
  }

  const items = options.map((option) => {
    const flags = option.flags.map((flag) => `<code>${escapeHtml(flag)}</code>`).join(', ');
    const description = resolveLocaleMapEntry(option.description, locale);
    return `<li>${flags}${description ? ` ${escapeHtml(description)}` : ''}</li>`;
  }).join('');

  return `<ul>${items}</ul>`;
}

function buildHelpArgs(command) {
  if (!command.optionsSpec?.args) {
    return '';
  }

  return `<p><code>${escapeHtml(command.optionsSpec.args)}</code></p>`;
}

function renderHelpTemplate(template, tokens) {
  return String(template || '').replace(/{{\s*([A-Za-z0-9_-]+)\s*}}/g, (_match, token) => {
    return Object.prototype.hasOwnProperty.call(tokens, token) ? String(tokens[token] ?? '') : '';
  });
}

function buildHelpHtml(command, locale) {
  const localizedTokens = resolveLocaleMapEntry(command.helpHtmlStrings, locale);
  const tokens = localizedTokens && typeof localizedTokens === 'object' && !Array.isArray(localizedTokens)
    ? { ...localizedTokens }
    : {};

  tokens.usage = buildHelpUsage(command);
  tokens.options = buildHelpOptions(command, locale);
  tokens.args = buildHelpArgs(command);

  const template = command.helpHtmlTemplate || '<h1>{{title}}</h1><pre>{{usage}}</pre>{{options}}{{args}}';
  return renderHelpTemplate(template, tokens);
}

async function showHelpOverlay(invocation) {
  const locale = await getTabLocale(invocation.tabId);
  const commandRef = `${invocation.command.name}@${invocation.command.id}`;
  const html = buildHelpHtml(invocation.command, locale);
  await setOverlayHelp(invocation.tabId, invocation.invocationId, commandRef, html);
}

function buildExecuteCode(invocation) {
  const meta = JSON.stringify({
    invocationId: invocation.invocationId,
    argvTokens: invocation.argvTokens,
    world: invocation.command.world,
    commandRef: `${invocation.command.name}@${invocation.command.id}`,
    nonce: invocation.nonce,
    completionMarkerId: getCompletionMarkerId(invocation.invocationId)
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

      function __factotumWriteCompletion(payload) {
        let marker = document.getElementById(__factotumMeta.completionMarkerId);
        if (!marker) {
          marker = document.createElement('script');
          marker.id = __factotumMeta.completionMarkerId;
          marker.type = 'application/json';
          marker.hidden = true;
          (document.documentElement || document.body || document.head).append(marker);
        }

        let serialized = '';
        try {
          serialized = JSON.stringify(payload);
        } catch (error) {
          serialized = JSON.stringify({
            status: 'failed',
            error: {
              name: error?.name || 'Error',
              message: error?.message || String(error),
              code: 'UNCLONEABLE_RESULT'
            }
          });
        }

        marker.textContent = serialized;
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
        console.info('[factotum execute]', __factotumMeta.commandRef, __factotumMeta.world);
        const __factotumMain = (() => {
          ${invocation.command.code}
          return typeof main === 'function' ? main : undefined;
        })();
        if (typeof __factotumMain !== 'function') {
          __factotumWriteCompletion({
            status: 'no_main'
          });
          return undefined;
        }
        const __factotumResult = await __factotumMain(__factotumMeta.argvTokens, ctx);
        __factotumWriteCompletion({
          status: 'completed',
          result: __factotumResult
        });
        return __factotumResult;
      } catch (error) {
        __factotumWriteCompletion({
          status: 'failed',
          error: {
            name: error?.name || 'Error',
            message: error?.message || String(error),
            stack: error?.stack,
            code: error?.code || 'ERROR'
          }
        });
        throw error;
      } finally {
        window.removeEventListener('message', __factotumMainListener);
        __factotumPort.disconnect();
      }
    })();
  `;
}

async function executeUserScript(invocation) {
  const world = invocation.command.world === 'main' ? 'MAIN' : 'USER_SCRIPT';
  return chrome.userScripts.execute({
    target: {
      tabId: invocation.tabId,
      frameIds: [0]
    },
    js: [{ code: buildExecuteCode(invocation) }],
    world
  });
}

async function handleResolutionFailure(tab, resolution) {
  if (!isInjectableUrl(tab?.url)) {
    return;
  }

  const runningInvocation = getInvocationByTabId(tab.id);
  if (runningInvocation) {
    await handleBusyTab(tab.id, resolution.message);
    return;
  }

  const invocation = {
    invocationId: `transient-${Date.now()}`,
    command: { name: resolution.cmdToken || '', id: '' }
  };
  await ensureOverlay(tab.id, invocation, 'ERROR', resolution.message);
  setTimeout(() => {
    teardownOverlay(tab.id, invocation.invocationId).catch(() => {});
  }, 5000);
}

async function handleBusyTab(tabId, message = '') {
  const runningInvocation = getInvocationByTabId(tabId);
  if (!runningInvocation) {
    return;
  }

  await setOverlayStatus(tabId, runningInvocation.invocationId, 'BUSY', message);
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
      await setOverlayStatus(current.tabId, current.invocationId, 'CANCELED', '');
    } catch {}
    scheduleTeardown(current, 2500);
    return { ok: false, code: 'CANCELED', message: getMessage('overlayCanceled', 'Canceled.') };
  }

  finishInvocation(current.invocationId, 'DONE', { result });
  await setOverlayStatus(current.tabId, current.invocationId, 'DONE', '');
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

  const wantsHelp = Boolean(resolution.parsedOpts?.help || resolution.parsedOpts?.h);
  if (wantsHelp) {
    finishInvocation(invocation.invocationId, 'HELP');
    releaseTabBusy(invocation.invocationId);
    await showHelpOverlay(invocation);
    return { ok: true, invocation, result: undefined };
  }

  await injectMainHost(tab.id);

  try {
    const completionPromise = waitForInvocationCompletion(invocation.invocationId);
    await executeUserScript(invocation);
    const completion = await completionPromise;

    if (completion?.ok) {
      return finalizeInvocationSuccess(invocation, completion.result);
    }

    throw completion?.error || Object.assign(new Error('Invocation failed'), { code: 'ERROR' });
  } catch (error) {
    if (error?.code === 'CANCELED') {
      return finalizeInvocationSuccess(invocation, undefined);
    }
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

  if (message.op === 'DISMISS_REQUEST') {
    const invocation = getInvocationById(message.invocationId);
    if (invocation) {
      invocationPorts.get(invocation.invocationId)?.disconnect();
      invocationPorts.delete(invocation.invocationId);
      await teardownOverlay(invocation.tabId, invocation.invocationId);
      clearInvocation(invocation.invocationId);
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

    const completion = invocationCompletion.get(invocation.invocationId);
    if (!completion) {
      return;
    }

    if (invocation.canceled) {
      completion.reject(Object.assign(new Error(getMessage('overlayCanceled', 'Canceled.')), { code: 'CANCELED' }));
      return;
    }

    readInvocationCompletionMarker(invocation.tabId, invocation.invocationId)
      .then((marker) => {
        if (!marker || marker.status === 'no_main') {
          completion.resolve({ ok: true, result: undefined });
          return;
        }

        if (marker.status === 'completed') {
          completion.resolve({ ok: true, result: marker.result });
          return;
        }

        if (marker.status === 'failed') {
          const errorDetail = marker.error || {};
          completion.reject(Object.assign(
            new Error(errorDetail.message || 'Invocation failed'),
            {
              name: errorDetail.name || 'Error',
              stack: errorDetail.stack,
              code: errorDetail.code || 'ERROR'
            }
          ));
          return;
        }

        completion.reject(Object.assign(new Error('Invocation ended unexpectedly.'), { code: 'INVALID_INVOCATION' }));
      })
      .catch((error) => {
        completion.reject(Object.assign(
          new Error(error?.message || 'Invocation ended unexpectedly.'),
          { code: error?.code || 'INVALID_INVOCATION' }
        ));
      });
  });
}

export async function requestCancel(invocation, reason = 'CANCELED') {
  const current = typeof invocation === 'string' ? getInvocationById(invocation) : invocation;
  if (!current) {
    return;
  }

  cancelInvocation(current.invocationId, reason);
  releaseTabBusy(current.invocationId);
  try {
    invocationPorts.get(current.invocationId)?.postMessage({ op: 'CANCEL' });
  } catch {}
  try {
    await setOverlayStatus(current.tabId, current.invocationId, 'CANCELED', '');
  } catch {}
  scheduleTeardown(current, 2500);
}

export async function cancelForTabClose(tabId) {
  const invocation = getInvocationByTabId(tabId);
  if (!invocation) {
    return;
  }

  cancelInvocation(invocation.invocationId, 'CANCELED');
  releaseTabBusy(invocation.invocationId);
  invocationPorts.get(invocation.invocationId)?.disconnect();
  invocationPorts.delete(invocation.invocationId);
}

export async function cancelForNavigation(tabId) {
  const invocation = getInvocationByTabId(tabId);
  if (!invocation) {
    return;
  }

  cancelInvocation(invocation.invocationId, 'CANCELED');
  releaseTabBusy(invocation.invocationId);
  try {
    invocationPorts.get(invocation.invocationId)?.postMessage({ op: 'CANCEL' });
  } catch {}
  invocationPorts.get(invocation.invocationId)?.disconnect();
  invocationPorts.delete(invocation.invocationId);
}

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
import {
  appendSessionEntry,
  clearSessionActiveInvocation,
  discardSession,
  ensureSession,
  getSession,
  setSessionActiveInvocation,
  setSessionSnapshot,
  setSessionVisibility
} from './sessions.js';
import { isInjectableUrl } from './injectability.js';
import { buildUserScriptRunnerCode } from './runner_template.js';
import { createCodedError, deserializeError, serializeError } from '../shared/errors.js';
import { buildHelpHtml, resolveLocaleMapEntry } from '../shared/help.js';
import { getMessage } from '../shared/i18n.js';
import { getPreferredUiLocale } from '../shared/locale.js';

const CONTROL_TYPE = 'fcmd_control';
const COMPLETION_MARKER_PREFIX = '__factotum_completion__';
const CANCEL_MARKER_PREFIX = '__factotum_cancel__';
const OUTPUT_MARKER_PREFIX = '__factotum_output__';
const RPC_DENYLIST_NAMESPACES = new Set(['debugger', 'management']);
const RPC_DENYLIST_METHODS = new Set(['connect', 'connectNative']);
const RPC_EVENT_METHODS = new Set(['addListener', 'removeListener', 'hasListener', 'hasListeners']);
const invocationCompletion = new Map();
const invocationOutputOffsets = new Map();

function createRpcError(code, message, details) {
  return createCodedError(code, message, details);
}

function safeStringify(value, space = 0) {
  const seen = new WeakSet();
  return JSON.stringify(value, (_key, current) => {
    if (typeof current === 'object' && current !== null) {
      if (seen.has(current)) {
        return '[Circular]';
      }
      seen.add(current);
    }
    if (current instanceof Error) {
      return {
        name: current.name,
        message: current.message,
        stack: current.stack,
        code: current.code
      };
    }
    return current;
  }, space);
}

function stringifyDisplayValue(value, pretty = false) {
  return safeStringify(value, pretty ? 2 : 0);
}

function normalizeOutputOptions(rawOptions) {
  if (!rawOptions || typeof rawOptions !== 'object' || Array.isArray(rawOptions)) {
    return {};
  }
  return {
    ...(rawOptions.pretty == null ? {} : { pretty: Boolean(rawOptions.pretty) })
  };
}

function shouldPrettyPrint(value, options = {}) {
  if (options.pretty != null) {
    return Boolean(options.pretty);
  }
  return Boolean(value && typeof value === 'object');
}

function formatDisplayValue(value, options = {}) {
  if (typeof value === 'string') {
    return value;
  }
  if (value === undefined) {
    return 'undefined';
  }
  return stringifyDisplayValue(value, shouldPrettyPrint(value, options));
}

function formatCommandOutputMessage(payload, locale, outputOptions = {}) {
  let message = '';

  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    if (payload.l10n && typeof payload.l10n === 'object') {
      const localized = resolveLocaleMapEntry(payload.l10n, locale);
      if (localized) {
        message = String(localized);
      }
    } else if (Object.prototype.hasOwnProperty.call(payload, 'message')) {
      message = typeof payload.message === 'string'
        ? payload.message
        : formatDisplayValue(payload.message, outputOptions);
    } else {
      message = formatDisplayValue(payload, outputOptions);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'data')) {
      const serializedData = formatDisplayValue(payload.data, outputOptions);
      message = message ? `${message}\n${serializedData}` : serializedData;
    }

    return message;
  }

  return formatDisplayValue(payload, outputOptions);
}

function isThenable(value) {
  return Boolean(value && typeof value.then === 'function');
}

function ensureStructuredCloneable(value, method) {
  try {
    structuredClone(value);
    return value;
  } catch (error) {
    throw createRpcError(
      'UNCLONEABLE_RESULT',
      `RPC result from ${method} is not cloneable.`,
      { method, reason: error?.message || String(error) }
    );
  }
}

function normalizeRpcError(method, error, fallbackCode = 'RPC_FAILED') {
  if (error && error.code) {
    return error;
  }

  const lastErrorMessage = chrome.runtime.lastError?.message;
  if (lastErrorMessage) {
    return createRpcError('RPC_FAILED', lastErrorMessage, { method });
  }

  const serialized = serializeError(error, fallbackCode);
  return Object.assign(new Error(serialized.message), serialized, {
    details: { method }
  });
}

function validateRpcInvocation(invocationId, senderTabId = null) {
  const invocation = getInvocationById(invocationId);
  if (!invocation) {
    throw createRpcError('INVALID_INVOCATION', 'Invocation ended unexpectedly.');
  }

  if (senderTabId !== null && senderTabId !== invocation.tabId) {
    throw createRpcError('INVALID_INVOCATION', 'Invocation tab mismatch.');
  }

  if (invocation.canceled) {
    throw createRpcError('CANCELED', getMessage('overlayCanceled', 'Canceled.'));
  }

  return invocation;
}

function resolveRpcMember(method) {
  const parts = String(method || '').split('.').filter(Boolean);
  if (parts.length < 2) {
    throw createRpcError('NO_SUCH_METHOD', `No such method: ${method}`);
  }

  const namespace = parts[0];
  if (RPC_DENYLIST_NAMESPACES.has(namespace)) {
    throw createRpcError('UNSUPPORTED_MEMBER', `Unsupported member: ${method}`, { method });
  }

  if (parts.some((part) => RPC_EVENT_METHODS.has(part))) {
    throw createRpcError('UNSUPPORTED_API_SHAPE', `Events are not supported in v1: ${method}`, { method });
  }

  if (parts.some((part) => RPC_DENYLIST_METHODS.has(part))) {
    throw createRpcError('UNSUPPORTED_MEMBER', `Unsupported member: ${method}`, { method });
  }

  let current = chrome;
  for (const part of parts) {
    if (current == null || !(part in current)) {
      throw createRpcError('NO_SUCH_METHOD', `No such method: ${method}`, { method });
    }
    current = current[part];
  }

  if (typeof current !== 'function') {
    if (current && typeof current === 'object' && (
      typeof current.addListener === 'function'
      || typeof current.removeListener === 'function'
    )) {
      throw createRpcError('UNSUPPORTED_API_SHAPE', `Events are not supported in v1: ${method}`, { method });
    }
    throw createRpcError('NO_SUCH_METHOD', `No such method: ${method}`, { method });
  }

  let receiver = chrome;
  for (const part of parts.slice(0, -1)) {
    receiver = receiver[part];
  }

  return {
    method,
    fn: current,
    receiver
  };
}

function getRpcTestOverride(method, args) {
  const firstArg = Array.isArray(args) ? args[0] : undefined;
  if (
    method === 'runtime.getManifest'
    && firstArg
    && typeof firstArg === 'object'
    && firstArg.__factotumTest === 'UNCLONEABLE_RESULT'
  ) {
    return () => ({ value: () => {} });
  }
  return null;
}

async function callChromeRpc(method, args) {
  const override = getRpcTestOverride(method, args);
  const { fn, receiver } = override
    ? { fn: override, receiver: null }
    : resolveRpcMember(method);

  return new Promise((resolve, reject) => {
    let settled = false;
    const finishResolve = (value) => {
      if (settled) {
        return;
      }
      settled = true;
      try {
        resolve(ensureStructuredCloneable(value, method));
      } catch (error) {
        reject(error);
      }
    };
    const finishReject = (error) => {
      if (settled) {
        return;
      }
      settled = true;
      reject(normalizeRpcError(method, error));
    };
    const callback = (...callbackArgs) => {
      if (settled) {
        return;
      }
      if (chrome.runtime.lastError) {
        finishReject(createRpcError('RPC_FAILED', chrome.runtime.lastError.message, { method }));
        return;
      }
      finishResolve(callbackArgs.length <= 1 ? callbackArgs[0] : callbackArgs);
    };

    let result;
    try {
      result = fn.call(receiver, ...(Array.isArray(args) ? args : []), callback);
    } catch (error) {
      finishReject(error);
      return;
    }

    if (isThenable(result)) {
      Promise.resolve(result).then(finishResolve, finishReject);
      return;
    }

    if (result !== undefined) {
      queueMicrotask(() => finishResolve(result));
    }
  });
}

async function handleRpcRequest(message, sender) {
  const invocation = validateRpcInvocation(message.invocationId, sender?.tab?.id ?? null);
  const result = await callChromeRpc(message.method, message.args);
  validateRpcInvocation(message.invocationId, sender?.tab?.id ?? invocation.tabId);
  return {
    ok: true,
    result
  };
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
    return true;
  } catch (error) {
    const text = String(error.message || error);
    if (
      !text.includes('Receiving end does not exist')
      && !text.includes('message channel is closed')
      && !text.includes('No tab with id')
    ) {
      throw error;
    }
    return false;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildSessionView(tabId, snapshot = null) {
  const session = getSession(tabId) || ensureSession(tabId);
  return {
    snapshot,
    entries: session.entries || [],
    emptyMessage: getMessage('overlaySessionIdle', 'No commands have run in this tab yet.')
  };
}

function shouldAutoShowOverlay(command) {
  return command?.showOverlay !== false;
}

async function refreshSessionView(tabId, snapshot = null, forceVisible = false) {
  const session = getSession(tabId) || ensureSession(tabId);
  if (forceVisible) {
    setSessionVisibility(tabId, true);
  }
  if (!session.visible) {
    return;
  }
  const view = {
    op: 'SHOW_SESSION',
    ...buildSessionView(tabId, snapshot)
  };
  if (await sendControlMessage(tabId, view)) {
    return;
  }
  await injectScript(tabId, 'overlay/overlay.js', 'ISOLATED');
  await sendControlMessage(tabId, view);
}

async function injectScript(tabId, file, world = 'ISOLATED') {
  await chrome.scripting.executeScript({
    target: { tabId, allFrames: false },
    files: [file],
    world
  });
}

async function ensureOverlay(tabId, invocation, state = 'RUNNING', message = '', forceVisible = true) {
  const snapshot = {
    invocationId: invocation.invocationId,
    commandRef: `${invocation.command.name}@${invocation.command.id}`,
    state,
    message,
    html: '',
    dismissible: state !== 'RUNNING'
  };
  setSessionSnapshot(tabId, snapshot);
  setSessionActiveInvocation(tabId, invocation.invocationId);
  await refreshSessionView(tabId, snapshot, forceVisible);
}

function snapshotToEntry(snapshot) {
  return {
    invocationId: snapshot.invocationId || null,
    commandRef: snapshot.commandRef || '',
    state: snapshot.state || 'IDLE',
    message: snapshot.message || '',
    html: snapshot.html || ''
  };
}

function appendSnapshotEntry(tabId, snapshot) {
  appendSessionEntry(tabId, snapshotToEntry(snapshot));
}

function appendSystemEntry(tabId, state, message, commandRef = getMessage('appName', 'Factotum')) {
  appendSessionEntry(tabId, {
    invocationId: null,
    commandRef,
    state,
    message,
    html: ''
  });
}

async function appendCommandOutputEntry(tabId, invocation, rawEntry) {
  const locale = getPreferredUiLocale();
  const payload = rawEntry && typeof rawEntry === 'object' && Object.prototype.hasOwnProperty.call(rawEntry, 'value')
    ? rawEntry.value
    : rawEntry;
  const outputOptions = normalizeOutputOptions(rawEntry?.options);
  const message = formatCommandOutputMessage(payload, locale, outputOptions);

  appendSessionEntry(tabId, {
    invocationId: invocation.invocationId,
    commandRef: `${invocation.command.name}@${invocation.command.id}`,
    kind: 'output',
    level: rawEntry?.level || 'info',
    state: '',
    message,
    html: ''
  });
}

async function setOverlayStatus(tabId, invocationId, state, message = '', forceVisible = false) {
  const session = ensureSession(tabId);
  const snapshot = session.snapshot || {};
  const nextSnapshot = {
    invocationId,
    commandRef: snapshot.commandRef || '',
    state,
    message,
    html: '',
    dismissible: state !== 'RUNNING'
  };
  setSessionSnapshot(tabId, nextSnapshot);
  await refreshSessionView(tabId, nextSnapshot, forceVisible);
}

async function setOverlayHelp(tabId, invocationId, commandRef, html, forceVisible = false) {
  const snapshot = {
    invocationId,
    commandRef,
    state: 'HELP',
    message: '',
    html,
    dismissible: true
  };
  setSessionSnapshot(tabId, snapshot);
  await refreshSessionView(tabId, snapshot, forceVisible);
}

async function teardownOverlay(tabId, invocationId) {
  setSessionVisibility(tabId, false);
  clearSessionActiveInvocation(tabId, invocationId);
  await sendControlMessage(tabId, {
    op: 'TEARDOWN',
    invocationId
  });
}

async function showSessionOverlay(tabId) {
  const session = getSession(tabId) || ensureSession(tabId);
  const snapshot = session.activeInvocationId
    ? (session.snapshot || {
        invocationId: null,
        commandRef: getMessage('appName', 'Factotum'),
        state: 'IDLE',
        message: getMessage('overlaySessionIdle', 'No commands have run in this tab yet.'),
        html: '',
        dismissible: true
      })
    : (session.entries && session.entries.length > 0
        ? {
            invocationId: null,
            commandRef: getMessage('appName', 'Factotum'),
            state: 'IDLE',
            message: '',
            html: '',
            dismissible: true
          }
        : {
            invocationId: null,
            commandRef: getMessage('appName', 'Factotum'),
            state: 'IDLE',
            message: getMessage('overlaySessionIdle', 'No commands have run in this tab yet.'),
            html: '',
            dismissible: true
          });

  await refreshSessionView(tabId, snapshot, true);
}

async function showHistoryOnly(tabId, forceVisible = false) {
  setSessionSnapshot(tabId, null);
  if (forceVisible) {
    setSessionVisibility(tabId, true);
  }
  clearSessionActiveInvocation(tabId);
  const session = getSession(tabId) || ensureSession(tabId);
  if (!session.visible) {
    return;
  }
  await sendControlMessage(tabId, {
    op: 'TEARDOWN',
    invocationId: null
  });
  await refreshSessionView(tabId, null);
}

async function injectMainHost(tabId) {
  await injectScript(tabId, 'bridge/main_host.js', 'MAIN');
}

function getCompletionMarkerId(invocationId) {
  return `${COMPLETION_MARKER_PREFIX}${invocationId}`;
}

function getCancelMarkerId(invocationId) {
  return `${CANCEL_MARKER_PREFIX}${invocationId}`;
}

function getOutputMarkerId(invocationId) {
  return `${OUTPUT_MARKER_PREFIX}${invocationId}`;
}

function resolveRequireUrl(url) {
  const raw = String(url || '');
  if (/^data:/i.test(raw)) {
    throw createRpcError('REQUIRES_FAILED', `Requires cannot use data: URLs: ${raw}`);
  }
  if (/^\//.test(raw)) {
    return chrome.runtime.getURL(raw.replace(/^\/+/, ''));
  }
  if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) {
    return chrome.runtime.getURL(raw);
  }
  return raw;
}

function prepareRequires(command) {
  return (Array.isArray(command.requires) ? command.requires : []).map((entry) => ({
    url: resolveRequireUrl(entry.url),
    kind: entry.kind,
    world: entry.world || 'main'
  }));
}

function clearCompletionWaiter(invocationId) {
  invocationCompletion.delete(invocationId);
  invocationOutputOffsets.delete(invocationId);
}

function settleCompletionWaiter(invocationId, outcome) {
  const completion = invocationCompletion.get(invocationId);
  if (!completion) {
    return;
  }

  if (outcome?.ok || outcome?.canceled) {
    completion.resolve(outcome);
    return;
  }

  completion.reject(outcome?.error || Object.assign(new Error('Invocation failed'), { code: 'ERROR' }));
}

function waitForInvocationCompletion(invocation) {
  const invocationId = invocation.invocationId;
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
  pollInvocationCompletion(invocation).catch((error) => {
    settleCompletionWaiter(invocationId, {
      ok: false,
      error: Object.assign(
        new Error(error?.message || 'Invocation ended unexpectedly.'),
        { code: error?.code || 'INVALID_INVOCATION' }
      )
    });
  });
  return promise;
}

async function readInvocationCompletionMarker(tabId, invocationId, remove = false) {
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId, allFrames: false },
      world: 'ISOLATED',
      func: (markerId, shouldRemove) => {
        const marker = document.getElementById(markerId);
        if (!marker) {
          return null;
        }
        const text = marker.textContent || '';
        if (shouldRemove) {
          marker.remove();
        }
        return text;
      },
      args: [getCompletionMarkerId(invocationId), remove]
    });

    if (!result?.result) {
      return null;
    }

    return JSON.parse(result.result);
  } catch {
    return null;
  }
}

async function readInvocationOutputMarker(tabId, invocationId) {
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId, allFrames: false },
      world: 'ISOLATED',
      func: (markerId) => {
        const marker = document.getElementById(markerId);
        if (!marker) {
          return null;
        }
        return marker.textContent || '[]';
      },
      args: [getOutputMarkerId(invocationId)]
    });

    if (!result?.result) {
      return [];
    }

    const parsed = JSON.parse(result.result);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeInvocationMarker(tabId, markerId, text) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: false },
      world: 'ISOLATED',
      func: (id, value) => {
        let marker = document.getElementById(id);
        if (!marker) {
          marker = document.createElement('script');
          marker.id = id;
          marker.type = 'application/json';
          marker.hidden = true;
          (document.documentElement || document.body || document.head).append(marker);
        }
        marker.textContent = value;
      },
      args: [markerId, text]
    });
  } catch {}
}

async function removeInvocationMarkers(tabId, invocationId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: false },
      world: 'ISOLATED',
      func: (completionId, cancelId, outputId) => {
        document.getElementById(completionId)?.remove();
        document.getElementById(cancelId)?.remove();
        document.getElementById(outputId)?.remove();
      },
      args: [getCompletionMarkerId(invocationId), getCancelMarkerId(invocationId), getOutputMarkerId(invocationId)]
    });
  } catch {}
}

async function initializeInvocationMarkers(tabId, invocationId) {
  await writeInvocationMarker(tabId, getCompletionMarkerId(invocationId), JSON.stringify({ status: 'pending' }));
  await writeInvocationMarker(tabId, getCancelMarkerId(invocationId), '0');
  await writeInvocationMarker(tabId, getOutputMarkerId(invocationId), '[]');
  invocationOutputOffsets.set(invocationId, 0);
}

async function signalInvocationCancel(tabId, invocationId) {
  await writeInvocationMarker(tabId, getCancelMarkerId(invocationId), '1');
}

async function pollInvocationCompletion(invocation) {
  while (invocationCompletion.has(invocation.invocationId)) {
    const current = getInvocationById(invocation.invocationId);
    if (!current) {
      return;
    }

    if (current.canceled) {
      return;
    }

    await drainInvocationOutputs(invocation);

    const marker = await readInvocationCompletionMarker(invocation.tabId, invocation.invocationId, false);
    if (marker && marker.status && marker.status !== 'pending') {
      await drainInvocationOutputs(invocation);
      await readInvocationCompletionMarker(invocation.tabId, invocation.invocationId, true);

      if (marker.status === 'no_main') {
        return settleCompletionWaiter(invocation.invocationId, { ok: true, result: undefined });
      }

      if (marker.status === 'completed') {
        return settleCompletionWaiter(invocation.invocationId, { ok: true, result: marker.result });
      }

      if (marker.status === 'help') {
        return settleCompletionWaiter(invocation.invocationId, { ok: true, help: true, result: undefined });
      }

      if (marker.status === 'failed') {
        return settleCompletionWaiter(invocation.invocationId, {
          ok: false,
          error: deserializeError(marker.error, 'ERROR', 'Invocation failed')
        });
      }

      return settleCompletionWaiter(invocation.invocationId, {
        ok: false,
        error: Object.assign(new Error('Invocation ended unexpectedly.'), { code: 'INVALID_INVOCATION' })
      });
    }

    await delay(100);
  }
}

async function drainInvocationOutputs(invocation) {
  const outputs = await readInvocationOutputMarker(invocation.tabId, invocation.invocationId);
  const offset = invocationOutputOffsets.get(invocation.invocationId) || 0;
  if (outputs.length <= offset) {
    return;
  }

  for (const entry of outputs.slice(offset)) {
    await appendCommandOutputEntry(invocation.tabId, invocation, entry);
  }
  invocationOutputOffsets.set(invocation.invocationId, outputs.length);
  const session = getSession(invocation.tabId) || ensureSession(invocation.tabId);
  await refreshSessionView(invocation.tabId, session.snapshot || null);
}

function getUiLocale() {
  return getPreferredUiLocale();
}

async function showHelpOverlay(invocation) {
  const locale = getUiLocale();
  const commandRef = `${invocation.command.name}@${invocation.command.id}`;
  const html = buildHelpHtml(invocation.command, locale);
  appendSnapshotEntry(invocation.tabId, {
    invocationId: invocation.invocationId,
    commandRef,
    state: 'HELP',
    message: '',
    html
  });
  await setOverlayHelp(invocation.tabId, invocation.invocationId, commandRef, html, shouldAutoShowOverlay(invocation.command));
  await showHistoryOnly(invocation.tabId, shouldAutoShowOverlay(invocation.command));
}

function buildExecuteCode(invocation) {
  return buildUserScriptRunnerCode({
    invocation,
    controlType: CONTROL_TYPE,
    requires: prepareRequires(invocation.command),
    markerIds: {
      completion: getCompletionMarkerId(invocation.invocationId),
      cancel: getCancelMarkerId(invocation.invocationId),
      output: getOutputMarkerId(invocation.invocationId)
    },
    rpcUnsupported: {
      denylistedNamespaces: Array.from(RPC_DENYLIST_NAMESPACES),
      eventMethods: Array.from(RPC_EVENT_METHODS),
      denylistedMethods: Array.from(RPC_DENYLIST_METHODS)
    }
  });
}

async function executeUserScript(invocation) {
  return chrome.userScripts.execute({
    target: {
      tabId: invocation.tabId,
      frameIds: [0]
    },
    js: [{ code: buildExecuteCode(invocation) }],
    world: 'USER_SCRIPT'
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

  appendSystemEntry(tab.id, 'ERROR', resolution.message);
  await showHistoryOnly(tab.id, true);
}

async function handleBusyTab(tabId, message = '') {
  const runningInvocation = getInvocationByTabId(tabId);
  if (!runningInvocation) {
    return;
  }

  const runningCommandRef = `${runningInvocation.command.name}@${runningInvocation.command.id}`;
  const busyMessage = message
    || getMessage(
      'overlayBusyDetail',
      `Tab busy: ${runningCommandRef}. Cancel it or wait for it to finish.`,
      [runningCommandRef]
    );
  appendSystemEntry(tabId, 'BUSY', busyMessage);
  const session = getSession(tabId) || ensureSession(tabId);
  await refreshSessionView(tabId, session.snapshot || null, true);
}

async function finalizeCanceledInvocation(current, { removeMarkers = true } = {}) {
  const discardedSessionCancel = current.cancelReason === 'NAVIGATED' || current.cancelReason === 'TAB_CLOSED';
  if (!discardedSessionCancel) {
    try {
      await setOverlayStatus(current.tabId, current.invocationId, 'CANCELED', '');
    } catch {}
    appendSnapshotEntry(current.tabId, {
      invocationId: current.invocationId,
      commandRef: `${current.command.name}@${current.command.id}`,
      state: 'CANCELED',
      message: '',
      html: ''
    });
  }

  releaseTabBusy(current.invocationId);
  if (removeMarkers) {
    await removeInvocationMarkers(current.tabId, current.invocationId);
  }
  clearInvocation(current.invocationId);

  if (!discardedSessionCancel) {
    await showHistoryOnly(current.tabId, shouldAutoShowOverlay(current.command));
  }

  return { ok: false, code: 'CANCELED', message: getMessage('overlayCanceled', 'Canceled.') };
}

async function finalizeInvocationSuccess(invocation, result) {
  const current = getInvocationById(invocation.invocationId);
  if (!current) {
    return { ok: false, code: 'INVALID_INVOCATION', message: 'Invocation ended unexpectedly.' };
  }

  if (current.canceled) {
    return finalizeCanceledInvocation(current);
  }

  finishInvocation(current.invocationId, 'DONE', { result });
  const completionMessage = result === undefined
    ? ''
    : formatDisplayValue(result, { pretty: true });
  appendSnapshotEntry(current.tabId, {
    invocationId: current.invocationId,
    commandRef: `${current.command.name}@${current.command.id}`,
    state: 'DONE',
    message: completionMessage,
    html: ''
  });
  releaseTabBusy(current.invocationId);
  await removeInvocationMarkers(current.tabId, current.invocationId);
  clearInvocation(current.invocationId);
  await showHistoryOnly(current.tabId, shouldAutoShowOverlay(current.command));
  return { ok: true, invocation: current, result };
}

async function finalizeInvocationHelp(invocation, removeMarkers = false) {
  const current = getInvocationById(invocation.invocationId);
  if (!current) {
    return { ok: false, code: 'INVALID_INVOCATION', message: 'Invocation ended unexpectedly.' };
  }

  if (current.canceled) {
    return finalizeCanceledInvocation(current, { removeMarkers });
  }

  finishInvocation(current.invocationId, 'HELP');
  releaseTabBusy(current.invocationId);
  if (removeMarkers) {
    await removeInvocationMarkers(current.tabId, current.invocationId);
  }
  await showHelpOverlay(current);
  return { ok: true, invocation: current, result: undefined, help: true };
}

async function finalizeInvocationError(invocation, error) {
  const current = getInvocationById(invocation.invocationId);
  if (!current) {
    return { ok: false, code: 'INVALID_INVOCATION', message: 'Invocation ended unexpectedly.' };
  }

  const serialized = serializeError(error, 'ERROR');
  finishInvocation(current.invocationId, 'ERROR', { error: serialized });
  appendSnapshotEntry(current.tabId, {
    invocationId: current.invocationId,
    commandRef: `${current.command.name}@${current.command.id}`,
    state: 'ERROR',
    message: formatDisplayValue(serialized, { pretty: true }),
    html: ''
  });
  releaseTabBusy(current.invocationId);
  await removeInvocationMarkers(current.tabId, current.invocationId);
  clearInvocation(current.invocationId);
  await showHistoryOnly(current.tabId, true);
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
    argv: resolution.argv,
    sourceText: resolution.effectiveCmdToken
  });

  invocation.mruAt = await markInvocationStart(resolution.command);

  await ensureOverlay(tab.id, invocation, 'RUNNING', '', shouldAutoShowOverlay(invocation.command));

  const wantsHelp = Boolean(resolution.argv?.options?.help);
  if (wantsHelp) {
    return finalizeInvocationHelp(invocation, false);
  }

  await injectMainHost(tab.id);

  try {
    await initializeInvocationMarkers(tab.id, invocation.invocationId);
    const completionPromise = waitForInvocationCompletion(invocation);
    const executionPromise = executeUserScript(invocation).then(
      (execution) => ({ kind: 'execute', ok: true, execution }),
      (error) => ({ kind: 'execute', ok: false, error })
    );
    const firstSettled = await Promise.race([
      completionPromise.then((completion) => ({ kind: 'completion', completion })),
      executionPromise
    ]);
    if (firstSettled.kind === 'completion') {
      const completion = firstSettled.completion;

      if (completion?.canceled) {
        return finalizeInvocationSuccess(invocation, undefined);
      }

      if (completion?.help) {
        return finalizeInvocationHelp(invocation, true);
      }

      if (completion?.ok) {
        return finalizeInvocationSuccess(invocation, completion.result);
      }

      throw completion?.error || Object.assign(new Error('Invocation failed'), { code: 'ERROR' });
    }

    if (!firstSettled.ok) {
      const current = getInvocationById(invocation.invocationId);
      if (current?.canceled) {
        return finalizeInvocationSuccess(invocation, undefined);
      }
      throw firstSettled.error;
    }

    const completion = await completionPromise;

    if (completion?.canceled) {
      return finalizeInvocationSuccess(invocation, undefined);
    }

    if (completion?.help) {
      return finalizeInvocationHelp(invocation, true);
    }

    if (completion?.ok) {
      return finalizeInvocationSuccess(invocation, completion.result);
    }

    throw completion?.error || Object.assign(new Error('Invocation failed'), { code: 'ERROR' });
  } catch (error) {
    const current = getInvocationById(invocation.invocationId);
    if (error?.code === 'CANCELED' || current?.canceled) {
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

  if (String(text || '').trim() === '-') {
    await showSessionOverlay(tab.id);
    return { ok: true, reopen: true };
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

export async function handleRuntimeControlMessage(message, sender) {
  if (!message || message.type !== CONTROL_TYPE) {
    return undefined;
  }

  if (message.op === 'RPC_REQUEST') {
    try {
      return await handleRpcRequest(message, sender);
    } catch (error) {
      return {
        ok: false,
        error: serializeError(error, error?.code || 'RPC_FAILED')
      };
    }
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
      await teardownOverlay(invocation.tabId, invocation.invocationId);
      if (invocation.status === 'HELP') {
        clearInvocation(invocation.invocationId);
      }
    } else if (sender?.tab?.id) {
      setSessionVisibility(sender.tab.id, false);
    }
  }

  return undefined;
}

export async function handleUserScriptMessage(message) {
  if (!message || message.type !== CONTROL_TYPE) {
    return undefined;
  }

  if (message.op === 'RPC_REQUEST') {
    try {
      return await handleRpcRequest(message, null);
    } catch (error) {
      return {
        ok: false,
        error: serializeError(error, error?.code || 'RPC_FAILED')
      };
    }
  }

  if (message.op === 'COMMAND_EVENT') {
    handleCommandEvent(message);
  }

  return undefined;
}

export function handleUserScriptConnect(port) {
  port.disconnect();
}

export async function requestCancel(invocation, reason = 'CANCELED') {
  const current = typeof invocation === 'string' ? getInvocationById(invocation) : invocation;
  if (!current) {
    return;
  }

  cancelInvocation(current.invocationId, reason);
  releaseTabBusy(current.invocationId);
  await signalInvocationCancel(current.tabId, current.invocationId);
  settleCompletionWaiter(current.invocationId, {
    canceled: true
  });
  await setOverlayStatus(current.tabId, current.invocationId, 'CANCELED', '');
}

export async function cancelForTabClose(tabId) {
  const invocation = getInvocationByTabId(tabId);
  if (!invocation) {
    discardSession(tabId);
    return;
  }

  cancelInvocation(invocation.invocationId, 'TAB_CLOSED');
  releaseTabBusy(invocation.invocationId);
  await signalInvocationCancel(invocation.tabId, invocation.invocationId);
  settleCompletionWaiter(invocation.invocationId, {
    canceled: true
  });
  discardSession(tabId);
}

export async function cancelForNavigation(tabId) {
  const invocation = getInvocationByTabId(tabId);
  if (!invocation) {
    discardSession(tabId);
    return;
  }

  cancelInvocation(invocation.invocationId, 'NAVIGATED');
  releaseTabBusy(invocation.invocationId);
  await signalInvocationCancel(invocation.tabId, invocation.invocationId);
  settleCompletionWaiter(invocation.invocationId, {
    canceled: true
  });
  discardSession(tabId);
}

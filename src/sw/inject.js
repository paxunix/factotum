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
import { escapeHtml } from '../shared/html.js';

const CONTROL_TYPE = 'fcmd_control';
const COMPLETION_MARKER_PREFIX = '__factotum_completion__';
const CANCEL_MARKER_PREFIX = '__factotum_cancel__';
const OUTPUT_MARKER_PREFIX = '__factotum_output__';
const RPC_DENYLIST_NAMESPACES = new Set(['debugger', 'management']);
const RPC_DENYLIST_METHODS = new Set(['connect', 'connectNative']);
const RPC_EVENT_METHODS = new Set(['addListener', 'removeListener', 'hasListener', 'hasListeners']);
const invocationCompletion = new Map();
const invocationOutputOffsets = new Map();

function getMessage(key, fallback) {
  return chrome.i18n.getMessage(key) || fallback;
}

function getMessageWithSubstitutions(key, substitutions, fallback) {
  return chrome.i18n.getMessage(key, substitutions) || fallback;
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

function createRpcError(code, message, details) {
  const error = new Error(message);
  error.code = code;
  if (details !== undefined) {
    error.details = details;
  }
  return error;
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
  const locale = await getTabLocale(tabId);
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
        const errorDetail = marker.error || {};
        return settleCompletionWaiter(invocation.invocationId, {
          ok: false,
          error: Object.assign(new Error(errorDetail.message || 'Invocation failed'), {
            name: errorDetail.name || 'Error',
            stack: errorDetail.stack,
            code: errorDetail.code || 'ERROR'
          })
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

function createHelpRequestedError() {
  const error = new Error('Help requested');
  error.code = 'HELP_REQUESTED';
  return error;
}

function buildExecuteCode(invocation) {
  const meta = JSON.stringify({
    invocationId: invocation.invocationId,
    argv: invocation.argv,
    debug: Boolean(invocation.argv?.options?.debug),
    world: invocation.command.world,
    commandRef: `${invocation.command.name}@${invocation.command.id}`,
    nonce: invocation.nonce,
    requires: prepareRequires(invocation.command),
    completionMarkerId: getCompletionMarkerId(invocation.invocationId),
    cancelMarkerId: getCancelMarkerId(invocation.invocationId),
    outputMarkerId: getOutputMarkerId(invocation.invocationId)
  });
  const rpcUnsupported = JSON.stringify({
    denylistedNamespaces: Array.from(RPC_DENYLIST_NAMESPACES),
    eventMethods: Array.from(RPC_EVENT_METHODS),
    denylistedMethods: Array.from(RPC_DENYLIST_METHODS)
  });
  const sourceUrl = `${invocation.command.name}@${invocation.command.id}`;

  const prefix = `
    (() => {
    /*
     * BEGIN USER COMMAND SOURCE
     *
     * The fcommand body from extension storage is inserted directly below inside
     * a factory function so DevTools shows the user source at the top of this
     * generated script while preserving the normal require-then-execute order.
     */
    const __factotumBuildUserMain = () => {
      if (${Boolean(invocation.argv?.options?.debug)}) {
        /*
         * Factotum built-in --debug stop.
         * Step over once to continue through the fcommand source and then into
         * the returned main(argv, ctx) call in the runtime wrapper below.
         */
        debugger;
      }
  `;

  const infix = `
    /*
     * END USER COMMAND SOURCE
     */

    (async () => {
      const __factotumMeta = ${meta};
      let __factotumCallSeq = 0;
      const __factotumPendingMainCalls = new Map();

      const __factotumMainListener = (event) => {
        const data = event.data;
        if (!data || data.channel !== '__factotum_main_bridge__') {
          return;
        }
        if (data.invocationId !== __factotumMeta.invocationId || data.nonce !== __factotumMeta.nonce) {
          return;
        }
        if (!Object.prototype.hasOwnProperty.call(data, 'ok')) {
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

      function __factotumCancelRequested() {
        const marker = document.getElementById(__factotumMeta.cancelMarkerId);
        return Boolean(marker && marker.textContent === '1');
      }

      function __factotumAppendOutput(entry) {
        let marker = document.getElementById(__factotumMeta.outputMarkerId);
        if (!marker) {
          marker = document.createElement('script');
          marker.id = __factotumMeta.outputMarkerId;
          marker.type = 'application/json';
          marker.hidden = true;
          (document.documentElement || document.body || document.head).append(marker);
        }

        let entries = [];
        try {
          entries = JSON.parse(marker.textContent || '[]');
          if (!Array.isArray(entries)) {
            entries = [];
          }
        } catch {
          entries = [];
        }
        entries.push(entry);
        marker.textContent = JSON.stringify(entries);
      }

      function __factotumSendRpc(method, args) {
        return new Promise((resolve, reject) => {
          try {
            chrome.runtime.sendMessage({
              type: '${CONTROL_TYPE}',
              op: 'RPC_REQUEST',
              invocationId: __factotumMeta.invocationId,
              method,
              args: Array.isArray(args) ? args : []
            }, (response) => {
              const runtimeError = chrome.runtime.lastError;
              if (runtimeError) {
                const error = new Error(runtimeError.message || 'RPC failed');
                error.code = 'RPC_FAILED';
                reject(error);
                return;
              }

              if (!response || response.ok !== true) {
                const detail = response?.error || {};
                const error = new Error(detail.message || 'RPC failed');
                error.name = detail.name || 'Error';
                error.code = detail.code || 'RPC_FAILED';
                error.stack = detail.stack;
                error.details = detail.details;
                reject(error);
                return;
              }

              resolve(response.result);
            });
          } catch (error) {
            reject(error);
          }
        });
      }

      function __factotumCreateRpcProxy(path = []) {
        const unsupported = ${rpcUnsupported};

        function __factotumGetUnsupported(parts) {
          if (!parts.length) {
            return null;
          }
          if (unsupported.denylistedNamespaces.includes(parts[0])) {
            return {
              code: 'UNSUPPORTED_MEMBER',
              message: 'Unsupported member: ' + parts.join('.')
            };
          }
          if (parts.some((part) => unsupported.eventMethods.includes(part))) {
            return {
              code: 'UNSUPPORTED_API_SHAPE',
              message: 'Events are not supported in v1: ' + parts.join('.')
            };
          }
          if (parts.some((part) => unsupported.denylistedMethods.includes(part))) {
            return {
              code: 'UNSUPPORTED_MEMBER',
              message: 'Unsupported member: ' + parts.join('.')
            };
          }
          return null;
        }

        return new Proxy(function __factotumRpcMethod() {}, {
          get(_target, prop) {
            if (typeof prop === 'symbol') {
              return undefined;
            }
            const nextPath = path.concat(String(prop));
            const nextUnsupported = __factotumGetUnsupported(nextPath);
            if (nextUnsupported && unsupported.eventMethods.includes(String(prop))) {
              throw Object.assign(new Error(nextUnsupported.message), { code: nextUnsupported.code });
            }
            return __factotumCreateRpcProxy(nextPath);
          },
          apply(_target, _thisArg, args) {
            const unsupportedDetail = __factotumGetUnsupported(path);
            if (unsupportedDetail) {
              throw Object.assign(new Error(unsupportedDetail.message), { code: unsupportedDetail.code });
            }
            return __factotumSendRpc(path.join('.'), Array.isArray(args) ? args : []);
          }
        });
      }

      async function __factotumLoadRequire(entry) {
        if (!entry || typeof entry.url !== 'string') {
          throw Object.assign(new Error('Invalid require entry'), { code: 'REQUIRES_FAILED' });
        }
        if (/^data:/i.test(entry.url)) {
          throw Object.assign(new Error('Requires cannot use data: URLs: ' + entry.url), { code: 'REQUIRES_FAILED' });
        }
        if (entry.world === 'user_script') {
          if (entry.kind !== 'module') {
            throw Object.assign(new Error('USER_SCRIPT requires must be modules: ' + entry.url), { code: 'REQUIRES_FAILED' });
          }
          try {
            await import(entry.url);
            return;
          } catch (error) {
            const wrapped = new Error('USER_SCRIPT module require failed for ' + entry.url + ': ' + (error?.message || String(error)));
            wrapped.name = error?.name || 'Error';
            wrapped.stack = error?.stack;
            wrapped.code = 'REQUIRES_FAILED';
            throw wrapped;
          }
        }

        const op = entry.kind === 'module' ? 'IMPORT' : 'REQUIRE_SCRIPT';
        try {
          await __factotumSendMain(op, { url: entry.url });
        } catch (error) {
          const wrapped = new Error('MAIN ' + entry.kind + ' require failed for ' + entry.url + ': ' + (error?.message || String(error)));
          wrapped.name = error?.name || 'Error';
          wrapped.stack = error?.stack;
          wrapped.code = 'REQUIRES_FAILED';
          throw wrapped;
        }
      }

      async function __factotumLoadRequires() {
        for (const entry of __factotumMeta.requires || []) {
          await __factotumLoadRequire(entry);
        }
      }

      __factotumWriteCompletion({ status: 'pending' });

      const ctx = {
        signal: {
          get aborted() {
            return __factotumCancelRequested();
          }
        },
        argv: __factotumMeta.argv,
        chrome: new Proxy({}, {
          get(_target, prop) {
            if (typeof prop === 'symbol') {
              return undefined;
            }
            return __factotumCreateRpcProxy([String(prop)]);
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
        out: {
          write(value, options) {
            __factotumAppendOutput({ level: 'info', value, options });
          },
          info(value, options) {
            __factotumAppendOutput({ level: 'info', value, options });
          },
          warn(value, options) {
            __factotumAppendOutput({ level: 'warn', value, options });
          },
          error(value, options) {
            __factotumAppendOutput({ level: 'error', value, options });
          }
        },
        help(value, options = {}) {
          const detail = options && typeof options === 'object' && !Array.isArray(options)
            ? options
            : {};
          const level = ['info', 'warn', 'error'].includes(detail.level)
            ? detail.level
            : 'error';
          const outputOptions = {};
          if (detail.pretty != null) {
            outputOptions.pretty = Boolean(detail.pretty);
          }
          if (value !== undefined) {
            __factotumAppendOutput({ level, value, options: outputOptions });
          }
          throw (${createHelpRequestedError.toString()})();
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
        await __factotumLoadRequires();
        const __factotumMain = __factotumBuildUserMain();
        if (typeof __factotumMain !== 'function') {
          __factotumWriteCompletion({
            status: 'no_main'
          });
          return undefined;
        }
        const __factotumResult = await __factotumMain(__factotumMeta.argv, ctx);
        __factotumWriteCompletion({
          status: 'completed',
          result: __factotumResult
        });
        return __factotumResult;
      } catch (error) {
        if (error?.code === 'HELP_REQUESTED') {
          __factotumWriteCompletion({
            status: 'help'
          });
          return undefined;
        }
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
      }
    })();
    })();
    //# sourceURL=${sourceUrl}
  `;

  const suffix = `
      return typeof main === 'function' ? main : undefined;
    };
  `;

  return [prefix, String(invocation.command.code || ''), suffix, infix].join('\n');
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
    || getMessageWithSubstitutions(
      'overlayBusyDetail',
      [runningCommandRef],
      `Tab busy: ${runningCommandRef}. Cancel it or wait for it to finish.`
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

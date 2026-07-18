import { fontAwesomeIcons } from '../generated/fontawesome-icons.js';
import {
  DEFAULT_OVERLAY_OPACITY,
  MAX_OVERLAY_OPACITY,
  MIN_OVERLAY_OPACITY,
  normalizeOverlayPreferences,
  OVERLAY_OPACITY_STEP,
  OVERLAY_PREFS_KEY
} from '../shared/overlay_prefs.js';

const CONTROL_TYPE = 'fcmd_control';
const CONTROLLER_KEY = '__factotumOverlayController';
function buildStyleText() {
  return `
  :host {
    all: initial;
  }

  .factotum-shell {
    --factotum-shell-bg: rgba(15, 23, 42, var(--factotum-shell-opacity, 1));
    --factotum-shell-border: rgba(255, 255, 255, 0.18);
    --factotum-shell-fg: rgb(255, 255, 255);
    --factotum-entry-bg: rgba(255, 255, 255, 0.06);
    --factotum-entry-border: rgba(255, 255, 255, 0.08);
    --factotum-entry-fg: rgba(255, 255, 255, 0.9);
    --factotum-entry-status-fg: rgba(255, 255, 255, 0.75);
    --factotum-muted-fg: rgba(255, 255, 255, 0.8);
    --factotum-system-bg: rgba(30, 41, 59, 0.72);
    --factotum-help-pre-bg: rgba(255, 255, 255, 0.08);
    --factotum-button-bg: rgba(255, 255, 255, 0.12);
    --factotum-button-border: rgba(255, 255, 255, 0.16);
    background: var(--factotum-shell-bg);
    border: 1px solid var(--factotum-shell-border);
    border-radius: 16px;
    box-shadow: 0 22px 50px rgba(15, 23, 42, 0.35);
    color: var(--factotum-shell-fg);
    font-family: ui-sans-serif, system-ui, sans-serif;
    left: 50%;
    max-width: calc(100vw - 24px);
    min-width: min(360px, calc(100vw - 24px));
    padding: 16px;
    position: fixed;
    top: 20px;
    transform: translateX(-50%);
    width: min(40vw, calc(100vw - 24px));
    z-index: 2147483647;
  }

  .factotum-shell[data-theme="light"] {
    --factotum-shell-bg: rgba(255, 255, 255, var(--factotum-shell-opacity, 1));
    --factotum-shell-border: rgba(15, 23, 42, 0.12);
    --factotum-shell-fg: rgb(15, 23, 42);
    --factotum-entry-bg: rgba(226, 232, 240, 0.32);
    --factotum-entry-border: rgba(148, 163, 184, 0.28);
    --factotum-entry-fg: rgb(15, 23, 42);
    --factotum-entry-status-fg: rgb(71, 85, 105);
    --factotum-muted-fg: rgb(71, 85, 105);
    --factotum-system-bg: rgba(226, 232, 240, 0.54);
    --factotum-help-pre-bg: rgba(148, 163, 184, 0.16);
    --factotum-button-bg: rgba(226, 232, 240, 0.9);
    --factotum-button-border: rgba(148, 163, 184, 0.36);
  }

  .factotum-history {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 0 0 14px;
    max-height: 70vh;
    min-height: 140px;
    overflow-y: auto;
    padding-right: 4px;
    resize: vertical;
  }

  .factotum-current {
    margin: 0 0 14px;
  }

  .factotum-current[hidden] {
    display: none;
  }

  .factotum-empty {
    color: var(--factotum-muted-fg);
    font-size: 13px;
    line-height: 1.4;
    margin: 0 0 14px;
  }

  .factotum-empty[hidden] {
    display: none;
  }

  .factotum-history[hidden] {
    display: none;
  }

  .factotum-entry {
    background: var(--factotum-entry-bg);
    border: 1px solid var(--factotum-entry-border);
    border-radius: 12px;
    flex: 0 0 auto;
    overflow: hidden;
    padding: 10px 12px 10px 18px;
    position: relative;
  }

  .factotum-entry::before {
    background: rgba(148, 163, 184, 0.5);
    border-radius: 999px;
    bottom: 8px;
    content: '';
    left: 8px;
    position: absolute;
    top: 8px;
    width: 4px;
  }

  .factotum-entry[data-kind="output"] {
    background: rgba(148, 163, 184, 0.12);
  }

  .factotum-entry[data-kind="output"][data-level="info"]::before,
  .factotum-entry[data-state="DONE"]::before {
    background: rgba(74, 222, 128, 0.95);
  }

  .factotum-entry[data-level="warn"] {
    border-color: rgba(251, 191, 36, 0.35);
  }

  .factotum-entry[data-kind="output"][data-level="warn"]::before,
  .factotum-entry[data-state="CANCELED"]::before,
  .factotum-entry[data-state="BUSY"]::before {
    background: rgba(251, 191, 36, 0.95);
  }

  .factotum-entry[data-level="error"] {
    border-color: rgba(248, 113, 113, 0.35);
  }

  .factotum-entry[data-kind="output"][data-level="error"]::before,
  .factotum-entry[data-state="ERROR"]::before {
    background: rgba(248, 113, 113, 0.95);
  }

  .factotum-entry[data-state="RUNNING"]::before,
  .factotum-entry[data-state="HELP"]::before {
    background: rgba(96, 165, 250, 0.95);
  }

  .factotum-entry:not([data-kind="output"]) {
    background: var(--factotum-system-bg);
  }

  .factotum-entry[data-state="DONE"] {
    background: rgba(21, 128, 61, 0.16);
    border-color: rgba(74, 222, 128, 0.22);
  }

  .factotum-entry[data-state="ERROR"] {
    background: rgba(127, 29, 29, 0.24);
    border-color: rgba(248, 113, 113, 0.28);
  }

  .factotum-entry[data-state="CANCELED"],
  .factotum-entry[data-state="BUSY"] {
    background: rgba(133, 77, 14, 0.18);
    border-color: rgba(251, 191, 36, 0.24);
  }

  .factotum-entry[data-state="RUNNING"],
  .factotum-entry[data-state="HELP"] {
    background: rgba(30, 64, 175, 0.18);
    border-color: rgba(96, 165, 250, 0.24);
  }

  .factotum-entry-title {
    font-size: 12px;
    font-weight: 700;
    margin: 0 0 4px;
  }

  .factotum-entry-status {
    color: var(--factotum-entry-status-fg);
    font-size: 12px;
    margin: 0 0 6px;
  }

  .factotum-entry-message {
    color: var(--factotum-entry-fg);
    font-size: 12px;
    line-height: 1.4;
    margin: 0;
    white-space: pre-wrap;
  }

  .factotum-entry-help {
    color: var(--factotum-entry-fg);
    font-size: 12px;
    line-height: 1.45;
  }

  .factotum-entry-help h1,
  .factotum-entry-help h2,
  .factotum-entry-help p,
  .factotum-entry-help pre,
  .factotum-entry-help ul {
    margin: 0 0 8px;
  }

  .factotum-entry-help pre {
    background: var(--factotum-help-pre-bg);
    border-radius: 8px;
    overflow-x: auto;
    padding: 8px;
    white-space: pre-wrap;
  }
  .factotum-actions {
    align-items: center;
    display: flex;
    gap: 10px;
    justify-content: space-between;
  }

  .factotum-actions-leading,
  .factotum-actions-trailing {
    display: flex;
    gap: 10px;
  }

  .factotum-opacity-control {
    accent-color: currentColor;
    inline-size: 96px;
    margin: 0;
  }

  .factotum-button {
    appearance: none;
    background: var(--factotum-button-bg);
    border: 1px solid var(--factotum-button-border);
    border-radius: 999px;
    color: inherit;
    cursor: pointer;
    font: inherit;
    padding: 8px 12px;
  }

  .factotum-icon-button {
    align-items: center;
    aspect-ratio: 1;
    block-size: 38px;
    box-sizing: border-box;
    display: inline-flex;
    height: 38px;
    inline-size: 38px;
    justify-content: center;
    max-height: 38px;
    max-width: 38px;
    min-height: 38px;
    min-width: 38px;
    padding: 0;
    flex: 0 0 auto;
    width: 38px;
  }

  .factotum-icon-svg {
    display: block;
    fill: currentColor;
    height: 20px;
    margin: auto;
    width: 20px;
  }
`;
}

function getMessage(key, fallback) {
  return chrome.i18n.getMessage(key) || fallback;
}

function getScrollDistanceFromBottom(element) {
  return Math.max(0, element.scrollHeight - element.clientHeight - element.scrollTop);
}

function isScrolledToBottom(element, threshold = 4) {
  return getScrollDistanceFromBottom(element) <= threshold;
}

function entriesMatch(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isAppendOnlyUpdate(previousEntries, nextEntries) {
  if (!Array.isArray(previousEntries) || !Array.isArray(nextEntries)) {
    return false;
  }
  if (previousEntries.length > nextEntries.length) {
    return false;
  }
  for (let index = 0; index < previousEntries.length; index += 1) {
    if (!entriesMatch(previousEntries[index], nextEntries[index])) {
      return false;
    }
  }
  return true;
}

function buildIconSvgElement(name) {
  const iconData = fontAwesomeIcons[name];
  if (!iconData) {
    throw new Error(`Unknown generated icon: ${name}`);
  }
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('factotum-icon-svg');
  svg.setAttribute('viewBox', `0 0 ${iconData.width} ${iconData.height}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  for (const pathData of iconData.paths) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('fill', 'currentColor');
    path.setAttribute('d', pathData);
    svg.append(path);
  }
  return svg;
}

const stateLabels = {
  IDLE: '',
  RUNNING: getMessage('overlayRunning', 'Running...'),
  DONE: getMessage('overlayDone', 'Done.'),
  ERROR: getMessage('overlayError', 'Error.'),
  CANCELED: getMessage('overlayCanceled', 'Canceled.'),
  BUSY: getMessage('overlayBusy', 'Tab is busy.'),
  HELP: getMessage('overlayHelp', 'Help')
};

function teardownController(controller) {
  controller.currentInvocationId = null;
  controller.dismissible = false;
  controller.entries = [];
  controller.overlayRoot?.remove();
  controller.overlayRoot = null;
  controller.shadowRootRef = null;
}

if (window.top === window && !globalThis[CONTROLLER_KEY]) {
  const controller = {
    overlayRoot: null,
    shadowRootRef: null,
    currentInvocationId: null,
    dismissible: false,
    entries: [],
    theme: 'dark',
    opacity: DEFAULT_OVERLAY_OPACITY,
    historyPinnedToBottom: true
  };

  async function loadOverlayPreferences() {
    const result = await chrome.storage.local.get([OVERLAY_PREFS_KEY]);
    const preferences = normalizeOverlayPreferences(result[OVERLAY_PREFS_KEY]);
    controller.opacity = preferences.opacity;
    updateOverlayAppearance();
  }

  async function persistOverlayPreferences() {
    await chrome.storage.local.set({
      [OVERLAY_PREFS_KEY]: {
        opacity: controller.opacity
      }
    });
  }

  function bindOverlayControls() {
    controller.shadowRootRef.getElementById('factotum-cancel').textContent = getMessage('overlayCancel', 'Cancel');
    controller.shadowRootRef.getElementById('factotum-cancel').addEventListener('click', () => {
      if (!controller.currentInvocationId && !controller.dismissible) {
        return;
      }
      chrome.runtime.sendMessage(
        controller.dismissible
          ? {
              type: CONTROL_TYPE,
              op: 'DISMISS_REQUEST',
              invocationId: controller.currentInvocationId || null
            }
          : {
              type: CONTROL_TYPE,
              op: 'CANCEL_REQUEST',
              invocationId: controller.currentInvocationId
            }
      );

      if (controller.dismissible) {
        teardownController(controller);
      }
    });

    controller.shadowRootRef.getElementById('factotum-theme-toggle').addEventListener('click', () => {
      controller.theme = controller.theme === 'dark' ? 'light' : 'dark';
      updateOverlayAppearance();
    });

    const opacityControl = controller.shadowRootRef.getElementById('factotum-opacity');
    opacityControl.addEventListener('input', () => {
      controller.opacity = normalizeOverlayPreferences({
        opacity: Number(opacityControl.value)
      }).opacity;
      updateOverlayAppearance();
      persistOverlayPreferences().catch((error) => {
        console.error('[factotum] persist overlay preferences failed', error);
      });
    });
  }

  function ensureOverlay() {
    if (controller.overlayRoot) {
      return controller.overlayRoot;
    }

    const existingRoot = document.getElementById('factotum-overlay-root');
    if (existingRoot?.shadowRoot) {
      controller.overlayRoot = existingRoot;
      controller.shadowRootRef = existingRoot.shadowRoot;
      const shell = controller.shadowRootRef.querySelector('.factotum-shell');
      const history = controller.shadowRootRef.getElementById('factotum-history');
      if (shell?.dataset.theme === 'light') {
        controller.theme = 'light';
      }
      if (history && !history.hidden) {
        controller.historyPinnedToBottom = isScrolledToBottom(history);
      }
      bindOverlayControls();
      loadOverlayPreferences().catch((error) => {
        console.error('[factotum] load overlay preferences failed', error);
      });
      return controller.overlayRoot;
    }

    controller.overlayRoot = document.createElement('div');
    controller.overlayRoot.id = 'factotum-overlay-root';
    controller.shadowRootRef = controller.overlayRoot.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = buildStyleText();

    const shell = document.createElement('section');
    shell.className = 'factotum-shell';

    const history = document.createElement('div');
    history.className = 'factotum-history';
    history.id = 'factotum-history';
    history.hidden = true;
    history.addEventListener('scroll', () => {
      controller.historyPinnedToBottom = isScrolledToBottom(history);
    });

    const current = document.createElement('div');
    current.className = 'factotum-current';
    current.id = 'factotum-current';
    current.hidden = true;

    const empty = document.createElement('p');
    empty.className = 'factotum-empty';
    empty.id = 'factotum-empty';
    empty.hidden = true;

    const actions = document.createElement('div');
    actions.className = 'factotum-actions';

    const leadingActions = document.createElement('div');
    leadingActions.className = 'factotum-actions-leading';

    const themeButton = document.createElement('button');
    themeButton.className = 'factotum-button factotum-icon-button';
    themeButton.id = 'factotum-theme-toggle';
    themeButton.type = 'button';

    const themeIcon = document.createElement('span');
    themeIcon.id = 'factotum-theme-icon';
    themeIcon.setAttribute('aria-hidden', 'true');
    themeButton.append(themeIcon);
    leadingActions.append(themeButton);

    const opacityControl = document.createElement('input');
    opacityControl.className = 'factotum-opacity-control';
    opacityControl.id = 'factotum-opacity';
    opacityControl.type = 'range';
    opacityControl.min = String(MIN_OVERLAY_OPACITY);
    opacityControl.max = String(MAX_OVERLAY_OPACITY);
    opacityControl.step = String(OVERLAY_OPACITY_STEP);
    leadingActions.append(opacityControl);

    const trailingActions = document.createElement('div');
    trailingActions.className = 'factotum-actions-trailing';

    const cancelButton = document.createElement('button');
    cancelButton.className = 'factotum-button';
    cancelButton.id = 'factotum-cancel';
    cancelButton.type = 'button';
    trailingActions.append(cancelButton);

    actions.append(leadingActions, trailingActions);
    shell.append(history, current, empty, actions);

    controller.shadowRootRef.append(style, shell);
    document.documentElement.append(controller.overlayRoot);
    bindOverlayControls();
    loadOverlayPreferences().catch((error) => {
      console.error('[factotum] load overlay preferences failed', error);
    });

    return controller.overlayRoot;
  }

  function buildThemeIcon(theme) {
    if (theme === 'dark') {
      return buildIconSvgElement('moon');
    }

    return buildIconSvgElement('sun');
  }

  function updateOverlayAppearance() {
    if (!controller.shadowRootRef) {
      return;
    }

    const shell = controller.shadowRootRef.querySelector('.factotum-shell');
    const themeButton = controller.shadowRootRef.getElementById('factotum-theme-toggle');
    const themeIcon = controller.shadowRootRef.getElementById('factotum-theme-icon');
    const opacityControl = controller.shadowRootRef.getElementById('factotum-opacity');
    if (!shell || !themeButton || !themeIcon || !opacityControl) {
      return;
    }

    shell.dataset.theme = controller.theme;
    shell.style.setProperty('--factotum-shell-opacity', String(controller.opacity));
    const nextTheme = controller.theme === 'dark' ? 'light' : 'dark';
    themeIcon.replaceChildren(buildThemeIcon(controller.theme));
    const label = nextTheme === 'light'
      ? getMessage('overlayThemeLight', 'Switch overlay to light mode')
      : getMessage('overlayThemeDark', 'Switch overlay to dark mode');
    themeButton.title = label;
    themeButton.setAttribute('aria-label', label);
    opacityControl.value = String(controller.opacity);
    opacityControl.title = getMessage('overlayOpacity', 'Overlay opacity');
    opacityControl.setAttribute('aria-label', getMessage('overlayOpacity', 'Overlay opacity'));
    opacityControl.setAttribute('aria-valuetext', `${Math.round(controller.opacity * 100)}%`);
  }

  function buildEntryElement(entry) {
    const item = document.createElement('article');
    item.className = 'factotum-entry';
    if (entry.kind) {
      item.dataset.kind = entry.kind;
    }
    if (entry.level) {
      item.dataset.level = entry.level;
    }
    if (entry.state) {
      item.dataset.state = entry.state;
    }

    const title = document.createElement('p');
    title.className = 'factotum-entry-title';
    title.textContent = entry.commandRef || getMessage('appName', 'Factotum');

    const status = document.createElement('p');
    status.className = 'factotum-entry-status';
    status.textContent = stateLabels[entry.state] || entry.state || '';
    status.hidden = !status.textContent;

    item.append(title, status);

    if (entry.state === 'HELP' && entry.html) {
      const help = document.createElement('div');
      help.className = 'factotum-entry-help';
      help.innerHTML = entry.html;
      item.append(help);
    } else if (entry.message) {
      const message = document.createElement('p');
      message.className = 'factotum-entry-message';
      message.textContent = entry.message;
      item.append(message);
    }

    return item;
  }

  function renderSession({ entries = [], snapshot = null, emptyMessage = '' }) {
    const hadOverlay = Boolean(controller.overlayRoot);
    ensureOverlay();

    const nextEntries = Array.isArray(entries) ? entries : [];
    const previousEntries = controller.entries;
    const canAppendHistory = hadOverlay && isAppendOnlyUpdate(previousEntries, nextEntries);
    controller.entries = nextEntries;
    controller.currentInvocationId = snapshot?.invocationId || null;
    controller.dismissible = snapshot?.dismissible !== false;

    const historyRoot = controller.shadowRootRef.getElementById('factotum-history');
    const currentRoot = controller.shadowRootRef.getElementById('factotum-current');
    const emptyRoot = controller.shadowRootRef.getElementById('factotum-empty');
    const button = controller.shadowRootRef.getElementById('factotum-cancel');
    const shouldScrollOnOpen = !hadOverlay;
    if (shouldScrollOnOpen) {
      controller.historyPinnedToBottom = true;
    }

    if (!canAppendHistory) {
      historyRoot.replaceChildren();
      historyRoot.hidden = controller.entries.length === 0;
      for (const entry of controller.entries) {
        historyRoot.append(buildEntryElement(entry));
      }
    } else {
      historyRoot.hidden = controller.entries.length === 0;
      for (let index = previousEntries.length; index < controller.entries.length; index += 1) {
        historyRoot.append(buildEntryElement(controller.entries[index]));
      }
    }

    currentRoot.replaceChildren();
    if (snapshot && snapshot.state && snapshot.state !== 'IDLE') {
      currentRoot.hidden = false;
      currentRoot.append(buildEntryElement(snapshot));
    } else {
      currentRoot.hidden = true;
    }

    emptyRoot.textContent = emptyMessage || '';
    emptyRoot.hidden = controller.entries.length > 0 || !emptyMessage;

    button.hidden = !snapshot && controller.entries.length === 0;
    button.textContent = snapshot?.state === 'RUNNING'
      ? getMessage('overlayCancel', 'Cancel')
      : getMessage('overlayClose', 'Close');
    updateOverlayAppearance();

    if (!historyRoot.hidden) {
      if (shouldScrollOnOpen || controller.historyPinnedToBottom) {
        historyRoot.scrollTop = historyRoot.scrollHeight;
      }
    }
  }

  function teardownOverlay(invocationId) {
    if (invocationId && controller.currentInvocationId && invocationId !== controller.currentInvocationId) {
      return;
    }
    teardownController(controller);
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (!message || message.type !== CONTROL_TYPE) {
      return undefined;
    }

    if (message.op === 'TEARDOWN') {
      teardownOverlay(message.invocationId);
    }

    if (message.op === 'SHOW_SESSION') {
      renderSession({
        entries: message.entries || [],
        snapshot: message.snapshot || null,
        emptyMessage: message.emptyMessage || ''
      });
    }

    return undefined;
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local' || !changes[OVERLAY_PREFS_KEY]) {
      return;
    }
    controller.opacity = normalizeOverlayPreferences(changes[OVERLAY_PREFS_KEY].newValue).opacity;
    updateOverlayAppearance();
  });

  // Clear overlay when the current document is being torn down.
  window.addEventListener('pagehide', () => {
    teardownController(controller);
  });

  globalThis[CONTROLLER_KEY] = controller;
}

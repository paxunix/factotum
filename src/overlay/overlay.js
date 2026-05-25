const CONTROL_TYPE = 'fcmd_control';
const CONTROLLER_KEY = '__factotumOverlayController';
function buildStyleText(materialSymbolsUrl) {
  return `
  :host {
    all: initial;
  }

  .factotum-shell {
    --factotum-shell-bg: rgba(15, 23, 42, 0.9);
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
    --factotum-shell-bg: rgba(255, 255, 255, 0.96);
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
    display: inline-flex;
    justify-content: center;
    min-height: 38px;
    min-width: 38px;
    padding: 0;
  }

  .factotum-icon-svg {
    display: inline-block;
    fill: currentColor;
    height: 20px;
    line-height: 1;
    width: 20px;
  }
`;
}

function getMessage(key, fallback) {
  return chrome.i18n.getMessage(key) || fallback;
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
    theme: 'dark'
  };

  function ensureOverlay() {
    if (controller.overlayRoot) {
      return controller.overlayRoot;
    }

    controller.overlayRoot = document.createElement('div');
    controller.overlayRoot.id = 'factotum-overlay-root';
    controller.shadowRootRef = controller.overlayRoot.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = buildStyleText(chrome.runtime.getURL('vendor/material-symbols/material-symbols-outlined.woff2'));

    const shell = document.createElement('section');
    shell.className = 'factotum-shell';
    shell.innerHTML = `
      <div class="factotum-history" id="factotum-history" hidden></div>
      <div class="factotum-current" id="factotum-current" hidden></div>
      <p class="factotum-empty" id="factotum-empty" hidden></p>
      <div class="factotum-actions">
        <div class="factotum-actions-leading">
          <button class="factotum-button factotum-icon-button" id="factotum-theme-toggle" type="button">
            <span id="factotum-theme-icon" aria-hidden="true"></span>
          </button>
        </div>
        <div class="factotum-actions-trailing">
          <button class="factotum-button" id="factotum-cancel" type="button"></button>
        </div>
      </div>
    `;

    controller.shadowRootRef.append(style, shell);
    document.documentElement.append(controller.overlayRoot);

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
      updateTheme();
    });

    return controller.overlayRoot;
  }

  function themeIconMarkup(theme) {
    if (theme === 'dark') {
      return `
        <svg class="factotum-icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12.43 22q-2.93 0-5.18-1.76Q5 18.48 4.24 15.78 3.48 13.08 4.2 10.35q.72-2.72 3.02-4.68.39-.33.89-.2.5.13.69.62.56 1.46 1.54 2.73.98 1.26 2.3 2.2 1.31.94 2.89 1.44 1.57.49 3.3.42.53-.02.83.41.3.43.13.92-.89 2.55-3.13 4.39Q14.42 22 11.57 22h.86Z"/>
        </svg>
      `;
    }

    return `
      <svg class="factotum-icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M11 5V1h2v4h-2Zm6.36 2.05-1.41-1.41 2.83-2.83 1.41 1.41-2.83 2.83ZM19 13v-2h4v2h-4Zm-7 6q-2.5 0-4.25-1.75T6 13q0-2.5 1.75-4.25T12 7q2.5 0 4.25 1.75T18 13q0 2.5-1.75 4.25T12 19Zm0-2q1.65 0 2.83-1.17Q16 14.65 16 13q0-1.65-1.17-2.83Q13.65 9 12 9q-1.65 0-2.83 1.17Q8 11.35 8 13q0 1.65 1.17 2.83Q10.35 17 12 17Zm-7-4v-2H1v2h4Zm1.64-5.95L3.81 4.22l1.41-1.41 2.83 2.83-1.41 1.41ZM19.78 21.19l-2.83-2.83 1.41-1.41 2.83 2.83-1.41 1.41ZM5.22 21.19l-1.41-1.41 2.83-2.83 1.41 1.41-2.83 2.83Z"/>
      </svg>
    `;
  }

  function updateTheme() {
    if (!controller.shadowRootRef) {
      return;
    }

    const shell = controller.shadowRootRef.querySelector('.factotum-shell');
    const themeButton = controller.shadowRootRef.getElementById('factotum-theme-toggle');
    const themeIcon = controller.shadowRootRef.getElementById('factotum-theme-icon');
    if (!shell || !themeButton || !themeIcon) {
      return;
    }

    shell.dataset.theme = controller.theme;
    const nextTheme = controller.theme === 'dark' ? 'light' : 'dark';
    themeIcon.innerHTML = themeIconMarkup(controller.theme);
    const label = nextTheme === 'light'
      ? getMessage('overlayThemeLight', 'Switch overlay to light mode')
      : getMessage('overlayThemeDark', 'Switch overlay to dark mode');
    themeButton.title = label;
    themeButton.setAttribute('aria-label', label);
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
    ensureOverlay();

    controller.entries = Array.isArray(entries) ? entries : [];
    controller.currentInvocationId = snapshot?.invocationId || null;
    controller.dismissible = snapshot?.dismissible !== false;

    const historyRoot = controller.shadowRootRef.getElementById('factotum-history');
    const currentRoot = controller.shadowRootRef.getElementById('factotum-current');
    const emptyRoot = controller.shadowRootRef.getElementById('factotum-empty');
    const button = controller.shadowRootRef.getElementById('factotum-cancel');

    historyRoot.innerHTML = '';
    historyRoot.hidden = controller.entries.length === 0;
    for (const entry of controller.entries) {
      historyRoot.append(buildEntryElement(entry));
    }

    currentRoot.innerHTML = '';
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
    updateTheme();
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

  // Clear overlay on page lifecycle transitions so stale UI does not survive BFCache/history restores.
  window.addEventListener('pagehide', () => {
    if (controller.dismissible && controller.currentInvocationId) {
      chrome.runtime.sendMessage({
        type: CONTROL_TYPE,
        op: 'DISMISS_REQUEST',
        invocationId: controller.currentInvocationId
      }).catch(() => {});
    }
    teardownController(controller);
  });

  globalThis[CONTROLLER_KEY] = controller;
}

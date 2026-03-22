const CONTROL_TYPE = 'fcmd_control';
const CONTROLLER_KEY = '__factotumOverlayController';
const STYLE_TEXT = `
  :host {
    all: initial;
  }

  .factotum-shell {
    background: rgba(15, 23, 42, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 16px;
    box-shadow: 0 22px 50px rgba(15, 23, 42, 0.35);
    color: white;
    font-family: ui-sans-serif, system-ui, sans-serif;
    left: 50%;
    max-width: min(360px, calc(100vw - 24px));
    padding: 16px;
    position: fixed;
    top: 20px;
    transform: translateX(-50%);
    width: min(360px, calc(100vw - 24px));
    z-index: 2147483647;
  }

  .factotum-history {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 0 0 14px;
    max-height: min(240px, 40vh);
    overflow-y: auto;
    padding-right: 4px;
  }

  .factotum-history[hidden] {
    display: none;
  }

  .factotum-entry {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 10px 12px;
  }

  .factotum-entry-title {
    font-size: 12px;
    font-weight: 700;
    margin: 0 0 4px;
  }

  .factotum-entry-status {
    color: rgba(255, 255, 255, 0.75);
    font-size: 12px;
    margin: 0 0 6px;
  }

  .factotum-entry-message {
    color: rgba(255, 255, 255, 0.9);
    font-size: 12px;
    line-height: 1.4;
    margin: 0;
    white-space: pre-wrap;
  }

  .factotum-entry-help {
    color: rgba(255, 255, 255, 0.92);
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
    background: rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    overflow-x: auto;
    padding: 8px;
    white-space: pre-wrap;
  }

  .factotum-title {
    font-size: 14px;
    font-weight: 700;
    margin: 0 0 6px;
  }

  .factotum-status {
    color: rgba(255, 255, 255, 0.82);
    font-size: 13px;
    margin: 0 0 12px;
  }

  .factotum-message {
    color: rgba(255, 255, 255, 0.92);
    font-size: 13px;
    line-height: 1.45;
    margin: 0 0 14px;
    min-height: 18px;
  }

  .factotum-help {
    color: rgba(255, 255, 255, 0.95);
    font-size: 13px;
    line-height: 1.5;
    margin: 0 0 14px;
  }

  .factotum-help h1,
  .factotum-help h2,
  .factotum-help p,
  .factotum-help pre,
  .factotum-help ul {
    margin: 0 0 10px;
  }

  .factotum-help pre {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    overflow-x: auto;
    padding: 10px;
    white-space: pre-wrap;
  }

  .factotum-help code {
    font-family: ui-monospace, SFMono-Regular, monospace;
  }

  .factotum-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }

  .factotum-button {
    appearance: none;
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 999px;
    color: white;
    cursor: pointer;
    font: inherit;
    padding: 8px 12px;
  }
`;

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
    entries: []
  };

  function ensureOverlay() {
    if (controller.overlayRoot) {
      return controller.overlayRoot;
    }

    controller.overlayRoot = document.createElement('div');
    controller.overlayRoot.id = 'factotum-overlay-root';
    controller.shadowRootRef = controller.overlayRoot.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = STYLE_TEXT;

    const shell = document.createElement('section');
    shell.className = 'factotum-shell';
    shell.innerHTML = `
      <div class="factotum-history" id="factotum-history" hidden></div>
      <h1 class="factotum-title" id="factotum-title"></h1>
      <p class="factotum-status" id="factotum-status"></p>
      <p class="factotum-message" id="factotum-message"></p>
      <div class="factotum-help" id="factotum-help" hidden></div>
      <div class="factotum-actions">
        <button class="factotum-button" id="factotum-cancel"></button>
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

    return controller.overlayRoot;
  }

  function renderHistory(entries = []) {
    ensureOverlay();

    controller.entries = Array.isArray(entries) ? entries : [];
    const root = controller.shadowRootRef.getElementById('factotum-history');
    root.innerHTML = '';
    root.hidden = controller.entries.length === 0;

    for (const entry of controller.entries) {
      const item = document.createElement('article');
      item.className = 'factotum-entry';

      const title = document.createElement('p');
      title.className = 'factotum-entry-title';
      title.textContent = entry.commandRef || getMessage('appName', 'Factotum');

      const status = document.createElement('p');
      status.className = 'factotum-entry-status';
      status.textContent = stateLabels[entry.state] || entry.state || '';

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

      root.append(item);
    }
  }

  function renderOverlay({ commandRef, state, message, dismissible = false }) {
    if (!ensureOverlay()) {
      return;
    }

    const helpRoot = controller.shadowRootRef.getElementById('factotum-help');
    const titleRoot = controller.shadowRootRef.getElementById('factotum-title');
    const statusRoot = controller.shadowRootRef.getElementById('factotum-status');
    const messageRoot = controller.shadowRootRef.getElementById('factotum-message');
    const idleShell = state === 'IDLE' && !message;
    controller.dismissible = dismissible;
    titleRoot.textContent = commandRef;
    titleRoot.hidden = idleShell;
    statusRoot.textContent = stateLabels[state] || state;
    statusRoot.hidden = idleShell;
    messageRoot.textContent = message || '';
    messageRoot.hidden = state === 'HELP' || idleShell;
    helpRoot.hidden = true;
    helpRoot.innerHTML = '';
    const button = controller.shadowRootRef.getElementById('factotum-cancel');
    button.hidden = state !== 'RUNNING' && !dismissible;
    button.textContent = dismissible ? getMessage('overlayClose', 'Close') : getMessage('overlayCancel', 'Cancel');
  }

  function renderHelp({ commandRef, html }) {
    if (!ensureOverlay()) {
      return;
    }

    controller.dismissible = true;
    controller.shadowRootRef.getElementById('factotum-title').textContent = commandRef;
    controller.shadowRootRef.getElementById('factotum-status').textContent = stateLabels.HELP;
    controller.shadowRootRef.getElementById('factotum-message').hidden = true;
    controller.shadowRootRef.getElementById('factotum-message').textContent = '';
    const helpRoot = controller.shadowRootRef.getElementById('factotum-help');
    helpRoot.hidden = false;
    helpRoot.innerHTML = html || '';
    const button = controller.shadowRootRef.getElementById('factotum-cancel');
    button.hidden = false;
    button.textContent = getMessage('overlayClose', 'Close');
  }

  function teardownOverlay(invocationId) {
    if (controller.currentInvocationId && invocationId !== controller.currentInvocationId) {
      return;
    }
    teardownController(controller);
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (!message || message.type !== CONTROL_TYPE) {
      return undefined;
    }

    if (message.op === 'INIT_OVERLAY') {
      controller.currentInvocationId = message.invocationId;
      renderHistory(message.entries || []);
      renderOverlay({
        commandRef: message.commandRef,
        state: message.state || 'RUNNING',
        message: message.message || '',
        dismissible: message.state !== 'RUNNING'
      });
    }

    if (message.op === 'SET_STATUS' && message.invocationId === controller.currentInvocationId) {
      renderHistory(message.entries || controller.entries);
      renderOverlay({
        commandRef: controller.shadowRootRef?.getElementById('factotum-title')?.textContent || '',
        state: message.state,
        message: message.message || '',
        dismissible: message.state !== 'RUNNING'
      });
    }

    if (message.op === 'SET_HELP' && message.invocationId === controller.currentInvocationId) {
      renderHistory(message.entries || controller.entries);
      renderHelp({
        commandRef: message.commandRef || controller.shadowRootRef?.getElementById('factotum-title')?.textContent || '',
        html: message.html || ''
      });
    }

    if (message.op === 'TEARDOWN') {
      teardownOverlay(message.invocationId);
    }

    if (message.op === 'SHOW_SESSION') {
      const snapshot = message.snapshot || {};
      controller.currentInvocationId = snapshot.invocationId || null;
      renderHistory(message.entries || []);
      if (snapshot.state === 'HELP') {
        renderHelp({
          commandRef: snapshot.commandRef || getMessage('appName', 'Factotum'),
          html: snapshot.html || ''
        });
      } else {
        renderOverlay({
          commandRef: snapshot.commandRef || getMessage('appName', 'Factotum'),
          state: snapshot.state || 'IDLE',
          message: snapshot.message || '',
          dismissible: snapshot.dismissible !== false
        });
      }
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

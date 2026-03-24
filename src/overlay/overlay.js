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

  .factotum-current {
    margin: 0 0 14px;
  }

  .factotum-current[hidden] {
    display: none;
  }

  .factotum-empty {
    color: rgba(255, 255, 255, 0.8);
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
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 10px 12px;
  }

  .factotum-entry[data-kind="output"] {
    background: rgba(148, 163, 184, 0.12);
  }

  .factotum-entry[data-level="warn"] {
    border-color: rgba(251, 191, 36, 0.35);
  }

  .factotum-entry[data-level="error"] {
    border-color: rgba(248, 113, 113, 0.35);
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
      <div class="factotum-current" id="factotum-current" hidden></div>
      <p class="factotum-empty" id="factotum-empty" hidden></p>
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

  function buildEntryElement(entry) {
    const item = document.createElement('article');
    item.className = 'factotum-entry';
    if (entry.kind) {
      item.dataset.kind = entry.kind;
    }
    if (entry.level) {
      item.dataset.level = entry.level;
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

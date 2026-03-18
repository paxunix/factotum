const CONTROL_TYPE = 'fcmd_control';
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
    inset: 20px 20px auto auto;
    max-width: 360px;
    padding: 16px;
    position: fixed;
    z-index: 2147483647;
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
  RUNNING: getMessage('overlayRunning', 'Running...'),
  DONE: getMessage('overlayDone', 'Done.'),
  ERROR: getMessage('overlayError', 'Error.'),
  CANCELED: getMessage('overlayCanceled', 'Canceled.'),
  BUSY: getMessage('overlayBusy', 'Tab is busy.'),
  HELP: getMessage('overlayHelp', 'Help')
};

let overlayRoot = null;
let shadowRootRef = null;
let currentInvocationId = null;

function ensureOverlay() {
  if (window.top !== window) {
    return null;
  }

  if (overlayRoot) {
    return overlayRoot;
  }

  overlayRoot = document.createElement('div');
  overlayRoot.id = 'factotum-overlay-root';
  shadowRootRef = overlayRoot.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = STYLE_TEXT;

  const shell = document.createElement('section');
  shell.className = 'factotum-shell';
  shell.innerHTML = `
    <h1 class="factotum-title" id="factotum-title"></h1>
    <p class="factotum-status" id="factotum-status"></p>
    <p class="factotum-message" id="factotum-message"></p>
    <div class="factotum-actions">
      <button class="factotum-button" id="factotum-cancel"></button>
    </div>
  `;

  shadowRootRef.append(style, shell);
  document.documentElement.append(overlayRoot);

  shadowRootRef.getElementById('factotum-cancel').textContent = getMessage('overlayCancel', 'Cancel');
  shadowRootRef.getElementById('factotum-cancel').addEventListener('click', () => {
    if (!currentInvocationId) {
      return;
    }
    chrome.runtime.sendMessage({
      type: CONTROL_TYPE,
      op: 'CANCEL_REQUEST',
      invocationId: currentInvocationId
    });
  });

  return overlayRoot;
}

function renderOverlay({ commandRef, state, message }) {
  if (!ensureOverlay()) {
    return;
  }

  shadowRootRef.getElementById('factotum-title').textContent = commandRef;
  shadowRootRef.getElementById('factotum-status').textContent = stateLabels[state] || state;
  shadowRootRef.getElementById('factotum-message').textContent = message || '';
  shadowRootRef.getElementById('factotum-cancel').hidden = state !== 'RUNNING';
}

function teardownOverlay(invocationId) {
  if (currentInvocationId && invocationId !== currentInvocationId) {
    return;
  }
  currentInvocationId = null;
  overlayRoot?.remove();
  overlayRoot = null;
  shadowRootRef = null;
}

chrome.runtime.onMessage.addListener((message) => {
  if (!message || message.type !== CONTROL_TYPE) {
    return undefined;
  }

  if (message.op === 'INIT_OVERLAY') {
    currentInvocationId = message.invocationId;
    renderOverlay({
      commandRef: message.commandRef,
      state: message.state || 'RUNNING',
      message: message.message || ''
    });
  }

  if (message.op === 'SET_STATUS' && message.invocationId === currentInvocationId) {
    renderOverlay({
      commandRef: shadowRootRef?.getElementById('factotum-title')?.textContent || '',
      state: message.state,
      message: message.message || ''
    });
  }

  if (message.op === 'TEARDOWN') {
    teardownOverlay(message.invocationId);
  }

  return undefined;
});

import { setBasePath } from '@awesome.me/webawesome/dist/webawesome.js';
import '@awesome.me/webawesome/dist/components/button/button.js';
import {
  exportBundle,
  getCommand,
  importBundle,
  listCommandIndex,
  resolveLocalizedText,
  saveCommand
} from '../sw/storage.js';

// Ensure Web Awesome assets resolve inside the extension bundle.
setBasePath(chrome.runtime.getURL('vendor/webawesome'));

function getMessage(key, fallback = key) {
  return chrome.i18n.getMessage(key) || fallback;
}

const title = getMessage('managerTitle', 'Factotum');
const hint = getMessage('managerHint', 'UI skeleton. Wire up manager in v1 milestones.');
const navManager = getMessage('navManager', 'Manager');
const navLogs = getMessage('navLogs', 'Logs');
const bundleToolsTitle = getMessage('managerBundleToolsTitle', 'Bundle Tools');
const bundleToolsHint = getMessage('managerBundleToolsHint', 'Import or export the v1 bundle format to populate storage for manual smoke testing.');
const importBundleLabel = getMessage('managerImportBundle', 'Import Bundle');
const exportBundleLabel = getMessage('managerExportBundle', 'Export Bundle');
const bundleLabel = getMessage('managerBundleTextareaLabel', 'Bundle JSON');
const disableCommandLabel = getMessage('managerDisableCommand', 'Disable');
const enableCommandLabel = getMessage('managerEnableCommand', 'Enable');
const commandListTitle = getMessage('managerCommandsTitle', 'Installed Commands');
const commandListHint = getMessage('managerCommandsHint', 'M1 shows the stored command index and localized descriptions.');
const emptyMessage = getMessage('managerCommandsEmpty', 'No commands are installed.');
const worldLabel = getMessage('managerCommandWorld', 'World');
const updatedLabel = getMessage('managerCommandUpdated', 'Updated');
const enabledLabel = getMessage('managerCommandEnabled', 'Enabled');
const disabledLabel = getMessage('managerCommandDisabled', 'Disabled');
const invalidLabel = getMessage('managerCommandInvalid', 'Invalid');
const validationIssueLabel = getMessage('managerCommandValidationIssue', 'Validation issue');
const invalidDescriptionLabel = getMessage('managerCommandInvalidDescription', 'This command is quarantined and excluded from resolution, invocation, and normal export.');
const exportInvalidSummaryLabel = getMessage('managerExportInvalidSummary', 'Preserved $COUNT$ invalid command(s).');
const importInvalidSummaryLabel = getMessage('managerImportInvalidSummary', 'Quarantined $COUNT$ invalid command(s).');

document.title = title;
document.getElementById('manager-title').textContent = title;
document.getElementById('manager-hint').textContent = hint;
document.getElementById('nav-manager').textContent = navManager;
document.getElementById('nav-logs').textContent = navLogs;
document.getElementById('bundle-tools-title').textContent = bundleToolsTitle;
document.getElementById('bundle-tools-hint').textContent = bundleToolsHint;
document.getElementById('import-bundle-button').textContent = importBundleLabel;
document.getElementById('export-bundle-button').textContent = exportBundleLabel;
document.getElementById('bundle-label').textContent = bundleLabel;
document.getElementById('command-list-title').textContent = commandListTitle;
document.getElementById('command-list-hint').textContent = commandListHint;

const bundleTextarea = document.getElementById('bundle-textarea');
const bundleStatus = document.getElementById('bundle-status');

function formatDateTime(value) {
  return new Intl.DateTimeFormat(navigator.language || 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function setBundleStatus(kind, messages) {
  const lines = Array.isArray(messages) ? messages.filter(Boolean) : [messages].filter(Boolean);
  bundleStatus.hidden = false;
  bundleStatus.className = `bundle-status bundle-status-${kind}`;
  bundleStatus.textContent = '';

  for (const line of lines) {
    const item = document.createElement('div');
    item.className = 'bundle-status-line';
    item.textContent = line;
    bundleStatus.append(item);
  }
}

function clearBundleStatus() {
  bundleStatus.hidden = true;
  bundleStatus.className = 'bundle-status';
  bundleStatus.textContent = '';
}

function formatCountMessage(template, count) {
  return template.replace('$COUNT$', String(count));
}

async function toggleDisabled(commandRef) {
  const command = await getCommand(commandRef.name, commandRef.id);
  if (!command) {
    throw new Error(`Command not found: ${commandRef.name}@${commandRef.id}`);
  }

  await saveCommand({
    ...command,
    disabled: !command.disabled,
    updatedAt: Date.now()
  });
}

function renderCommands(commands) {
  const container = document.getElementById('command-list');
  const emptyState = document.getElementById('command-list-empty');

  container.textContent = '';
  if (commands.length === 0) {
    emptyState.hidden = false;
    emptyState.textContent = emptyMessage;
    return;
  }

  emptyState.hidden = true;

  for (const command of commands) {
    const card = document.createElement('article');
    card.className = 'command-card';

    const header = document.createElement('div');
    header.className = 'command-card-header';

    const ref = document.createElement('div');
    ref.className = 'command-ref';
    ref.textContent = `${command.name}@${command.id}`;

    const status = document.createElement('span');
    status.className = `command-status ${command.invalid ? 'command-status-invalid' : command.disabled ? 'command-status-disabled' : 'command-status-enabled'}`;
    status.textContent = command.invalid ? invalidLabel : command.disabled ? disabledLabel : enabledLabel;

    header.append(ref, status);

    const meta = document.createElement('div');
    meta.className = 'command-meta';
    const worldMeta = document.createElement('span');
    worldMeta.textContent = `${worldLabel}: ${command.world}`;

    const updatedMeta = document.createElement('span');
    updatedMeta.textContent = `${updatedLabel}: ${formatDateTime(command.updatedAt)}`;

    meta.append(worldMeta, updatedMeta);

    const description = document.createElement('div');
    description.className = 'command-description';
    description.textContent = command.invalid
      ? invalidDescriptionLabel
      : resolveLocalizedText(command.description, navigator.language || 'en-US');

    if (command.invalid && command.validationError?.message) {
      const invalidDetail = document.createElement('div');
      invalidDetail.className = 'command-invalid-detail';
      invalidDetail.textContent = `${validationIssueLabel}: ${command.validationError.message}`;
      card.append(header, meta, description, invalidDetail);
    } else {
      card.append(header, meta, description);
    }

    const actions = document.createElement('div');
    actions.className = 'command-card-actions';

    if (!command.invalid) {
      const toggleButton = document.createElement('wa-button');
      toggleButton.setAttribute('variant', 'neutral');
      toggleButton.textContent = command.disabled ? enableCommandLabel : disableCommandLabel;
      toggleButton.addEventListener('click', () => {
        toggleButton.disabled = true;
        toggleDisabled(command)
          .catch((error) => {
            console.error('[factotum] toggle disabled failed', error);
            setBundleStatus('error', error.message || String(error));
          })
          .finally(() => {
            toggleButton.disabled = false;
          });
      });

      actions.append(toggleButton);
    }

    if (actions.childElementCount > 0) {
      card.append(actions);
    }
    container.append(card);
  }
}

async function loadCommands() {
  const commands = await listCommandIndex({ includeInvalid: true });
  commands.sort((left, right) => {
    const leftMru = Number.isFinite(left.mruAt) ? left.mruAt : -1;
    const rightMru = Number.isFinite(right.mruAt) ? right.mruAt : -1;
    if (leftMru !== rightMru) {
      return rightMru - leftMru;
    }
    return right.updatedAt - left.updatedAt;
  });
  renderCommands(commands);
}

async function handleImportBundle() {
  clearBundleStatus();

  let parsed;
  try {
    parsed = JSON.parse(bundleTextarea.value);
  } catch (error) {
    setBundleStatus('error', error.message || 'Invalid JSON');
    return;
  }

  try {
    const result = await importBundle(parsed);
    const statusLines = [`Imported ${result.importedCommands.length} command(s).`];
    if (result.quarantinedCommands > 0) {
      statusLines.push(formatCountMessage(importInvalidSummaryLabel, result.quarantinedCommands));
    }
    for (const warning of result.warnings) {
      statusLines.push(warning.message);
    }
    setBundleStatus('success', statusLines);
    await loadCommands();
  } catch (error) {
    setBundleStatus('error', error.message || String(error));
  }
}

async function handleExportBundle() {
  clearBundleStatus();
  try {
    const bundle = await exportBundle();
    bundleTextarea.value = JSON.stringify(bundle, null, 2);
    const statusLines = [`Exported ${bundle.commands.length} command(s).`];
    if (Array.isArray(bundle.invalidCommands) && bundle.invalidCommands.length > 0) {
      statusLines.push(formatCountMessage(exportInvalidSummaryLabel, bundle.invalidCommands.length));
    }
    setBundleStatus('success', statusLines);
  } catch (error) {
    setBundleStatus('error', error.message || String(error));
  }
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && (changes['fcmd:index'] || changes['fcmd:aliases'])) {
    loadCommands().catch((error) => {
      console.error('[factotum] manager refresh failed', error);
    });
  }
});

document.getElementById('import-bundle-button').addEventListener('click', () => {
  handleImportBundle().catch((error) => {
    setBundleStatus('error', error.message || String(error));
  });
});

document.getElementById('export-bundle-button').addEventListener('click', () => {
  handleExportBundle().catch((error) => {
    setBundleStatus('error', error.message || String(error));
  });
});

loadCommands()
  .then(() => {
    console.log('[factotum] manager UI loaded');
  })
  .catch((error) => {
    console.error('[factotum] manager UI failed', error);
  });

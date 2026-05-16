import { setBasePath } from '@awesome.me/webawesome/dist/webawesome.js';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/switch/switch.js';
import '@awesome.me/webawesome/dist/components/textarea/textarea.js';
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

function getMessage(key, fallback = key, substitutions) {
  return chrome.i18n.getMessage(key, substitutions) || fallback;
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
const editCommandLabel = getMessage('managerEditCommand', 'Edit');
const editorTitle = getMessage('managerEditorTitle', 'Command Editor');
const editorHint = getMessage('managerEditorHint', 'Edit an installed valid command. Name, ID, and world are read-only in this first editor slice.');
const editorEmptyMessage = getMessage('managerEditorEmpty', 'Select a valid command to edit.');
const editorNameLabel = getMessage('managerEditorName', 'Name');
const editorIdLabel = getMessage('managerEditorId', 'ID');
const editorWorldLabel = getMessage('managerEditorWorld', 'World');
const editorDisabledLabel = getMessage('managerEditorDisabled', 'Disabled');
const editorDescriptionLabel = getMessage('managerEditorDescription', 'Description JSON');
const editorCodeLabel = getMessage('managerEditorCode', 'Code');
const editorAdvancedLabel = getMessage('managerEditorAdvanced', 'Help, options, and requires');
const editorHelpTemplateLabel = getMessage('managerEditorHelpTemplate', 'Help HTML template');
const editorHelpStringsLabel = getMessage('managerEditorHelpStrings', 'Help strings JSON');
const editorOptionsLabel = getMessage('managerEditorOptions', 'Options spec JSON');
const editorRequiresLabel = getMessage('managerEditorRequires', 'Requires JSON array');
const editorSaveLabel = getMessage('managerEditorSave', 'Save Command');
const editorResetLabel = getMessage('managerEditorReset', 'Reset');
const editorSavedLabel = getMessage('managerEditorSaved', 'Saved command: $COMMAND$');

document.title = title;
document.getElementById('manager-title').textContent = title;
document.getElementById('manager-hint').textContent = hint;
document.getElementById('nav-manager').textContent = navManager;
document.getElementById('nav-logs').textContent = navLogs;
document.getElementById('bundle-tools-title').textContent = bundleToolsTitle;
document.getElementById('bundle-tools-hint').textContent = bundleToolsHint;
document.getElementById('import-bundle-button').textContent = importBundleLabel;
document.getElementById('export-bundle-button').textContent = exportBundleLabel;
document.getElementById('command-list-title').textContent = commandListTitle;
document.getElementById('command-list-hint').textContent = commandListHint;
document.getElementById('command-editor-title').textContent = editorTitle;
document.getElementById('command-editor-hint').textContent = editorHint;
document.getElementById('command-editor-empty').textContent = editorEmptyMessage;
document.getElementById('editor-advanced-label').textContent = editorAdvancedLabel;
document.getElementById('editor-save-button').textContent = editorSaveLabel;
document.getElementById('editor-reset-button').textContent = editorResetLabel;

const bundleTextarea = document.getElementById('bundle-textarea');
const bundleStatus = document.getElementById('bundle-status');
const editorForm = document.getElementById('command-editor');
const editorEmpty = document.getElementById('command-editor-empty');
const editorStatus = document.getElementById('editor-status');
const editorFields = {
  name: document.getElementById('editor-name'),
  id: document.getElementById('editor-id'),
  world: document.getElementById('editor-world'),
  disabled: document.getElementById('editor-disabled'),
  description: document.getElementById('editor-description'),
  code: document.getElementById('editor-code'),
  helpHtmlTemplate: document.getElementById('editor-help-template'),
  helpHtmlStrings: document.getElementById('editor-help-strings'),
  optionsSpec: document.getElementById('editor-options'),
  requires: document.getElementById('editor-requires')
};
let selectedCommandRef = null;
let selectedCommand = null;

editorFields.name.label = editorNameLabel;
bundleTextarea.label = bundleLabel;
editorFields.id.label = editorIdLabel;
editorFields.world.label = editorWorldLabel;
editorFields.disabled.textContent = editorDisabledLabel;
editorFields.description.label = editorDescriptionLabel;
editorFields.code.label = editorCodeLabel;
editorFields.helpHtmlTemplate.label = editorHelpTemplateLabel;
editorFields.helpHtmlStrings.label = editorHelpStringsLabel;
editorFields.optionsSpec.label = editorOptionsLabel;
editorFields.requires.label = editorRequiresLabel;

function formatDateTime(value) {
  return new Intl.DateTimeFormat(navigator.language || 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function setStatus(container, kind, messages) {
  const lines = Array.isArray(messages) ? messages.filter(Boolean) : [messages].filter(Boolean);
  container.hidden = false;
  container.className = `bundle-status bundle-status-${kind}`;
  container.textContent = '';

  for (const line of lines) {
    const item = document.createElement('div');
    item.className = 'bundle-status-line';
    item.textContent = line;
    container.append(item);
  }
}

function setBundleStatus(kind, messages) {
  setStatus(bundleStatus, kind, messages);
}

function setEditorStatus(kind, messages) {
  setStatus(editorStatus, kind, messages);
}

function clearBundleStatus() {
  bundleStatus.hidden = true;
  bundleStatus.className = 'bundle-status';
  bundleStatus.textContent = '';
}

function clearEditorStatus() {
  editorStatus.hidden = true;
  editorStatus.className = 'bundle-status';
  editorStatus.textContent = '';
}

function formatMessage(key, fallback, substitutions) {
  const values = Array.isArray(substitutions) ? substitutions.map(String) : [String(substitutions)];
  return getMessage(key, fallback, values)
    .replace('$COUNT$', values[0])
    .replace('$COMMAND$', values[0]);
}

function formatInvalidSummaryMessage(key, fallback, count) {
  return formatMessage(key, fallback, count);
}

function formatImportCommandMessage(commandRef) {
  return formatMessage('managerImportCommandLine', 'Imported command: $COMMAND$', `${commandRef.name}@${commandRef.id}`);
}

function commandRefKey(commandRef) {
  return `${commandRef.name}@${commandRef.id}`;
}

function stringifyJson(value, fallback = '') {
  return value == null ? fallback : JSON.stringify(value, null, 2);
}

function parseOptionalJson(label, value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    throw new Error(`${label}: ${error.message}`);
  }
}

function setEditorVisible(visible) {
  editorForm.hidden = !visible;
  editorEmpty.hidden = visible;
}

function populateEditor(command) {
  selectedCommand = command;
  selectedCommandRef = { name: command.name, id: command.id };
  editorFields.name.value = command.name;
  editorFields.id.value = command.id;
  editorFields.world.value = command.world;
  editorFields.disabled.checked = Boolean(command.disabled);
  editorFields.description.value = stringifyJson(command.description, '{\n  "en-US": ""\n}');
  editorFields.code.value = command.code;
  editorFields.helpHtmlTemplate.value = command.helpHtmlTemplate || '';
  editorFields.helpHtmlStrings.value = stringifyJson(command.helpHtmlStrings);
  editorFields.optionsSpec.value = stringifyJson(command.optionsSpec);
  editorFields.requires.value = stringifyJson(command.requires);
  setEditorVisible(true);
}

async function selectCommandForEdit(commandRef) {
  clearEditorStatus();
  const command = await getCommand(commandRef.name, commandRef.id);
  if (!command) {
    setEditorVisible(false);
    throw new Error(`Command not found: ${commandRef.name}@${commandRef.id}`);
  }
  populateEditor(command);
}

function readEditedCommand() {
  if (!selectedCommand) {
    throw new Error(editorEmptyMessage);
  }

  const next = {
    ...selectedCommand,
    disabled: editorFields.disabled.checked,
    code: editorFields.code.value,
    updatedAt: Date.now()
  };

  const description = parseOptionalJson(editorDescriptionLabel, editorFields.description.value);
  if (description == null) {
    delete next.description;
  } else {
    next.description = description;
  }

  const helpHtmlTemplate = editorFields.helpHtmlTemplate.value;
  if (helpHtmlTemplate.trim()) {
    next.helpHtmlTemplate = helpHtmlTemplate;
  } else {
    delete next.helpHtmlTemplate;
  }

  const helpHtmlStrings = parseOptionalJson(editorHelpStringsLabel, editorFields.helpHtmlStrings.value);
  if (helpHtmlStrings == null) {
    delete next.helpHtmlStrings;
  } else {
    next.helpHtmlStrings = helpHtmlStrings;
  }

  const optionsSpec = parseOptionalJson(editorOptionsLabel, editorFields.optionsSpec.value);
  if (optionsSpec == null) {
    delete next.optionsSpec;
  } else {
    next.optionsSpec = optionsSpec;
  }

  const requires = parseOptionalJson(editorRequiresLabel, editorFields.requires.value);
  if (requires == null) {
    delete next.requires;
  } else {
    next.requires = requires;
  }

  return next;
}

async function saveEditedCommand() {
  clearEditorStatus();
  const saved = await saveCommand(readEditedCommand());
  populateEditor(saved);
  setEditorStatus('success', formatMessage('managerEditorSaved', editorSavedLabel, commandRefKey(saved)));
  await loadCommands();
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
    card.className = selectedCommandRef && selectedCommandRef.name === command.name && selectedCommandRef.id === command.id
      ? 'command-card command-card-selected'
      : 'command-card';

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
      const editButton = document.createElement('wa-button');
      editButton.setAttribute('variant', 'neutral');
      editButton.textContent = editCommandLabel;
      editButton.addEventListener('click', () => {
        editButton.disabled = true;
        selectCommandForEdit(command)
          .then(loadCommands)
          .catch((error) => {
            console.error('[factotum] select command failed', error);
            setBundleStatus('error', error.message || String(error));
          })
          .finally(() => {
            editButton.disabled = false;
          });
      });

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

      actions.append(editButton, toggleButton);
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
    selectedCommandRef = null;
    selectedCommand = null;
    setEditorVisible(false);
    clearEditorStatus();
    const statusLines = [`Imported ${result.importedCommands.length} command(s).`];
    for (const command of result.importedCommands) {
      statusLines.push(formatImportCommandMessage(command));
    }
    if (result.quarantinedCommands > 0) {
      statusLines.push(formatInvalidSummaryMessage('managerImportInvalidSummary', 'Quarantined $COUNT$ invalid command(s).', result.quarantinedCommands));
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
      statusLines.push(formatInvalidSummaryMessage('managerExportInvalidSummary', 'Preserved $COUNT$ invalid command(s).', bundle.invalidCommands.length));
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

editorForm.addEventListener('submit', (event) => {
  event.preventDefault();
  saveEditedCommand().catch((error) => {
    console.error('[factotum] save command failed', error);
    setEditorStatus('error', error.message || String(error));
  });
});

document.getElementById('editor-save-button').addEventListener('click', (event) => {
  event.preventDefault();
  saveEditedCommand().catch((error) => {
    console.error('[factotum] save command failed', error);
    setEditorStatus('error', error.message || String(error));
  });
});

document.getElementById('editor-reset-button').addEventListener('click', () => {
  if (!selectedCommandRef) {
    return;
  }
  selectCommandForEdit(selectedCommandRef).catch((error) => {
    console.error('[factotum] reset command editor failed', error);
    setEditorStatus('error', error.message || String(error));
  });
});

loadCommands()
  .then(() => {
    console.log('[factotum] manager UI loaded');
  })
  .catch((error) => {
    console.error('[factotum] manager UI failed', error);
  });

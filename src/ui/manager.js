import { setBasePath } from '@awesome.me/webawesome/dist/webawesome.js';
import { html as htmlLanguage } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/option/option.js';
import '@awesome.me/webawesome/dist/components/select/select.js';
import '@awesome.me/webawesome/dist/components/tab/tab.js';
import '@awesome.me/webawesome/dist/components/tab-group/tab-group.js';
import '@awesome.me/webawesome/dist/components/tab-panel/tab-panel.js';
import '@awesome.me/webawesome/dist/components/textarea/textarea.js';
import {
  exportBundle,
  getAliasMap,
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
const commandListTitle = getMessage('managerCommandsTitle', 'Installed Commands');
const commandListHint = getMessage('managerCommandsHint', 'M1 shows the stored command index and localized descriptions.');
const managerTabLabel = getMessage('managerTabManager', 'Manager');
const utilitiesTabLabel = getMessage('managerTabUtilities', 'Utilities');
const commandFilterLabel = getMessage('managerCommandFilter', 'Filter commands');
const commandSortLabel = getMessage('managerCommandSort', 'Sort commands');
const sortByModifiedLabel = getMessage('managerCommandSortModified', 'Modified time');
const sortByNameLabel = getMessage('managerCommandSortName', 'Name');
const sortByIdLabel = getMessage('managerCommandSortId', 'ID');
const sortAscendingLabel = getMessage('managerCommandSortAscending', 'Ascending');
const sortDescendingLabel = getMessage('managerCommandSortDescending', 'Descending');
const emptyMessage = getMessage('managerCommandsEmpty', 'No commands are installed.');
const noMatchesMessage = getMessage('managerCommandsNoMatches', 'No commands match the filter.');
const idLabel = getMessage('managerCommandId', 'ID');
const aliasesLabel = getMessage('managerCommandAliases', 'Aliases');
const updatedLabel = getMessage('managerCommandUpdated', 'Updated');
const enabledLabel = getMessage('managerCommandEnabled', 'Enabled');
const disabledLabel = getMessage('managerCommandDisabled', 'Disabled');
const invalidLabel = getMessage('managerCommandInvalid', 'Invalid');
const validationIssueLabel = getMessage('managerCommandValidationIssue', 'Validation issue');
const invalidDescriptionLabel = getMessage('managerCommandInvalidDescription', 'This command is quarantined and excluded from resolution, invocation, and normal export.');
const editorTitle = getMessage('managerEditorTitle', 'Command Editor');
const editorHint = getMessage('managerEditorHint', 'Edit an installed valid command. Name and ID are read-only in this first editor slice.');
const editorEmptyMessage = getMessage('managerEditorEmpty', 'Select a valid command to edit.');
const editorNameLabel = getMessage('managerEditorName', 'Name');
const editorIdLabel = getMessage('managerEditorId', 'ID');
const editorDescriptionLabel = getMessage('managerEditorDescription', 'Description JSON');
const editorCodeLabel = getMessage('managerEditorCode', 'Code');
const editorHelpTemplateLabel = getMessage('managerEditorHelpTemplate', 'Help HTML template');
const editorHelpStringsLabel = getMessage('managerEditorHelpStrings', 'Help strings JSON');
const editorOptionsLabel = getMessage('managerEditorOptions', 'Options spec JSON');
const editorRequiresLabel = getMessage('managerEditorRequires', 'Requires JSON array');
const editorSaveLabel = getMessage('managerEditorSave', 'Save Command');
const editorResetLabel = getMessage('managerEditorReset', 'Reset');
const editorSavedLabel = getMessage('managerEditorSaved', 'Saved command: $COMMAND$');
const editorUnsavedChangesLabel = getMessage('managerEditorUnsavedChanges', 'Save or reset the current command before editing another command.');
const editorIdentitySectionLabel = getMessage('managerEditorSectionIdentity', 'Identity');
const editorDescriptionSectionLabel = getMessage('managerEditorSectionDescription', 'Description');
const editorHelpSectionLabel = getMessage('managerEditorSectionHelp', 'Help');
const editorOptionsSectionLabel = getMessage('managerEditorSectionOptions', 'Options');
const editorRequiresSectionLabel = getMessage('managerEditorSectionRequires', 'Requires');
const editorCodeSectionLabel = getMessage('managerEditorSectionCode', 'Code');

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
document.getElementById('manager-tab-manager').textContent = managerTabLabel;
document.getElementById('manager-tab-utilities').textContent = utilitiesTabLabel;
document.getElementById('command-editor-title').textContent = editorTitle;
document.getElementById('command-editor-hint').textContent = editorHint;
document.getElementById('command-editor-empty').textContent = editorEmptyMessage;
document.getElementById('editor-save-button').textContent = editorSaveLabel;
document.getElementById('editor-reset-button').textContent = editorResetLabel;
document.getElementById('editor-code-label').textContent = editorCodeLabel;
document.getElementById('editor-help-template-label').textContent = editorHelpTemplateLabel;
document.getElementById('editor-section-identity-tab').textContent = editorIdentitySectionLabel;
document.getElementById('editor-section-description-tab').textContent = editorDescriptionSectionLabel;
document.getElementById('editor-section-help-tab').textContent = editorHelpSectionLabel;
document.getElementById('editor-section-options-tab').textContent = editorOptionsSectionLabel;
document.getElementById('editor-section-requires-tab').textContent = editorRequiresSectionLabel;
document.getElementById('editor-section-code-tab').textContent = editorCodeSectionLabel;

const bundleTextarea = document.getElementById('bundle-textarea');
const bundleStatus = document.getElementById('bundle-status');
const commandFilter = document.getElementById('command-filter');
const commandSort = document.getElementById('command-sort');
const commandSortDirection = document.getElementById('command-sort-direction');
const editorSaveButton = document.getElementById('editor-save-button');
const editorResetButton = document.getElementById('editor-reset-button');
const editorForm = document.getElementById('command-editor');
const editorEmpty = document.getElementById('command-editor-empty');
const editorStatus = document.getElementById('editor-status');
const editorFields = {
  name: document.getElementById('editor-name'),
  id: document.getElementById('editor-id'),
  description: document.getElementById('editor-description'),
  code: document.getElementById('editor-code'),
  helpHtmlTemplate: document.getElementById('editor-help-template'),
  helpHtmlStrings: document.getElementById('editor-help-strings'),
  optionsSpec: document.getElementById('editor-options'),
  requires: document.getElementById('editor-requires')
};
let selectedCommandRef = null;
let selectedCommand = null;
let selectedMenuCommandRef = null;
let currentCommands = [];
let currentAliases = {};
let currentPanelRefs = new Map();
let commandSortKey = 'updatedAt';
let commandSortDirectionValue = 'desc';
let editorBaseline = null;
let suppressEditorChange = false;

editorFields.name.label = editorNameLabel;
commandFilter.label = commandFilterLabel;
commandFilter.placeholder = commandFilterLabel;
commandSort.label = commandSortLabel;
bundleTextarea.label = bundleLabel;
editorFields.id.label = editorIdLabel;
editorFields.description.label = editorDescriptionLabel;
editorFields.helpHtmlStrings.label = editorHelpStringsLabel;
editorFields.optionsSpec.label = editorOptionsLabel;
editorFields.requires.label = editorRequiresLabel;

function createCodeMirrorEditor(parent, languageExtension) {
  return new EditorView({
    parent,
    state: EditorState.create({
      doc: '',
      extensions: [
        basicSetup,
        languageExtension,
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !suppressEditorChange) {
            updateEditorDirtyState();
          }
        })
      ]
    })
  });
}

const codeEditor = createCodeMirrorEditor(editorFields.code, javascript());
const helpTemplateEditor = createCodeMirrorEditor(editorFields.helpHtmlTemplate, htmlLanguage());

commandSort.append(
  buildOption('updatedAt', sortByModifiedLabel),
  buildOption('name', sortByNameLabel),
  buildOption('id', sortByIdLabel)
);
commandSort.value = commandSortKey;
updateSortDirectionButton();

function formatDateTime(value) {
  return new Intl.DateTimeFormat(navigator.language || 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function buildOption(value, label) {
  const option = document.createElement('wa-option');
  option.value = value;
  option.textContent = label;
  return option;
}

function createMaterialIcon(name) {
  const icon = document.createElement('span');
  icon.className = 'material-symbols-outlined material-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = name;
  return icon;
}

function updateSortDirectionButton() {
  const label = commandSortDirectionValue === 'asc' ? sortAscendingLabel : sortDescendingLabel;
  const iconName = commandSortDirectionValue === 'asc' ? 'arrow_upward' : 'arrow_downward';
  commandSortDirection.textContent = '';
  commandSortDirection.append(createMaterialIcon(iconName));
  commandSortDirection.setAttribute('aria-label', label);
  commandSortDirection.title = label;
}

function compareCommandValues(left, right) {
  if (commandSortKey === 'name') {
    return left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
  }
  if (commandSortKey === 'id') {
    return left.id.localeCompare(right.id) || left.name.localeCompare(right.name);
  }
  return (left.updatedAt || 0) - (right.updatedAt || 0) || left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
}

function getSortedCommands(commands) {
  const direction = commandSortDirectionValue === 'asc' ? 1 : -1;
  return [...commands].sort((left, right) => compareCommandValues(left, right) * direction);
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

function commandRefsMatch(left, right) {
  return Boolean(left && right && left.name === right.name && left.id === right.id);
}

function aliasesForCommand(command, aliases = currentAliases) {
  return Object.entries(aliases)
    .filter(([, target]) => target.name === command.name && target.id === command.id)
    .map(([alias]) => alias)
    .sort((left, right) => left.localeCompare(right));
}

function commandMatchesFilter(command, filterText) {
  const query = filterText.trim().toLowerCase();
  if (!query) {
    return true;
  }

  const aliases = aliasesForCommand(command);
  const values = [
    command.name,
    command.id,
    commandRefKey(command),
    ...aliases,
    ...aliases.map((alias) => `${alias} ${command.name}@${command.id}`)
  ];
  return values.some((value) => String(value).toLowerCase().includes(query));
}

function getCommandFilterValue() {
  const input = commandFilter.shadowRoot?.querySelector('input');
  return input?.value ?? commandFilter.value ?? '';
}

function renderFilteredCommandsFromInput() {
  selectedMenuCommandRef = null;
  renderCommands(currentCommands);
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
  if (!visible) {
    editorBaseline = null;
    updateEditorDirtyState();
  }
}

function getEditorSnapshot() {
  return {
    description: editorFields.description.value,
    code: codeEditor.state.doc.toString(),
    helpHtmlTemplate: helpTemplateEditor.state.doc.toString(),
    helpHtmlStrings: editorFields.helpHtmlStrings.value,
    optionsSpec: editorFields.optionsSpec.value,
    requires: editorFields.requires.value
  };
}

function snapshotsMatch(left, right) {
  return Boolean(left && right && Object.keys(left).every((key) => left[key] === right[key]));
}

function updateEditorDirtyState() {
  const isDirty = Boolean(editorBaseline && !snapshotsMatch(getEditorSnapshot(), editorBaseline));
  editorSaveButton.disabled = !isDirty;
  if (!isDirty && editorStatus.classList.contains('bundle-status-warning')) {
    clearEditorStatus();
  }
}

function setCodeMirrorValue(editor, value) {
  suppressEditorChange = true;
  try {
    editor.dispatch({
      changes: {
        from: 0,
        to: editor.state.doc.length,
        insert: value || ''
      }
    });
  } finally {
    suppressEditorChange = false;
  }
}

function editorHasUnsavedChanges() {
  return Boolean(editorBaseline && !snapshotsMatch(getEditorSnapshot(), editorBaseline));
}

function restoreEditedCommandSelection() {
  if (!selectedCommandRef) {
    return;
  }
  if (commandRefsMatch(selectedMenuCommandRef, selectedCommandRef)) {
    return;
  }
  selectedMenuCommandRef = { ...selectedCommandRef };
  renderCommands(currentCommands);
}

function blockCommandSelection() {
  restoreEditedCommandSelection();
  setEditorStatus('warning', editorUnsavedChangesLabel);
}

function canSelectCommand(commandRef) {
  if (commandRefsMatch(commandRef, selectedCommandRef)) {
    return true;
  }
  if (!editorHasUnsavedChanges()) {
    return true;
  }
  blockCommandSelection();
  return false;
}

function applySelectedCommand(commandRef) {
  if (!canSelectCommand(commandRef)) {
    return;
  }

  selectedMenuCommandRef = commandRef;
  selectCommandForEdit(commandRef).catch((error) => {
    console.error('[factotum] select command failed', error);
    setEditorStatus('error', error.message || String(error));
  });
}

function commandRefForTabElement(tab) {
  return tab?.panel ? currentPanelRefs.get(tab.panel) : null;
}

function guardCommandTabActivation(event) {
  const tab = event.target.closest?.('wa-tab');
  if (!tab || tab.closest('wa-tab-group') !== document.getElementById('command-list')) {
    return;
  }

  const commandRef = commandRefForTabElement(tab);
  if (!commandRef || canSelectCommand(commandRef)) {
    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();
}

function guardCommandTabKeyboard(event) {
  const guardedKeys = new Set(['Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']);
  if (!guardedKeys.has(event.key)) {
    return;
  }
  if (!editorHasUnsavedChanges()) {
    return;
  }

  const activeTab = document.getElementById('command-list').querySelector('wa-tab[active]');
  const commandRef = commandRefForTabElement(activeTab);
  if (!commandRef || commandRefsMatch(commandRef, selectedCommandRef)) {
    return;
  }

  blockCommandSelection();
  event.preventDefault();
  event.stopImmediatePropagation();
}

function populateEditor(command) {
  selectedCommand = command;
  selectedCommandRef = { name: command.name, id: command.id };
  editorFields.name.value = command.name;
  editorFields.id.value = command.id;
  editorFields.description.value = stringifyJson(command.description, '{\n  "en-US": ""\n}');
  setCodeMirrorValue(codeEditor, command.code);
  setCodeMirrorValue(helpTemplateEditor, command.helpHtmlTemplate || '');
  editorFields.helpHtmlStrings.value = stringifyJson(command.helpHtmlStrings);
  editorFields.optionsSpec.value = stringifyJson(command.optionsSpec);
  editorFields.requires.value = stringifyJson(command.requires);
  setEditorVisible(true);
  editorBaseline = getEditorSnapshot();
  updateEditorDirtyState();
}

async function selectCommandForEdit(commandRef) {
  if (!canSelectCommand(commandRef)) {
    return;
  }

  clearEditorStatus();
  if (commandRef.invalid) {
    setEditorVisible(false);
    return;
  }

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
    code: codeEditor.state.doc.toString(),
    updatedAt: Date.now()
  };

  const description = parseOptionalJson(editorDescriptionLabel, editorFields.description.value);
  if (description == null) {
    delete next.description;
  } else {
    next.description = description;
  }

  const helpHtmlTemplate = helpTemplateEditor.state.doc.toString();
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
  if (editorSaveButton.disabled) {
    return;
  }
  const saved = await saveCommand(readEditedCommand());
  populateEditor(saved);
  setEditorStatus('success', formatMessage('managerEditorSaved', editorSavedLabel, commandRefKey(saved)));
  await loadCommands();
}

async function setCommandDisabled(commandRef, disabled) {
  const command = await getCommand(commandRef.name, commandRef.id);
  if (!command) {
    throw new Error(`Command not found: ${commandRef.name}@${commandRef.id}`);
  }

  await saveCommand({
    ...command,
    disabled,
    updatedAt: Date.now()
  });
}

function buildCommandStatus(command) {
  const status = document.createElement(command.invalid ? 'span' : 'button');
  status.className = `command-status ${command.invalid ? 'command-status-invalid' : command.disabled ? 'command-status-disabled' : 'command-status-enabled'}`;
  status.textContent = command.invalid ? invalidLabel : command.disabled ? disabledLabel : enabledLabel;

  if (command.invalid) {
    return status;
  }

  status.type = 'button';
  status.addEventListener('click', () => {
    status.disabled = true;
    setCommandDisabled(command, !command.disabled)
      .then(async () => {
        if (commandRefsMatch(command, selectedCommandRef)) {
          selectedCommand = await getCommand(command.name, command.id);
        }
        await loadCommands();
      })
      .catch((error) => {
        console.error('[factotum] toggle disabled failed', error);
        setBundleStatus('error', error.message || String(error));
      })
      .finally(() => {
        status.disabled = false;
      });
  });

  return status;
}

function buildCommandDetailCard(command) {
  const card = document.createElement('article');
  card.className = 'command-card command-detail-card';

  const header = document.createElement('div');
  header.className = 'command-card-header';

  const name = document.createElement('div');
  name.className = 'command-name';
  name.textContent = command.name;

  const status = buildCommandStatus(command);

  header.append(name, status);

  const aliases = aliasesForCommand(command);
  const meta = document.createElement('div');
  meta.className = 'command-meta';

  const idMeta = document.createElement('span');
  idMeta.textContent = `${idLabel}: ${command.id}`;

  const updatedMeta = document.createElement('span');
  updatedMeta.textContent = `${updatedLabel}: ${formatDateTime(command.updatedAt)}`;

  meta.append(idMeta, updatedMeta);

  if (aliases.length > 0) {
    const aliasesMeta = document.createElement('span');
    aliasesMeta.className = 'command-aliases';
    aliasesMeta.textContent = `${aliasesLabel}: ${aliases.join(', ')}`;
    meta.append(aliasesMeta);
  }

  const description = document.createElement('div');
  description.className = 'command-description';
  description.textContent = command.invalid
    ? invalidDescriptionLabel
    : resolveLocalizedText(command.description, navigator.language || 'en-US');

  card.append(header, meta, description);

  if (command.invalid && command.validationError?.message) {
    const invalidDetail = document.createElement('div');
    invalidDetail.className = 'command-invalid-detail';
    invalidDetail.textContent = `${validationIssueLabel}: ${command.validationError.message}`;
    card.append(invalidDetail);
  }

  return card;
}

function renderCommands(commands) {
  const container = document.getElementById('command-list');
  const emptyState = document.getElementById('command-list-empty');
  const filteredCommands = getSortedCommands(commands.filter((command) => commandMatchesFilter(command, getCommandFilterValue())));

  container.active = '';
  container.textContent = '';
  if (commands.length === 0) {
    emptyState.hidden = false;
    emptyState.textContent = emptyMessage;
    container.hidden = true;
    currentPanelRefs = new Map();
    return;
  }

  if (filteredCommands.length === 0) {
    emptyState.hidden = false;
    emptyState.textContent = noMatchesMessage;
    container.hidden = true;
    currentPanelRefs = new Map();
    return;
  }

  emptyState.hidden = true;
  container.hidden = false;

  if (!filteredCommands.some((command) => commandRefsMatch(command, selectedMenuCommandRef))) {
    selectedMenuCommandRef = { name: filteredCommands[0].name, id: filteredCommands[0].id };
  }

  currentPanelRefs = new Map();
  let activePanelName = '';

  for (const [index, command] of filteredCommands.entries()) {
    const panelName = `command-${index}`;
    currentPanelRefs.set(panelName, { name: command.name, id: command.id, invalid: Boolean(command.invalid) });

    const tab = document.createElement('wa-tab');
    tab.slot = 'nav';
    tab.panel = panelName;
    tab.textContent = command.name;

    const panel = document.createElement('wa-tab-panel');
    panel.name = panelName;
    panel.append(buildCommandDetailCard(command));

    if (commandRefsMatch(command, selectedMenuCommandRef)) {
      activePanelName = panelName;
      tab.active = true;
      panel.active = true;
    }

    container.append(tab, panel);
  }

  container.active = activePanelName;
  container.updateComplete?.then(() => {
    container.active = activePanelName;
    const activeRef = currentPanelRefs.get(activePanelName);
    if (activeRef && !selectedCommandRef && !editorHasUnsavedChanges()) {
      applySelectedCommand(activeRef);
    }
  });
}

async function loadCommands() {
  const [commands, aliases] = await Promise.all([
    listCommandIndex({ includeInvalid: true }),
    getAliasMap()
  ]);
  currentCommands = commands;
  currentAliases = aliases;
  renderCommands(currentCommands);
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
    selectedMenuCommandRef = null;
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

commandFilter.updateComplete?.then(() => {
  commandFilter.shadowRoot
    ?.querySelector('input')
    ?.addEventListener('input', renderFilteredCommandsFromInput);
});
commandFilter.addEventListener('wa-clear', renderFilteredCommandsFromInput);
commandFilter.addEventListener('change', renderFilteredCommandsFromInput);

commandSort.addEventListener('change', () => {
  commandSortKey = commandSort.value || 'updatedAt';
  renderCommands(currentCommands);
});

commandSortDirection.addEventListener('click', () => {
  commandSortDirectionValue = commandSortDirectionValue === 'asc' ? 'desc' : 'asc';
  updateSortDirectionButton();
  renderCommands(currentCommands);
});

document.getElementById('command-list').addEventListener('click', guardCommandTabActivation, { capture: true });
document.getElementById('command-list').addEventListener('keydown', guardCommandTabKeyboard, { capture: true });

document.getElementById('command-list').addEventListener('wa-tab-show', (event) => {
  const commandRef = currentPanelRefs.get(event.detail.name);
  if (commandRef) {
    applySelectedCommand(commandRef);
  }
});

window.addEventListener('beforeunload', (event) => {
  if (!editorHasUnsavedChanges()) {
    return;
  }
  event.preventDefault();
  event.returnValue = '';
});

document.getElementById('editor-section-tabs').addEventListener('wa-tab-show', (event) => {
  if (event.detail.name === 'editor-section-code') {
    requestAnimationFrame(() => codeEditor.requestMeasure());
  }
  if (event.detail.name === 'editor-section-help') {
    requestAnimationFrame(() => helpTemplateEditor.requestMeasure());
  }
});

editorForm.addEventListener('submit', (event) => {
  event.preventDefault();
  saveEditedCommand().catch((error) => {
    console.error('[factotum] save command failed', error);
    setEditorStatus('error', error.message || String(error));
  });
});

Object.values(editorFields)
  .filter((field) => field !== editorFields.name && field !== editorFields.id && field !== editorFields.code && field !== editorFields.helpHtmlTemplate)
  .forEach((field) => {
    field.addEventListener('input', updateEditorDirtyState);
    field.addEventListener('change', updateEditorDirtyState);
  });

editorSaveButton.addEventListener('click', (event) => {
  event.preventDefault();
  saveEditedCommand().catch((error) => {
    console.error('[factotum] save command failed', error);
    setEditorStatus('error', error.message || String(error));
  });
});

editorResetButton.addEventListener('click', () => {
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

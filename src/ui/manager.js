import { setBasePath } from '@awesome.me/webawesome/dist/webawesome.js';
import { html as htmlLanguage } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import * as prettier from 'prettier/standalone';
import * as prettierPluginBabel from 'prettier/plugins/babel';
import * as prettierPluginEstree from 'prettier/plugins/estree';
import * as prettierPluginHtml from 'prettier/plugins/html';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/option/option.js';
import '@awesome.me/webawesome/dist/components/select/select.js';
import '@awesome.me/webawesome/dist/components/switch/switch.js';
import '@awesome.me/webawesome/dist/components/tab/tab.js';
import '@awesome.me/webawesome/dist/components/tab-group/tab-group.js';
import '@awesome.me/webawesome/dist/components/tab-panel/tab-panel.js';
import '@awesome.me/webawesome/dist/components/textarea/textarea.js';
import {
  deleteCommand,
  exportBundle,
  getAliasMap,
  getCommand,
  importBundle,
  listCommandIndex,
  resolveLocalizedText,
  saveCommand,
  setAliases
} from '../sw/storage.js';
import { validateAliasKey } from '../sw/validation.js';

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
const commandNewLabel = getMessage('managerCommandNew', 'New Command');
const sortByModifiedLabel = getMessage('managerCommandSortModified', 'Modified time');
const sortByNameLabel = getMessage('managerCommandSortName', 'Name');
const sortByIdLabel = getMessage('managerCommandSortId', 'ID');
const sortAscendingLabel = getMessage('managerCommandSortAscending', 'Ascending');
const sortDescendingLabel = getMessage('managerCommandSortDescending', 'Descending');
const emptyMessage = getMessage('managerCommandsEmpty', 'No commands are installed.');
const noMatchesMessage = getMessage('managerCommandsNoMatches', 'No commands match the filter.');
const idLabel = getMessage('managerCommandId', 'ID');
const versionLabel = getMessage('managerCommandVersion', 'Version');
const aliasesLabel = getMessage('managerCommandAliases', 'Aliases');
const updatedLabel = getMessage('managerCommandUpdated', 'Updated');
const enabledLabel = getMessage('managerCommandEnabled', 'Enabled');
const disabledLabel = getMessage('managerCommandDisabled', 'Disabled');
const commandToggleLabel = getMessage('managerCommandToggle', 'Enabled');
const invalidLabel = getMessage('managerCommandInvalid', 'Invalid');
const validationIssueLabel = getMessage('managerCommandValidationIssue', 'Validation issue');
const invalidDescriptionLabel = getMessage('managerCommandInvalidDescription', 'This command is quarantined and excluded from resolution, invocation, and normal export.');
const commandDeleteLabel = getMessage('managerCommandDelete', 'Delete command');
const commandDeleteDisableFirstLabel = getMessage('managerCommandDeleteDisableFirst', 'Disable the command before deleting it');
const editorTitle = getMessage('managerEditorTitle', 'Command Editor');
const editorHint = getMessage('managerEditorHint', 'Create a new command or edit an installed valid command. Name, ID, version, and aliases are edited in the Identity section.');
const editorEmptyMessage = getMessage('managerEditorEmpty', 'Select a valid command or create a new one.');
const editorDuplicateIdentityLabel = getMessage('managerEditorDuplicateIdentity', 'Another command already uses $COMMAND$.');
const editorNameLabel = getMessage('managerEditorName', 'Name');
const editorIdLabel = getMessage('managerEditorId', 'ID');
const editorVersionLabel = getMessage('managerEditorVersion', 'Version');
const editorDescriptionLabel = getMessage('managerEditorDescription', 'Description JSON');
const editorAliasesLabel = getMessage('managerEditorAliases', 'Aliases');
const editorCodeLabel = getMessage('managerEditorCode', 'Code');
const editorHelpTemplateLabel = getMessage('managerEditorHelpTemplate', 'Help HTML template');
const editorHelpStringsLabel = getMessage('managerEditorHelpStrings', 'Help strings JSON');
const editorOptionsLabel = getMessage('managerEditorOptions', 'Options spec JSON');
const editorRequiresLabel = getMessage('managerEditorRequires', 'Requires JSON array');
const editorSaveLabel = getMessage('managerEditorSave', 'Save Command');
const editorResetLabel = getMessage('managerEditorReset', 'Reset');
const editorSavedLabel = getMessage('managerEditorSaved', 'Saved command: $COMMAND$');
const editorDeletedLabel = getMessage('managerEditorDeleted', 'Deleted command: $COMMAND$');
const editorUnsavedChangesLabel = getMessage('managerEditorUnsavedChanges', 'Save or reset the current command before editing another command.');
const editorIdentitySectionLabel = getMessage('managerEditorSectionIdentity', 'Identity');
const editorDescriptionSectionLabel = getMessage('managerEditorSectionDescription', 'Description');
const editorHelpSectionLabel = getMessage('managerEditorSectionHelp', 'Help');
const editorOptionsSectionLabel = getMessage('managerEditorSectionOptions', 'Options');
const editorRequiresSectionLabel = getMessage('managerEditorSectionRequires', 'Requires');
const editorCodeSectionLabel = getMessage('managerEditorSectionCode', 'Code');
const editorExportSectionLabel = getMessage('managerEditorSectionExport', 'Export');
const editorCommandExportLabel = getMessage('managerEditorCommandExport', 'Command export JSON');
const editorFormatSelectionLabel = getMessage('managerEditorFormatSelection', 'Reformat selection');

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
document.getElementById('command-new-button').textContent = commandNewLabel;
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
document.getElementById('editor-section-export-tab').textContent = editorExportSectionLabel;

const bundleTextarea = document.getElementById('bundle-textarea');
const bundleStatus = document.getElementById('bundle-status');
const commandFilter = document.getElementById('command-filter');
const commandSort = document.getElementById('command-sort');
const commandSortDirection = document.getElementById('command-sort-direction');
const commandNewButton = document.getElementById('command-new-button');
const editorCodeFormatButton = document.getElementById('editor-code-format');
const editorHelpTemplateFormatButton = document.getElementById('editor-help-template-format');
const editorSaveButton = document.getElementById('editor-save-button');
const editorResetButton = document.getElementById('editor-reset-button');
const editorForm = document.getElementById('command-editor');
const editorEmpty = document.getElementById('command-editor-empty');
const editorStatus = document.getElementById('editor-status');
const editorCommandExport = document.getElementById('editor-command-export');
const editorFields = {
  name: document.getElementById('editor-name'),
  id: document.getElementById('editor-id'),
  version: document.getElementById('editor-version'),
  description: document.getElementById('editor-description'),
  aliases: document.getElementById('editor-aliases'),
  code: document.getElementById('editor-code'),
  helpHtmlTemplate: document.getElementById('editor-help-template'),
  helpHtmlStrings: document.getElementById('editor-help-strings'),
  optionsSpec: document.getElementById('editor-options'),
  requires: document.getElementById('editor-requires')
};
let selectedCommandRef = null;
let selectedCommand = null;
let selectedCommandIsDraft = false;
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
editorFields.version.label = editorVersionLabel;
editorFields.description.label = editorDescriptionLabel;
editorFields.aliases.label = editorAliasesLabel;
editorFields.helpHtmlStrings.label = editorHelpStringsLabel;
editorFields.optionsSpec.label = editorOptionsLabel;
editorFields.requires.label = editorRequiresLabel;
editorCommandExport.label = editorCommandExportLabel;

function createCodeMirrorState(doc, languageExtension) {
  return EditorState.create({
    doc: doc || '',
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
  });
}

function createCodeMirrorEditor(parent, languageExtension) {
  return new EditorView({
    parent,
    state: createCodeMirrorState('', languageExtension)
  });
}

const codeLanguage = javascript();
const helpTemplateLanguage = htmlLanguage();
const codeEditor = createCodeMirrorEditor(editorFields.code, codeLanguage);
const helpTemplateEditor = createCodeMirrorEditor(editorFields.helpHtmlTemplate, helpTemplateLanguage);

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

function setupEditorToolButton(button, label, iconName) {
  button.textContent = '';
  button.append(createMaterialIcon(iconName));
  button.setAttribute('aria-label', label);
  button.title = label;
}

setupEditorToolButton(editorCodeFormatButton, editorFormatSelectionLabel, 'code_xml');
setupEditorToolButton(editorHelpTemplateFormatButton, editorFormatSelectionLabel, 'code_xml');

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
    .filter(([, targets]) => Array.isArray(targets) && targets.some((target) => commandRefsMatch(target, command)))
    .map(([alias]) => alias)
    .sort((left, right) => left.localeCompare(right));
}

function parseEditorAliases(value) {
  const aliasNames = [];
  const seen = new Set();
  for (const token of value.split(/\s+/)) {
    const alias = token.trim();
    if (!alias || seen.has(alias)) {
      continue;
    }
    validateAliasKey(alias);
    seen.add(alias);
    aliasNames.push(alias);
  }
  return aliasNames;
}

function buildAliasMapForCommand(command, aliasNames, previousCommandRef = command) {
  const next = {};
  for (const [alias, targets] of Object.entries(currentAliases)) {
    const remainingTargets = Array.isArray(targets)
      ? targets.filter((target) => !commandRefsMatch(target, previousCommandRef) && !commandRefsMatch(target, command))
      : [];
    if (remainingTargets.length === 0) {
      continue;
    }
    next[alias] = remainingTargets;
  }

  for (const alias of aliasNames) {
    const targets = next[alias] ? [...next[alias]] : [];
    if (!targets.some((target) => commandRefsMatch(target, command))) {
      targets.push({
        name: command.name,
        id: command.id
      });
    }
    next[alias] = targets;
  }

  return next;
}

function buildAliasExportMapForCommand(command, aliasNames) {
  const aliases = {};
  for (const alias of aliasNames) {
    aliases[alias] = [{
      name: command.name,
      id: command.id
    }];
  }
  return aliases;
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

function clearSelectedCommandState() {
  selectedCommandRef = null;
  selectedCommand = null;
  selectedCommandIsDraft = false;
  selectedMenuCommandRef = null;
  setEditorVisible(false);
  clearEditorStatus();
}

function getEditorSnapshot() {
  return {
    name: editorFields.name.value,
    id: editorFields.id.value,
    version: editorFields.version.value,
    description: editorFields.description.value,
    aliases: editorFields.aliases.value,
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

function setCodeMirrorValue(editor, value, languageExtension) {
  suppressEditorChange = true;
  try {
    editor.setState(createCodeMirrorState(value, languageExtension));
  } finally {
    suppressEditorChange = false;
  }
}

function editorHasUnsavedChanges() {
  return Boolean(editorBaseline && !snapshotsMatch(getEditorSnapshot(), editorBaseline));
}

function buildCommandExportBundle(command, aliasNames) {
  return {
    bundleSchemaVersion: 1,
    exportedAt: Date.now(),
    commands: [command],
    aliases: buildAliasExportMapForCommand(command, aliasNames)
  };
}

function refreshCommandExport() {
  clearEditorStatus();
  try {
    const command = readEditedCommand();
    const aliasNames = parseEditorAliases(editorFields.aliases.value);
    editorCommandExport.value = JSON.stringify(buildCommandExportBundle(command, aliasNames), null, 2);
  } catch (error) {
    editorCommandExport.value = '';
    setEditorStatus('error', error.message || String(error));
  }
}

function focusField(field) {
  field?.focus?.({ preventScroll: true });
}

function focusCodeMirrorEditor(editor) {
  editor.requestMeasure();
  editor.focus();
}

async function formatCodeMirrorSelection(editor, prettierOptions) {
  const doc = editor.state.doc.toString();
  const range = editor.state.selection.main;
  const formatted = await prettier.format(doc, {
    ...prettierOptions,
    rangeStart: range.from,
    rangeEnd: range.to
  });
  editor.dispatch({
    changes: {
      from: 0,
      to: editor.state.doc.length,
      insert: formatted
    },
    selection: {
      anchor: Math.min(range.from, formatted.length),
      head: Math.min(range.to, formatted.length)
    }
  });
  editor.focus();
}

function focusEditorSection(sectionName) {
  requestAnimationFrame(() => {
    switch (sectionName) {
      case 'editor-section-identity':
        focusField(editorFields.name);
        break;
      case 'editor-section-description':
        focusField(editorFields.description);
        break;
      case 'editor-section-help':
        focusCodeMirrorEditor(helpTemplateEditor);
        break;
      case 'editor-section-options':
        focusField(editorFields.optionsSpec);
        break;
      case 'editor-section-requires':
        focusField(editorFields.requires);
        break;
      case 'editor-section-code':
        focusCodeMirrorEditor(codeEditor);
        break;
      case 'editor-section-export':
        refreshCommandExport();
        focusField(editorCommandExport);
        break;
      default:
        break;
    }
  });
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

function renderSelectedCommandCard(commands) {
  const selectedCardContainer = document.getElementById('command-selected-card');
  if (!selectedCardContainer) {
    return;
  }

  if (!commands.length) {
    selectedCardContainer.hidden = true;
    selectedCardContainer.textContent = '';
    return;
  }

  if (!commands.some((command) => commandRefsMatch(command, selectedMenuCommandRef))) {
    selectedMenuCommandRef = { name: commands[0].name, id: commands[0].id };
  }

  const selectedCommandCard = commands.find((command) => commandRefsMatch(command, selectedMenuCommandRef)) || commands[0];
  selectedCardContainer.hidden = false;
  selectedCardContainer.textContent = '';
  selectedCardContainer.append(buildCommandDetailCard(selectedCommandCard));
}

function applySelectedCommand(commandRef) {
  if (!canSelectCommand(commandRef)) {
    return;
  }

  selectedMenuCommandRef = commandRef;
  renderSelectedCommandCard(getSortedCommands(currentCommands.filter((command) => commandMatchesFilter(command, getCommandFilterValue()))));
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

function populateEditor(command, options = {}) {
  selectedCommand = command;
  selectedCommandRef = options.draft ? null : { name: command.name, id: command.id };
  selectedCommandIsDraft = Boolean(options.draft);
  editorFields.name.value = command.name;
  editorFields.id.value = command.id;
  editorFields.version.value = command.version || '1';
  editorFields.description.value = stringifyJson(command.description, '{\n  "en-US": ""\n}');
  editorFields.aliases.value = aliasesForCommand(command).join(' ');
  setCodeMirrorValue(codeEditor, command.code, codeLanguage);
  setCodeMirrorValue(helpTemplateEditor, command.helpHtmlTemplate || '', helpTemplateLanguage);
  editorFields.helpHtmlStrings.value = stringifyJson(command.helpHtmlStrings);
  editorFields.optionsSpec.value = stringifyJson(command.optionsSpec);
  editorFields.requires.value = stringifyJson(command.requires);
  setEditorVisible(true);
  editorBaseline = getEditorSnapshot();
  updateEditorDirtyState();
}

function createDraftCommand() {
  const now = Date.now();
  return {
    schemaVersion: 1,
    name: '',
    id: '',
    version: '1',
    world: 'user_script',
    disabled: false,
    code: 'async function main(argv, ctx) {\n}\n',
    createdAt: now,
    updatedAt: now
  };
}

function startNewCommandDraft() {
  if (editorHasUnsavedChanges()) {
    blockCommandSelection();
    return;
  }
  clearEditorStatus();
  populateEditor(createDraftCommand(), { draft: true });
  document.getElementById('editor-section-tabs').active = 'editor-section-identity';
  focusEditorSection('editor-section-identity');
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
    name: editorFields.name.value,
    id: editorFields.id.value,
    version: editorFields.version.value || '1',
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

function readEditedAliases() {
  return parseEditorAliases(editorFields.aliases.value);
}

function commandIdentityExists(name, id, originalRef = selectedCommandRef) {
  return currentCommands.some((command) => (
    command.name === name
    && command.id === id
    && !commandRefsMatch(command, originalRef)
  ));
}

async function saveEditedCommand() {
  clearEditorStatus();
  if (editorSaveButton.disabled) {
    return;
  }
  const edited = readEditedCommand();
  const originalRef = selectedCommandRef ? { ...selectedCommandRef } : null;
  if (commandIdentityExists(edited.name, edited.id, originalRef)) {
    throw new Error(formatMessage('managerEditorDuplicateIdentity', editorDuplicateIdentityLabel, commandRefKey(edited)));
  }
  const aliasNames = readEditedAliases();
  const saved = await saveCommand(edited);
  if (originalRef && !commandRefsMatch(originalRef, saved)) {
    await deleteCommand(originalRef.name, originalRef.id);
  }
  const nextAliases = buildAliasMapForCommand(saved, aliasNames, originalRef || saved);
  await setAliases(nextAliases);
  currentAliases = nextAliases;
  selectedMenuCommandRef = { name: saved.name, id: saved.id };
  populateEditor(saved);
  setEditorStatus('success', formatMessage('managerEditorSaved', editorSavedLabel, commandRefKey(saved)));
  await loadCommands();
}

async function handleDeleteCommand(commandRef) {
  clearBundleStatus();
  await deleteCommand(commandRef.name, commandRef.id);
  if (commandRefsMatch(commandRef, selectedCommandRef)) {
    clearSelectedCommandState();
  }
  await loadCommands();
  setBundleStatus('success', formatMessage('managerEditorDeleted', editorDeletedLabel, commandRefKey(commandRef)));
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

async function toggleCommandDisabled(commandRef, disabled) {
  await setCommandDisabled(commandRef, disabled);
  if (commandRefsMatch(commandRef, selectedCommandRef)) {
    selectedCommand = await getCommand(commandRef.name, commandRef.id);
  }
  await loadCommands();
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
    toggleCommandDisabled(command, !command.disabled)
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

function buildCommandToggle(command) {
  if (command.invalid) {
    return null;
  }

  const toggle = document.createElement('wa-switch');
  toggle.className = 'command-toggle';
  toggle.size = 'small';
  toggle.checked = !command.disabled;
  toggle.toggleAttribute('checked', !command.disabled);
  toggle.setAttribute('aria-label', commandToggleLabel);
  toggle.title = commandToggleLabel;
  toggle.addEventListener('change', () => {
    toggle.disabled = true;
    toggleCommandDisabled(command, !command.disabled)
      .catch((error) => {
        console.error('[factotum] toggle disabled failed', error);
        setBundleStatus('error', error.message || String(error));
      })
      .finally(() => {
        toggle.disabled = false;
      });
  });
  return toggle;
}

function buildCommandDeleteButton(command) {
  const button = document.createElement('wa-button');
  button.className = 'icon-button command-delete-button';
  button.variant = 'neutral';
  button.size = 'small';
  button.type = 'button';
  button.append(createMaterialIcon('delete'));
  const canDelete = command.invalid || command.disabled;
  const label = canDelete ? commandDeleteLabel : commandDeleteDisableFirstLabel;
  button.setAttribute('aria-label', label);
  button.title = label;
  button.disabled = !canDelete;
  if (!canDelete) {
    button.classList.add('command-delete-button-disabled');
  }
  button.addEventListener('click', () => {
    if (!canDelete) {
      return;
    }
    button.disabled = true;
    handleDeleteCommand(command)
      .catch((error) => {
        console.error('[factotum] delete command failed', error);
        setBundleStatus('error', error.message || String(error));
      })
      .finally(() => {
        button.disabled = false;
      });
  });
  return button;
}

function buildCommandDetailCard(command) {
  const card = document.createElement('article');
  card.className = 'command-card command-detail-card';
  if (command.disabled) {
    card.classList.add('command-card-disabled');
  }

  const header = document.createElement('div');
  header.className = 'command-card-header';

  const name = document.createElement('div');
  name.className = 'command-name';
  name.textContent = command.name;

  const actions = document.createElement('div');
  actions.className = 'command-card-actions';

  const status = buildCommandStatus(command);
  const toggle = buildCommandToggle(command);
  const deleteButton = buildCommandDeleteButton(command);
  if (toggle) {
    actions.append(toggle);
  }
  actions.append(status, deleteButton);

  header.append(name, actions);

  const aliases = aliasesForCommand(command);
  const meta = document.createElement('div');
  meta.className = 'command-meta';

  const idMeta = document.createElement('span');
  idMeta.textContent = `${idLabel}: ${command.id}`;

  const versionMeta = document.createElement('span');
  versionMeta.textContent = `${versionLabel}: ${command.version || '1'}`;

  const updatedMeta = document.createElement('span');
  updatedMeta.textContent = `${updatedLabel}: ${formatDateTime(command.updatedAt)}`;

  meta.append(idMeta, versionMeta, updatedMeta);

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
  const listBody = document.getElementById('command-list-body');
  const filteredCommands = getSortedCommands(commands.filter((command) => commandMatchesFilter(command, getCommandFilterValue())));

  container.active = '';
  container.textContent = '';
  if (commands.length === 0) {
    emptyState.hidden = false;
    emptyState.textContent = emptyMessage;
    listBody.hidden = true;
    renderSelectedCommandCard([]);
    container.hidden = true;
    currentPanelRefs = new Map();
    return;
  }

  if (filteredCommands.length === 0) {
    emptyState.hidden = false;
    emptyState.textContent = noMatchesMessage;
    listBody.hidden = true;
    renderSelectedCommandCard([]);
    container.hidden = true;
    currentPanelRefs = new Map();
    return;
  }

  emptyState.hidden = true;
  listBody.hidden = false;
  container.hidden = false;

  renderSelectedCommandCard(filteredCommands);

  currentPanelRefs = new Map();
  let activePanelName = '';

  for (const [index, command] of filteredCommands.entries()) {
    const panelName = `command-${index}`;
    currentPanelRefs.set(panelName, { name: command.name, id: command.id, invalid: Boolean(command.invalid) });

    const tab = document.createElement('wa-tab');
    tab.slot = 'nav';
    tab.panel = panelName;
    tab.textContent = command.name;
    if (command.disabled) {
      tab.classList.add('command-tab-disabled');
    }

    const panel = document.createElement('wa-tab-panel');
    panel.name = panelName;

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
    if (activeRef && !selectedCommandRef && !selectedCommandIsDraft && !editorHasUnsavedChanges()) {
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
    clearSelectedCommandState();
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

commandNewButton.addEventListener('click', () => {
  startNewCommandDraft();
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
  focusEditorSection(event.detail.name);
});

editorCodeFormatButton.addEventListener('mousedown', (event) => {
  event.preventDefault();
});

editorHelpTemplateFormatButton.addEventListener('mousedown', (event) => {
  event.preventDefault();
});

editorCodeFormatButton.addEventListener('click', () => {
  formatCodeMirrorSelection(codeEditor, {
    parser: 'babel',
    plugins: [prettierPluginBabel, prettierPluginEstree]
  }).catch((error) => {
    console.error('[factotum] format code failed', error);
    setEditorStatus('error', error.message || String(error));
  });
});

editorHelpTemplateFormatButton.addEventListener('click', () => {
  formatCodeMirrorSelection(helpTemplateEditor, {
    parser: 'html',
    plugins: [prettierPluginHtml]
  }).catch((error) => {
    console.error('[factotum] format help template failed', error);
    setEditorStatus('error', error.message || String(error));
  });
});

editorForm.addEventListener('submit', (event) => {
  event.preventDefault();
  saveEditedCommand().catch((error) => {
    console.error('[factotum] save command failed', error);
    setEditorStatus('error', error.message || String(error));
  });
});

Object.values(editorFields)
  .filter((field) => field !== editorFields.code && field !== editorFields.helpHtmlTemplate)
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
  if (!selectedCommandRef && !selectedCommandIsDraft) {
    return;
  }
  if (selectedCommandIsDraft) {
    clearEditorStatus();
    populateEditor(selectedCommand, { draft: true });
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

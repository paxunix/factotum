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
import * as prettierPluginPostcss from 'prettier/plugins/postcss';
import { fontAwesomeIcons } from '../generated/fontawesome-icons.js';
import { buildHelpHtml, RUNTIME_HELP_TEMPLATE_TOKENS } from '../shared/help.js';
import { formatMessage, getMessage } from '../shared/i18n.js';
import { getPreferredUiLocale } from '../shared/locale.js';
import {
  DEFAULT_BUNDLE_REVIEW_SORT_STATE,
  buildBundleReviewModel,
  buildReviewedBundle,
  commandRefKey,
  createBundleReviewRenderer
} from './bundle_review.js';
import {
  SORT_ASCENDING,
  compareCommandValues,
  filterAndSortListItems,
  getSortDirectionIconName,
  toggleSortDirection
} from './list_controls.js';
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
import { normalizeAliasMap, normalizeCommandRecord, validateAliasKey } from '../sw/validation.js';

// Ensure Web Awesome assets resolve inside the extension bundle.
setBasePath(chrome.runtime.getURL('vendor/webawesome'));

const uiLocale = getPreferredUiLocale();

const title = getMessage('managerTitle', 'Factotum');
const hint = getMessage('managerHint', '');
const bundleToolsTitle = getMessage('managerBundleToolsTitle', 'Bundle Tools');
const bundleToolsHint = getMessage('managerBundleToolsHint', 'Import or export the v1 bundle format to populate storage for manual smoke testing.');
const importBundleLabel = getMessage('managerImportBundle', 'Import Bundle');
const exportBundleLabel = getMessage('managerExportBundle', 'Export Bundle');
const bundleReviewTitleLabel = getMessage('managerBundleReviewTitle', 'Review import');
const bundleReviewHintLabel = getMessage('managerBundleReviewHint', 'Choose which commands, quarantined invalid records, and aliases to import. Items marked Overwrite will replace existing installed data.');
const bundleReviewImportLabel = getMessage('managerBundleReviewImport', 'Import selected');
const bundleReviewExportTitleLabel = getMessage('managerBundleReviewExportTitle', 'Review bundle export');
const bundleReviewExportHintLabel = getMessage('managerBundleReviewExportHint', 'Choose which commands, quarantined invalid records, and aliases to include in the exported bundle.');
const bundleReviewExportLabel = getMessage('managerBundleReviewExport', 'Export selected');
const bundleReviewCancelLabel = getMessage('managerBundleReviewCancel', 'Cancel review');
const bundleReviewCommandsLabel = getMessage('managerBundleReviewCommands', 'Commands');
const bundleReviewInvalidLabel = getMessage('managerBundleReviewInvalid', 'Quarantined invalid commands');
const bundleReviewAliasesLabel = getMessage('managerBundleReviewAliases', 'Aliases');
const bundleReviewFilterLabel = getMessage('managerBundleReviewFilter', 'Filter review items');
const bundleReviewCommandsFilterLabel = getMessage('managerBundleReviewCommandsFilter', 'Filter commands');
const bundleReviewAliasesFilterLabel = getMessage('managerBundleReviewAliasesFilter', 'Filter aliases');
const bundleReviewEmptyLabel = getMessage('managerBundleReviewEmpty', 'No review items match the filter.');
const bundleReviewSelectAllLabel = getMessage('managerBundleReviewSelectAll', 'Select all');
const bundleReviewSelectNoneLabel = getMessage('managerBundleReviewSelectNone', 'Select none');
const bundleReviewSortAliasLabel = getMessage('managerBundleReviewSortAlias', 'Alias');
const bundleReviewSortTargetsLabel = getMessage('managerBundleReviewSortTargets', 'Targets');
const bundleReviewStateNewLabel = getMessage('managerBundleReviewStateNew', 'New');
const bundleReviewStateOverwriteLabel = getMessage('managerBundleReviewStateOverwrite', 'Overwrite');
const bundleReviewStateOverwriteInvalidLabel = getMessage('managerBundleReviewStateOverwriteInvalid', 'Overwrites invalid');
const bundleReviewStateOverwriteValidLabel = getMessage('managerBundleReviewStateOverwriteValid', 'Overwrites valid');
const bundleReviewStateSameLabel = getMessage('managerBundleReviewStateSame', 'Same');
const bundleLabel = getMessage('managerBundleTextareaLabel', 'Bundle JSON');
const commandListTitle = getMessage('managerCommandsTitle', 'Installed Commands');
const commandListHint = getMessage('managerCommandsHint', 'Select a command to load it for editing');
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
const editorHint = getMessage('managerEditorHint', 'Create a new command or edit an existing command');
const editorEmptyMessage = getMessage('managerEditorEmpty', 'Select a command or create a new one.');
const editorDuplicateIdentityLabel = getMessage('managerEditorDuplicateIdentity', 'Another command already uses $COMMAND$.');
const editorNameLabel = getMessage('managerEditorName', 'Name');
const editorIdLabel = getMessage('managerEditorId', 'ID');
const editorVersionLabel = getMessage('managerEditorVersion', 'Version');
const editorDescriptionLabel = getMessage('managerEditorDescription', 'Descriptions');
const editorDescriptionAddLabel = getMessage('managerEditorDescriptionAdd', 'Add locale description');
const editorDescriptionLocaleLabel = getMessage('managerEditorDescriptionLocale', 'Locale');
const editorDescriptionLocalePlaceholder = getMessage('managerEditorDescriptionLocalePlaceholder', 'en-US');
const editorDescriptionValueLabel = getMessage('managerEditorDescriptionValue', 'Description');
const editorDescriptionDeleteLabel = getMessage('managerEditorDescriptionDelete', 'Delete locale description');
const editorDescriptionLocaleRequiredLabel = getMessage('managerEditorDescriptionLocaleRequired', 'Locale is required when description text is present.');
const editorDescriptionDuplicateLocaleLabel = getMessage('managerEditorDescriptionDuplicateLocale', 'Locale is duplicated.');
const editorAliasesLabel = getMessage('managerEditorAliases', 'Aliases');
const editorShowOverlayLabel = getMessage('managerEditorShowOverlay', 'Automatically show overlay');
const editorCodeLabel = getMessage('managerEditorCode', 'Code');
const editorHelpTemplateLabel = getMessage('managerEditorHelpTemplate', 'Help HTML template');
const editorHelpStringsLabel = getMessage('managerEditorHelpStrings', 'Help strings');
const editorHelpStringsAddLocaleLabel = getMessage('managerEditorHelpStringsAddLocale', 'Add locale block');
const editorHelpStringsLocaleLabel = getMessage('managerEditorHelpStringsLocale', 'Locale');
const editorHelpStringsLocalePlaceholder = getMessage('managerEditorHelpStringsLocalePlaceholder', 'en-US');
const editorHelpStringsDeleteLocaleLabel = getMessage('managerEditorHelpStringsDeleteLocale', 'Delete locale block');
const editorHelpStringsAddTokenLabel = getMessage('managerEditorHelpStringsAddToken', 'Add token');
const editorHelpStringsTokenLabel = getMessage('managerEditorHelpStringsToken', 'Token');
const editorHelpStringsValueLabel = getMessage('managerEditorHelpStringsValue', 'Value');
const editorHelpStringsDeleteTokenLabel = getMessage('managerEditorHelpStringsDeleteToken', 'Delete token');
const editorHelpStringsLocaleRequiredLabel = getMessage('managerEditorHelpStringsLocaleRequired', 'Locale is required when token rows are populated.');
const editorHelpStringsDuplicateLocaleLabel = getMessage('managerEditorHelpStringsDuplicateLocale', 'Locale is duplicated.');
const editorHelpStringsTokenRequiredLabel = getMessage('managerEditorHelpStringsTokenRequired', 'Token is required when a help string value is present.');
const editorHelpStringsDuplicateTokenLabel = getMessage('managerEditorHelpStringsDuplicateToken', 'Token is duplicated within this locale.');
const editorHelpTemplateUndefinedTokensLabel = getMessage('managerEditorHelpTemplateUndefinedTokens', 'Template tokens are not defined: $TOKENS$.');
const editorHelpTemplateUndefinedTokensLocaleLabel = getMessage('managerEditorHelpTemplateUndefinedTokensLocale', 'Template tokens missing for locale $LOCALE$: $TOKENS$.');
const editorHelpEditLabel = getMessage('managerEditorHelpEdit', 'Edit');
const editorHelpPreviewLabel = getMessage('managerEditorHelpPreview', 'Preview');
const editorHelpPreviewLocaleLabel = getMessage('managerEditorHelpPreviewLocale', 'Preview locale');
const editorOptionsLabel = getMessage('managerEditorOptions', 'Options');
const editorOptionsArgsLabel = getMessage('managerEditorOptionsArgs', 'Positional args');
const editorOptionsArgsPlaceholderLabel = getMessage('managerEditorOptionsArgsPlaceholder', '<input> [output]');
const editorOptionsAddLabel = getMessage('managerEditorOptionsAdd', 'Add option');
const editorOptionsFlagsLabel = getMessage('managerEditorOptionsFlags', 'Flags');
const editorOptionsFlagsPlaceholderLabel = getMessage('managerEditorOptionsFlagsPlaceholder', '-f --force');
const editorOptionsValueLabel = getMessage('managerEditorOptionsValue', 'Value');
const editorOptionsValueBooleanLabel = getMessage('managerEditorOptionsValueBoolean', 'boolean');
const editorOptionsValueStringLabel = getMessage('managerEditorOptionsValueString', 'string');
const editorOptionsValueNumberLabel = getMessage('managerEditorOptionsValueNumber', 'number');
const editorOptionsRequiredLabel = getMessage('managerEditorOptionsRequired', 'Required');
const editorOptionsDefaultLabel = getMessage('managerEditorOptionsDefault', 'Default');
const editorOptionsDefaultUnsetLabel = getMessage('managerEditorOptionsDefaultUnset', 'No default');
const editorOptionsDefaultTrueLabel = getMessage('managerEditorOptionsDefaultTrue', 'true');
const editorOptionsDefaultFalseLabel = getMessage('managerEditorOptionsDefaultFalse', 'false');
const editorOptionsDescriptionLabel = getMessage('managerEditorOptionsDescription', 'Descriptions');
const editorOptionsDescriptionAddLabel = getMessage('managerEditorOptionsDescriptionAdd', 'Add locale description');
const editorOptionsDescriptionDeleteLabel = getMessage('managerEditorOptionsDescriptionDelete', 'Delete locale description');
const editorOptionsDeleteLabel = getMessage('managerEditorOptionsDelete', 'Delete option');
const editorOptionsFlagsRequiredLabel = getMessage('managerEditorOptionsFlagsRequired', 'Flags are required when an option row is populated.');
const editorOptionsFlagInvalidLabel = getMessage('managerEditorOptionsFlagInvalid', 'Flags must start with - and cannot contain whitespace.');
const editorOptionsFlagDuplicateLabel = getMessage('managerEditorOptionsFlagDuplicate', 'Flag is duplicated.');
const editorOptionsDefaultNumberLabel = getMessage('managerEditorOptionsDefaultNumber', 'Default must be a number.');
const editorRequiresLabel = getMessage('managerEditorRequires', 'Requires');
const editorRequiresAddLabel = getMessage('managerEditorRequiresAdd', 'Add require');
const editorRequiresUrlLabel = getMessage('managerEditorRequiresUrl', 'URL');
const editorRequiresKindLabel = getMessage('managerEditorRequiresKind', 'Kind');
const editorRequiresWorldLabel = getMessage('managerEditorRequiresWorld', 'World');
const editorRequiresDeleteLabel = getMessage('managerEditorRequiresDelete', 'Delete require');
const editorRequiresKindPlaceholderLabel = getMessage('managerEditorRequiresKindPlaceholder', 'Select kind');
const editorRequiresWorldMainLabel = getMessage('managerEditorRequiresWorldMain', 'MAIN');
const editorRequiresWorldUserScriptLabel = getMessage('managerEditorRequiresWorldUserScript', 'USER_SCRIPT');
const editorRequiresUrlRequiredLabel = getMessage('managerEditorRequiresUrlRequired', 'URL is required when a require row is populated.');
const editorRequiresKindRequiredLabel = getMessage('managerEditorRequiresKindRequired', 'Kind is required when a require row is populated.');
const editorRequiresDataUrlLabel = getMessage('managerEditorRequiresDataUrl', 'data: URLs are not allowed for requires.');
const editorRequiresUserScriptModuleLabel = getMessage('managerEditorRequiresUserScriptModule', 'USER_SCRIPT world is allowed only for module requires.');
const editorSaveLabel = getMessage('managerEditorSave', 'Save Command');
const editorResetLabel = getMessage('managerEditorReset', 'Reset');
const editorSavedLabel = getMessage('managerEditorSaved', 'Saved command: $COMMAND$');
const editorDeletedLabel = getMessage('managerEditorDeleted', 'Deleted command: $COMMAND$');
const statusDismissLabel = getMessage('managerStatusDismiss', 'Dismiss status');
const editorUnsavedChangesLabel = getMessage('managerEditorUnsavedChanges', 'Save or reset the current command before editing another command.');
const editorIdentitySectionLabel = getMessage('managerEditorSectionIdentity', 'Identity');
const editorDescriptionSectionLabel = getMessage('managerEditorSectionDescription', 'Description');
const editorHelpSectionLabel = getMessage('managerEditorSectionHelp', 'Help');
const editorOptionsSectionLabel = getMessage('managerEditorSectionOptions', 'Options');
const editorRequiresSectionLabel = getMessage('managerEditorSectionRequires', 'Requires');
const editorCodeSectionLabel = getMessage('managerEditorSectionCode', 'Code');
const editorExportSectionLabel = getMessage('managerEditorSectionExport', 'Export');
const editorCommandExportLabel = getMessage('managerEditorCommandExport', 'Command export JSON');
const editorFormatSelectionJsLabel = getMessage('managerEditorFormatSelectionJs', 'Reformat selection as JavaScript');
const editorFormatSelectionHtmlLabel = getMessage('managerEditorFormatSelectionHtml', 'Reformat selection as HTML');
const editorFormatSelectionCssLabel = getMessage('managerEditorFormatSelectionCss', 'Reformat selection as CSS');

document.title = title;
document.getElementById('manager-title').textContent = title;
document.getElementById('manager-hint').textContent = hint;
document.getElementById('bundle-tools-title').textContent = bundleToolsTitle;
document.getElementById('bundle-tools-hint').textContent = bundleToolsHint;
document.getElementById('import-bundle-button').textContent = importBundleLabel;
document.getElementById('export-bundle-button').textContent = exportBundleLabel;
document.getElementById('bundle-review-cancel-button').textContent = bundleReviewCancelLabel;
document.getElementById('bundle-review-commands-title').textContent = bundleReviewCommandsLabel;
document.getElementById('bundle-review-invalid-title').textContent = bundleReviewInvalidLabel;
document.getElementById('bundle-review-aliases-title').textContent = bundleReviewAliasesLabel;
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
document.getElementById('editor-help-mode-edit-tab').textContent = editorHelpEditLabel;
document.getElementById('editor-help-mode-preview-tab').textContent = editorHelpPreviewLabel;
document.getElementById('editor-section-options-tab').textContent = editorOptionsSectionLabel;
document.getElementById('editor-options-label').textContent = editorOptionsLabel;
document.getElementById('editor-section-requires-tab').textContent = editorRequiresSectionLabel;
document.getElementById('editor-section-code-tab').textContent = editorCodeSectionLabel;
document.getElementById('editor-section-export-tab').textContent = editorExportSectionLabel;

const bundleTextarea = document.getElementById('bundle-textarea');
const bundleStatus = document.getElementById('bundle-status');
const bundleReview = document.getElementById('bundle-review');
const bundleReviewFilter = document.getElementById('bundle-review-filter');
const bundleReviewCommandsSection = document.getElementById('bundle-review-commands-section');
const bundleReviewInvalidSection = document.getElementById('bundle-review-invalid-section');
const bundleReviewAliasesSection = document.getElementById('bundle-review-aliases-section');
const bundleReviewCommandsActions = document.getElementById('bundle-review-commands-actions');
const bundleReviewAliasesActions = document.getElementById('bundle-review-aliases-actions');
const bundleReviewCommandsFilter = document.getElementById('bundle-review-commands-filter');
const bundleReviewCommandsSort = document.getElementById('bundle-review-commands-sort');
const bundleReviewCommandsSortDirection = document.getElementById('bundle-review-commands-sort-direction');
const bundleReviewAliasesFilter = document.getElementById('bundle-review-aliases-filter');
const bundleReviewAliasesSort = document.getElementById('bundle-review-aliases-sort');
const bundleReviewAliasesSortDirection = document.getElementById('bundle-review-aliases-sort-direction');
const bundleReviewCommands = document.getElementById('bundle-review-commands');
const bundleReviewInvalid = document.getElementById('bundle-review-invalid');
const bundleReviewAliases = document.getElementById('bundle-review-aliases');
const bundleReviewEmpty = document.getElementById('bundle-review-empty');
const bundleReviewImportButton = document.getElementById('bundle-review-import-button');
const bundleReviewCancelButton = document.getElementById('bundle-review-cancel-button');
const bundleReviewCommandsSelectAll = document.getElementById('bundle-review-commands-select-all');
const bundleReviewCommandsSelectNone = document.getElementById('bundle-review-commands-select-none');
const bundleReviewAliasesSelectAll = document.getElementById('bundle-review-aliases-select-all');
const bundleReviewAliasesSelectNone = document.getElementById('bundle-review-aliases-select-none');
const commandFilter = document.getElementById('command-filter');
const commandSort = document.getElementById('command-sort');
const commandSortDirection = document.getElementById('command-sort-direction');
const commandNewButton = document.getElementById('command-new-button');
const editorCodeFormatButtons = {
  js: document.getElementById('editor-code-format-js'),
  html: document.getElementById('editor-code-format-html'),
  css: document.getElementById('editor-code-format-css')
};
const editorHelpTemplateFormatButtons = {
  js: document.getElementById('editor-help-template-format-js'),
  html: document.getElementById('editor-help-template-format-html'),
  css: document.getElementById('editor-help-template-format-css')
};
const editorSaveButton = document.getElementById('editor-save-button');
const editorResetButton = document.getElementById('editor-reset-button');
const editorForm = document.getElementById('command-editor');
const editorEmpty = document.getElementById('command-editor-empty');
const editorStatus = document.getElementById('editor-status');
const helpModeTabs = document.getElementById('editor-help-mode-tabs');
const editorCommandExport = document.getElementById('editor-command-export');
const descriptionEditor = {
  label: document.getElementById('editor-description-label'),
  addButton: document.getElementById('editor-description-add'),
  rows: document.getElementById('editor-description-rows')
};
const optionsEditor = {
  addButton: document.getElementById('editor-options-add'),
  rows: document.getElementById('editor-options-rows')
};
const helpStringsEditor = {
  label: document.getElementById('editor-help-strings-label'),
  addButton: document.getElementById('editor-help-strings-add-locale'),
  blocks: document.getElementById('editor-help-strings-blocks')
};
const requiresEditor = {
  label: document.getElementById('editor-requires-label'),
  addButton: document.getElementById('editor-requires-add'),
  rows: document.getElementById('editor-requires-rows')
};
const helpPreview = {
  locale: document.getElementById('editor-help-preview-locale'),
  status: document.getElementById('editor-help-preview-status'),
  host: document.getElementById('editor-help-preview-host')
};
const editorFields = {
  name: document.getElementById('editor-name'),
  id: document.getElementById('editor-id'),
  version: document.getElementById('editor-version'),
  aliases: document.getElementById('editor-aliases'),
  showOverlay: document.getElementById('editor-show-overlay'),
  code: document.getElementById('editor-code'),
  helpHtmlTemplate: document.getElementById('editor-help-template'),
  optionsArgs: document.getElementById('editor-options-args')
};
let selectedCommandRef = null;
let selectedCommand = null;
let selectedCommandIsDraft = false;
let selectedMenuCommandRef = null;
let currentCommands = [];
let currentAliases = {};
let currentPanelRefs = new Map();
let commandSortKey = 'name';
let commandSortDirectionValue = SORT_ASCENDING;
let bundleReviewCommandsSortKey = DEFAULT_BUNDLE_REVIEW_SORT_STATE.commandsSortKey;
let bundleReviewCommandsSortDirectionValue = DEFAULT_BUNDLE_REVIEW_SORT_STATE.commandsSortDirection;
let bundleReviewAliasesSortKey = DEFAULT_BUNDLE_REVIEW_SORT_STATE.aliasesSortKey;
let bundleReviewAliasesSortDirectionValue = DEFAULT_BUNDLE_REVIEW_SORT_STATE.aliasesSortDirection;
let editorBaseline = null;
let suppressEditorChange = false;

editorFields.name.label = editorNameLabel;
commandFilter.label = commandFilterLabel;
commandFilter.placeholder = commandFilterLabel;
bundleReviewFilter.label = bundleReviewFilterLabel;
bundleReviewFilter.placeholder = bundleReviewFilterLabel;
bundleReviewCommandsFilter.label = bundleReviewCommandsFilterLabel;
bundleReviewCommandsFilter.placeholder = bundleReviewCommandsFilterLabel;
bundleReviewCommandsSort.label = commandSortLabel;
bundleReviewAliasesFilter.label = bundleReviewAliasesFilterLabel;
bundleReviewAliasesFilter.placeholder = bundleReviewAliasesFilterLabel;
bundleReviewAliasesSort.label = commandSortLabel;
bundleReviewCommandsSelectAll.textContent = bundleReviewSelectAllLabel;
bundleReviewCommandsSelectNone.textContent = bundleReviewSelectNoneLabel;
bundleReviewAliasesSelectAll.textContent = bundleReviewSelectAllLabel;
bundleReviewAliasesSelectNone.textContent = bundleReviewSelectNoneLabel;
commandSort.label = commandSortLabel;
bundleTextarea.label = bundleLabel;
editorFields.id.label = editorIdLabel;
editorFields.version.label = editorVersionLabel;
descriptionEditor.label.textContent = editorDescriptionLabel;
editorFields.aliases.label = editorAliasesLabel;
editorFields.showOverlay.textContent = editorShowOverlayLabel;
helpStringsEditor.label.textContent = editorHelpStringsLabel;
editorFields.optionsArgs.label = editorOptionsArgsLabel;
editorFields.optionsArgs.placeholder = editorOptionsArgsPlaceholderLabel;
requiresEditor.label.textContent = editorRequiresLabel;
editorCommandExport.label = editorCommandExportLabel;
helpPreview.locale.label = editorHelpPreviewLocaleLabel;
descriptionEditor.addButton.append(createIcon('plus'));
descriptionEditor.addButton.setAttribute('aria-label', editorDescriptionAddLabel);
descriptionEditor.addButton.title = editorDescriptionAddLabel;
helpStringsEditor.addButton.append(createIcon('plus'));
helpStringsEditor.addButton.setAttribute('aria-label', editorHelpStringsAddLocaleLabel);
helpStringsEditor.addButton.title = editorHelpStringsAddLocaleLabel;
optionsEditor.addButton.append(createIcon('plus'));
optionsEditor.addButton.setAttribute('aria-label', editorOptionsAddLabel);
optionsEditor.addButton.title = editorOptionsAddLabel;
requiresEditor.addButton.append(createIcon('plus'));
requiresEditor.addButton.setAttribute('aria-label', editorRequiresAddLabel);
requiresEditor.addButton.title = editorRequiresAddLabel;
helpPreview.locale.append(buildOption(uiLocale, uiLocale));
helpPreview.locale.value = uiLocale;

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
          refreshHelpPreview();
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
bundleReviewCommandsSort.append(
  buildOption('updatedAt', sortByModifiedLabel),
  buildOption('name', sortByNameLabel),
  buildOption('id', sortByIdLabel)
);
bundleReviewCommandsSort.value = bundleReviewCommandsSortKey;
bundleReviewAliasesSort.append(
  buildOption('alias', bundleReviewSortAliasLabel),
  buildOption('targets', bundleReviewSortTargetsLabel)
);
bundleReviewAliasesSort.value = bundleReviewAliasesSortKey;
updateSortDirectionButton(commandSortDirection, commandSortKey, commandSortDirectionValue);
updateSortDirectionButton(bundleReviewCommandsSortDirection, bundleReviewCommandsSortKey, bundleReviewCommandsSortDirectionValue);
updateSortDirectionButton(bundleReviewAliasesSortDirection, bundleReviewAliasesSortKey, bundleReviewAliasesSortDirectionValue);

const bundleReviewRenderer = createBundleReviewRenderer({
  document,
  nodes: {
    review: bundleReview,
    title: document.getElementById('bundle-review-title'),
    hint: document.getElementById('bundle-review-hint'),
    filter: bundleReviewFilter,
    commandsSection: bundleReviewCommandsSection,
    invalidSection: bundleReviewInvalidSection,
    aliasesSection: bundleReviewAliasesSection,
    commandsActions: bundleReviewCommandsActions,
    aliasesActions: bundleReviewAliasesActions,
    commandsFilter: bundleReviewCommandsFilter,
    aliasesFilter: bundleReviewAliasesFilter,
    commands: bundleReviewCommands,
    invalid: bundleReviewInvalid,
    aliases: bundleReviewAliases,
    empty: bundleReviewEmpty,
    actionButton: bundleReviewImportButton
  },
  labels: {
    importTitle: bundleReviewTitleLabel,
    importHint: bundleReviewHintLabel,
    importAction: bundleReviewImportLabel,
    exportTitle: bundleReviewExportTitleLabel,
    exportHint: bundleReviewExportHintLabel,
    exportAction: bundleReviewExportLabel,
    empty: bundleReviewEmptyLabel,
    states: {
      new: bundleReviewStateNewLabel,
      overwrite: bundleReviewStateOverwriteLabel,
      overwriteInvalid: bundleReviewStateOverwriteInvalidLabel,
      overwriteValid: bundleReviewStateOverwriteValidLabel,
      same: bundleReviewStateSameLabel
    }
  },
  getViewState: getBundleReviewViewState
});

const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const dateTimeFormatter = new Intl.DateTimeFormat(uiLocale, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: localTimeZone,
  timeZoneName: 'short'
});

function formatDateTime(value) {
  return dateTimeFormatter.format(new Date(value));
}

function buildOption(value, label) {
  const option = document.createElement('wa-option');
  option.value = value;
  option.textContent = label;
  return option;
}

function createIcon(name) {
  const iconData = fontAwesomeIcons[name];
  if (!iconData) {
    throw new Error(`Unknown generated icon: ${name}`);
  }
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.classList.add('button-icon');
  icon.setAttribute('aria-hidden', 'true');
  icon.setAttribute('viewBox', `0 0 ${iconData.width} ${iconData.height}`);
  icon.setAttribute('focusable', 'false');
  for (const pathData of iconData.paths) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('fill', 'currentColor');
    path.setAttribute('d', pathData);
    icon.append(path);
  }
  return icon;
}

function createIconButton({ className, iconName, label }) {
  const button = document.createElement('wa-button');
  button.className = className;
  button.variant = 'neutral';
  button.appearance = 'filled-outlined';
  button.size = 'small';
  button.type = 'button';
  button.append(createIcon(iconName));
  button.setAttribute('aria-label', label);
  button.title = label;
  return button;
}

function createRowIssue(className) {
  const issue = document.createElement('div');
  issue.className = className;
  issue.hidden = true;
  return issue;
}

function bindRowInputEvents(elements, onChange) {
  for (const element of elements) {
    element.addEventListener('input', onChange);
    element.addEventListener('change', onChange);
  }
}

function getEditableRowSnapshots(container, rowSelector, readRow) {
  return [...container.querySelectorAll(rowSelector)].map(readRow);
}

function setEditableRowIssue(row, issueSelector, message = '') {
  row.dataset.invalid = message ? 'true' : 'false';
  const issue = row.querySelector(issueSelector);
  if (issue) {
    issue.textContent = message;
    issue.hidden = !message;
  }
}

function ensureEditableRowPresence(container, addRow) {
  if (container.childElementCount === 0) {
    addRow();
  }
}

function populateEditableRows(container, rows, addRow, ensureRowsPresent, syncValidation) {
  container.replaceChildren();
  for (const row of rows) {
    addRow(row);
  }
  ensureRowsPresent();
  syncValidation();
}

function updateSortDirectionButton(button, sortKey, directionValue) {
  const label = directionValue === 'asc' ? sortAscendingLabel : sortDescendingLabel;
  button.textContent = '';
  button.append(createIcon(getSortDirectionIconName(sortKey, directionValue)));
  button.setAttribute('aria-label', label);
  button.title = label;
}

function setupEditorToolButton(button, shortLabel, label) {
  button.textContent = '';
  const content = document.createElement('span');
  content.className = 'editor-tool-button-content';
  const text = document.createElement('span');
  text.className = 'editor-tool-button-label';
  text.textContent = shortLabel;
  content.append(createIcon('code'), text);
  button.append(content);
  button.setAttribute('aria-label', label);
  button.title = label;
}

setupEditorToolButton(editorCodeFormatButtons.js, 'JS', editorFormatSelectionJsLabel);
setupEditorToolButton(editorCodeFormatButtons.html, 'HTML', editorFormatSelectionHtmlLabel);
setupEditorToolButton(editorCodeFormatButtons.css, 'CSS', editorFormatSelectionCssLabel);
setupEditorToolButton(editorHelpTemplateFormatButtons.js, 'JS', editorFormatSelectionJsLabel);
setupEditorToolButton(editorHelpTemplateFormatButtons.html, 'HTML', editorFormatSelectionHtmlLabel);
setupEditorToolButton(editorHelpTemplateFormatButtons.css, 'CSS', editorFormatSelectionCssLabel);

function setStatus(container, kind, messages) {
  const lines = Array.isArray(messages) ? messages.filter(Boolean) : [messages].filter(Boolean);
  container.hidden = false;
  container.className = `bundle-status bundle-status-${kind}`;
  container.textContent = '';

  const header = document.createElement('div');
  header.className = 'bundle-status-header';

  const linesContainer = document.createElement('div');
  linesContainer.className = 'bundle-status-lines';

  for (const line of lines) {
    const item = document.createElement('div');
    item.className = 'bundle-status-line';
    item.textContent = line;
    linesContainer.append(item);
  }

  const dismissButton = document.createElement('button');
  dismissButton.type = 'button';
  dismissButton.className = 'bundle-status-dismiss';
  dismissButton.setAttribute('aria-label', statusDismissLabel);
  dismissButton.title = statusDismissLabel;
  dismissButton.textContent = '×';
  dismissButton.addEventListener('click', () => {
    container.hidden = true;
    container.className = 'bundle-status';
    container.textContent = '';
  });

  header.append(linesContainer, dismissButton);
  container.append(header);
}

function setBundleStatus(kind, messages) {
  setStatus(bundleStatus, kind, messages);
}

function setEditorStatus(kind, messages) {
  setStatus(editorStatus, kind, messages);
}

function setHelpPreviewStatus(kind, messages) {
  setStatus(helpPreview.status, kind, messages);
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

function clearHelpPreviewStatus() {
  helpPreview.status.hidden = true;
  helpPreview.status.className = 'bundle-status';
  helpPreview.status.textContent = '';
}

function formatInvalidSummaryMessage(key, fallback, count) {
  return formatMessage(key, fallback, count);
}

function formatImportCommandMessage(commandRef) {
  return formatMessage('managerImportCommandLine', 'Imported command: $COMMAND$', `${commandRef.name}@${commandRef.id}`);
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

function getCommandFilterValues(command) {
  const aliases = aliasesForCommand(command);
  return [
    command.name,
    command.id,
    commandRefKey(command),
    ...aliases,
    ...aliases.map((alias) => `${alias} ${command.name}@${command.id}`)
  ];
}

function getVisibleCommands(commands) {
  return filterAndSortListItems(commands, {
    filterText: getCommandFilterValue(),
    getFilterValues: getCommandFilterValues,
    compareItems: (left, right) => compareCommandValues(left, right, commandSortKey),
    direction: commandSortDirectionValue
  });
}

function getCommandFilterValue() {
  const input = commandFilter.shadowRoot?.querySelector('input');
  return input?.value ?? commandFilter.value ?? '';
}

function getInputValue(control) {
  const input = control.shadowRoot?.querySelector('input');
  return input?.value ?? control.value ?? '';
}

function getBundleReviewViewState() {
  return {
    mode: bundleReviewRenderer.pendingReview?.mode || 'import',
    filter: getInputValue(bundleReviewFilter),
    commandsFilter: getInputValue(bundleReviewCommandsFilter),
    aliasesFilter: getInputValue(bundleReviewAliasesFilter),
    commandsSortKey: bundleReviewCommandsSortKey,
    commandsSortDirection: bundleReviewCommandsSortDirectionValue,
    aliasesSortKey: bundleReviewAliasesSortKey,
    aliasesSortDirection: bundleReviewAliasesSortDirectionValue
  };
}

function renderFilteredCommandsFromInput() {
  selectedMenuCommandRef = null;
  renderCommands(currentCommands);
}

function createEditableCommandRecord(command, now = Date.now()) {
  const source = command?.invalid
    ? (command.rawRecord && typeof command.rawRecord === 'object' ? command.rawRecord : {})
    : (command || {});
  return {
    schemaVersion: 1,
    name: typeof source.name === 'string' ? source.name : String(command?.name ?? source.name ?? ''),
    id: typeof source.id === 'string' ? source.id : String(command?.id ?? source.id ?? ''),
    version: source.version == null ? String(command?.version ?? '1') : String(source.version),
    world: typeof source.world === 'string' && source.world.length > 0 ? source.world : 'user_script',
    showOverlay: source.showOverlay == null ? true : Boolean(source.showOverlay),
    disabled: Boolean(source.disabled),
    code: typeof source.code === 'string' ? source.code : String(source.code ?? ''),
    createdAt: Number.isFinite(source.createdAt) ? source.createdAt : now,
    updatedAt: Number.isFinite(source.updatedAt) ? source.updatedAt : now,
    ...(source.description !== undefined ? { description: source.description } : {}),
    ...(source.helpHtmlTemplate !== undefined
      ? { helpHtmlTemplate: typeof source.helpHtmlTemplate === 'string' ? source.helpHtmlTemplate : String(source.helpHtmlTemplate ?? '') }
      : {}),
    ...(source.helpHtmlStrings !== undefined ? { helpHtmlStrings: source.helpHtmlStrings } : {}),
    ...(source.optionsSpec !== undefined ? { optionsSpec: source.optionsSpec } : {}),
    ...(source.requires !== undefined ? { requires: source.requires } : {})
  };
}

function buildLocalizedRows(value) {
  const entries = value && typeof value === 'object' && !Array.isArray(value)
    ? Object.entries(value).filter(([, text]) => typeof text === 'string')
    : [];
  if (entries.length === 0) {
    return [{ locale: '', value: '' }];
  }
  return entries.map(([locale, text]) => ({
    locale: String(locale),
    value: String(text)
  }));
}

function getDescriptionRowsSnapshot() {
  return getEditableRowSnapshots(descriptionEditor.rows, '.localized-row', (row) => ({
    locale: row.querySelector('.localized-row-locale')?.value || '',
    value: row.querySelector('.localized-row-value')?.value || ''
  }));
}

function validateDescriptionRows(rows) {
  const issues = new Map();
  const seen = new Map();

  rows.forEach((row, index) => {
    const locale = row.locale.trim();
    const hasText = row.value !== '';
    if (!locale && !hasText) {
      return;
    }
    if (!locale) {
      issues.set(index, editorDescriptionLocaleRequiredLabel);
      return;
    }
    const key = locale.toLowerCase();
    if (seen.has(key)) {
      issues.set(index, editorDescriptionDuplicateLocaleLabel);
      issues.set(seen.get(key), editorDescriptionDuplicateLocaleLabel);
      return;
    }
    seen.set(key, index);
  });

  return issues;
}

function syncDescriptionValidation() {
  const rows = getDescriptionRowsSnapshot();
  const issues = validateDescriptionRows(rows);
  [...descriptionEditor.rows.querySelectorAll('.localized-row')].forEach((row, index) => {
    setEditableRowIssue(row, '.localized-row-error', issues.get(index) || '');
  });
  return issues;
}

function ensureDescriptionRowPresence() {
  ensureEditableRowPresence(descriptionEditor.rows, () => addDescriptionRow());
}

function handleDescriptionEditorChange() {
  syncDescriptionValidation();
  updateEditorDirtyState();
}

function addDescriptionRow(initial = { locale: '', value: '' }, options = {}) {
  const row = document.createElement('div');
  row.className = 'localized-row';
  row.dataset.invalid = 'false';

  const header = document.createElement('div');
  header.className = 'localized-row-header';

  const localeField = document.createElement('div');
  localeField.className = 'localized-row-locale-field';

  const localeLabel = document.createElement('div');
  localeLabel.className = 'editor-field-label localized-row-field-label';
  localeLabel.textContent = editorDescriptionLocaleLabel;

  const localeInput = document.createElement('wa-input');
  localeInput.className = 'localized-row-locale';
  localeInput.placeholder = editorDescriptionLocalePlaceholder;
  localeInput.size = 'small';
  localeInput.value = initial.locale || '';

  const deleteButton = createIconButton({
    className: 'icon-button localized-row-delete',
    iconName: 'trash',
    label: editorDescriptionDeleteLabel
  });

  const valueInput = document.createElement('wa-textarea');
  valueInput.className = 'localized-row-value editor-textarea-small';
  valueInput.label = editorDescriptionValueLabel;
  valueInput.resize = 'auto';
  valueInput.spellcheck = false;
  valueInput.value = initial.value || '';

  const issue = createRowIssue('localized-row-error');

  const onChange = () => {
    handleDescriptionEditorChange();
  };

  bindRowInputEvents([localeInput, valueInput], onChange);
  deleteButton.addEventListener('click', () => {
    if (descriptionEditor.rows.childElementCount === 1) {
      localeInput.value = '';
      valueInput.value = '';
      handleDescriptionEditorChange();
      focusField(localeInput);
      return;
    }
    row.remove();
    ensureDescriptionRowPresence();
    handleDescriptionEditorChange();
    const nextLocale = descriptionEditor.rows.querySelector('.localized-row-locale');
    focusField(nextLocale);
  });

  localeField.append(localeLabel, localeInput);
  header.append(localeField, deleteButton);
  row.append(header, valueInput, issue);
  descriptionEditor.rows.append(row);
  syncDescriptionValidation();

  if (options.focus) {
    focusField(localeInput);
  }

  return row;
}

function populateDescriptionEditor(value) {
  populateEditableRows(
    descriptionEditor.rows,
    buildLocalizedRows(value),
    (row) => addDescriptionRow(row),
    ensureDescriptionRowPresence,
    syncDescriptionValidation
  );
}

function readEditedDescription() {
  const rows = getDescriptionRowsSnapshot();
  const issues = validateDescriptionRows(rows);
  if (issues.size > 0) {
    throw new Error(`${editorDescriptionLabel}: ${[...new Set(issues.values())].join(' ')}`);
  }

  const description = {};
  for (const row of rows) {
    const locale = row.locale.trim();
    if (!locale) {
      continue;
    }
    description[locale] = row.value;
  }

  return Object.keys(description).length > 0 ? description : undefined;
}

function buildHelpStringBlocks(value) {
  const locales = value && typeof value === 'object' && !Array.isArray(value)
    ? Object.entries(value)
        .filter(([, tokens]) => tokens && typeof tokens === 'object' && !Array.isArray(tokens))
        .map(([locale, tokens]) => ({
          locale: String(locale),
          rows: Object.entries(tokens)
            .filter(([, text]) => typeof text === 'string')
            .map(([token, text]) => ({ token: String(token), value: String(text) }))
        }))
    : [];
  if (locales.length === 0) {
    return [{ locale: '', rows: [{ token: '', value: '' }] }];
  }
  return locales.map((block) => ({
    locale: block.locale,
    rows: block.rows.length > 0 ? block.rows : [{ token: '', value: '' }]
  }));
}

function getHelpStringsBlocksSnapshot() {
  return getEditableRowSnapshots(helpStringsEditor.blocks, '.help-strings-block', (block) => ({
    locale: block.querySelector('.help-strings-block-locale')?.value || '',
    rows: getEditableRowSnapshots(block, '.help-strings-token-row', (row) => ({
      token: row.querySelector('.help-strings-token-key')?.value || '',
      value: row.querySelector('.help-strings-token-value')?.value || ''
    }))
  }));
}

function validateHelpStringsBlocks(blocks) {
  const localeIssues = new Map();
  const tokenIssues = new Map();
  const seenLocales = new Map();

  blocks.forEach((block, blockIndex) => {
    const locale = block.locale.trim();
    const hasPopulatedRows = block.rows.some((row) => row.token.trim() || row.value !== '');
    if (!locale && !hasPopulatedRows) {
      return;
    }
    if (!locale) {
      localeIssues.set(blockIndex, editorHelpStringsLocaleRequiredLabel);
      return;
    }
    const localeKey = locale.toLowerCase();
    if (seenLocales.has(localeKey)) {
      localeIssues.set(blockIndex, editorHelpStringsDuplicateLocaleLabel);
      localeIssues.set(seenLocales.get(localeKey), editorHelpStringsDuplicateLocaleLabel);
    } else {
      seenLocales.set(localeKey, blockIndex);
    }

    const seenTokens = new Map();
    block.rows.forEach((row, rowIndex) => {
      const token = row.token.trim();
      const hasValue = row.value !== '';
      if (!token && !hasValue) {
        return;
      }
      if (!token) {
        tokenIssues.set(`${blockIndex}:${rowIndex}`, editorHelpStringsTokenRequiredLabel);
        return;
      }
      const tokenKey = token.toLowerCase();
      if (seenTokens.has(tokenKey)) {
        tokenIssues.set(`${blockIndex}:${rowIndex}`, editorHelpStringsDuplicateTokenLabel);
        tokenIssues.set(`${blockIndex}:${seenTokens.get(tokenKey)}`, editorHelpStringsDuplicateTokenLabel);
      } else {
        seenTokens.set(tokenKey, rowIndex);
      }
    });
  });

  return { localeIssues, tokenIssues };
}

function syncHelpStringsValidation() {
  const blocks = getHelpStringsBlocksSnapshot();
  const { localeIssues, tokenIssues } = validateHelpStringsBlocks(blocks);
  [...helpStringsEditor.blocks.querySelectorAll('.help-strings-block')].forEach((block, blockIndex) => {
    setEditableRowIssue(block, '.help-strings-block-error', localeIssues.get(blockIndex) || '');
    [...block.querySelectorAll('.help-strings-token-row')].forEach((row, rowIndex) => {
      setEditableRowIssue(row, '.help-strings-token-error', tokenIssues.get(`${blockIndex}:${rowIndex}`) || '');
    });
  });
  return { localeIssues, tokenIssues };
}

function handleHelpStringsEditorChange() {
  syncHelpStringsValidation();
  updateEditorDirtyState();
  refreshHelpPreview();
}

function ensureHelpStringsTokenRowPresence(block) {
  const rows = block.querySelector('.help-strings-token-rows');
  ensureEditableRowPresence(rows, () => addHelpStringsTokenRow(block, { token: '', value: '' }));
}

function ensureHelpStringsBlockPresence() {
  ensureEditableRowPresence(helpStringsEditor.blocks, () => addHelpStringsBlock({ locale: '', rows: [{ token: '', value: '' }] }));
}

function addHelpStringsTokenRow(block, initial = { token: '', value: '' }, options = {}) {
  const rows = block.querySelector('.help-strings-token-rows');
  const row = document.createElement('div');
  row.className = 'help-strings-token-row';
  row.dataset.invalid = 'false';

  const grid = document.createElement('div');
  grid.className = 'help-strings-token-grid';

  const keyField = document.createElement('div');
  keyField.className = 'help-strings-token-key-field';

  const keyLabel = document.createElement('div');
  keyLabel.className = 'editor-field-label help-strings-field-label';
  keyLabel.textContent = editorHelpStringsTokenLabel;

  const keyInput = document.createElement('wa-input');
  keyInput.className = 'help-strings-token-key';
  keyInput.size = 'small';
  keyInput.value = initial.token || '';

  const valueInput = document.createElement('wa-textarea');
  valueInput.className = 'help-strings-token-value editor-textarea-small';
  valueInput.label = editorHelpStringsValueLabel;
  valueInput.resize = 'auto';
  valueInput.spellcheck = false;
  valueInput.value = initial.value || '';

  const deleteButton = createIconButton({
    className: 'icon-button help-strings-token-delete',
    iconName: 'trash',
    label: editorHelpStringsDeleteTokenLabel
  });

  const issue = createRowIssue('help-strings-token-error');

  const onChange = () => {
    handleHelpStringsEditorChange();
  };

  bindRowInputEvents([keyInput, valueInput], onChange);

  deleteButton.addEventListener('click', () => {
    if (rows.childElementCount === 1) {
      keyInput.value = '';
      valueInput.value = '';
      handleHelpStringsEditorChange();
      focusField(keyInput);
      return;
    }
    row.remove();
    ensureHelpStringsTokenRowPresence(block);
    handleHelpStringsEditorChange();
    focusField(rows.querySelector('.help-strings-token-key'));
  });

  keyField.append(keyLabel, keyInput);
  grid.append(keyField, valueInput);
  row.append(grid, deleteButton, issue);
  rows.append(row);

  if (options.focus) {
    focusField(keyInput);
  }

  return row;
}

function addHelpStringsBlock(initial = { locale: '', rows: [{ token: '', value: '' }] }, options = {}) {
  const block = document.createElement('div');
  block.className = 'help-strings-block';
  block.dataset.invalid = 'false';

  const header = document.createElement('div');
  header.className = 'help-strings-block-header';

  const localeField = document.createElement('div');
  localeField.className = 'help-strings-block-locale-field';

  const localeLabel = document.createElement('div');
  localeLabel.className = 'editor-field-label help-strings-field-label';
  localeLabel.textContent = editorHelpStringsLocaleLabel;

  const localeInput = document.createElement('wa-input');
  localeInput.className = 'help-strings-block-locale';
  localeInput.placeholder = editorHelpStringsLocalePlaceholder;
  localeInput.size = 'small';
  localeInput.value = initial.locale || '';

  const actions = document.createElement('div');
  actions.className = 'help-strings-block-actions';

  const addTokenButton = createIconButton({
    className: 'icon-button help-strings-block-add',
    iconName: 'plus',
    label: editorHelpStringsAddTokenLabel
  });

  const deleteBlockButton = createIconButton({
    className: 'icon-button help-strings-block-delete',
    iconName: 'trash',
    label: editorHelpStringsDeleteLocaleLabel
  });

  const tokenRows = document.createElement('div');
  tokenRows.className = 'help-strings-token-rows';

  const blockIssue = createRowIssue('help-strings-block-error');

  const onChange = () => {
    handleHelpStringsEditorChange();
  };

  bindRowInputEvents([localeInput], onChange);

  addTokenButton.addEventListener('click', () => {
    addHelpStringsTokenRow(block, { token: '', value: '' }, { focus: true });
    handleHelpStringsEditorChange();
  });

  deleteBlockButton.addEventListener('click', () => {
    if (helpStringsEditor.blocks.childElementCount === 1) {
      localeInput.value = '';
      tokenRows.replaceChildren();
      addHelpStringsTokenRow(block, { token: '', value: '' });
      handleHelpStringsEditorChange();
      focusField(localeInput);
      return;
    }
    block.remove();
    ensureHelpStringsBlockPresence();
    handleHelpStringsEditorChange();
    focusField(helpStringsEditor.blocks.querySelector('.help-strings-block-locale'));
  });

  localeField.append(localeLabel, localeInput);
  actions.append(addTokenButton, deleteBlockButton);
  header.append(localeField, actions);
  block.append(header, tokenRows, blockIssue);
  helpStringsEditor.blocks.append(block);

  for (const row of Array.isArray(initial.rows) && initial.rows.length > 0 ? initial.rows : [{ token: '', value: '' }]) {
    addHelpStringsTokenRow(block, row);
  }
  ensureHelpStringsTokenRowPresence(block);

  if (options.focus) {
    focusField(localeInput);
  }

  return block;
}

function populateHelpStringsEditor(value) {
  populateEditableRows(
    helpStringsEditor.blocks,
    buildHelpStringBlocks(value),
    (block) => addHelpStringsBlock(block),
    ensureHelpStringsBlockPresence,
    syncHelpStringsValidation
  );
}

function readEditedHelpStrings() {
  const blocks = getHelpStringsBlocksSnapshot();
  const { localeIssues, tokenIssues } = validateHelpStringsBlocks(blocks);
  if (localeIssues.size > 0 || tokenIssues.size > 0) {
    throw new Error(`${editorHelpStringsLabel}: ${[...new Set([...localeIssues.values(), ...tokenIssues.values()])].join(' ')}`);
  }

  const helpStrings = {};
  for (const block of blocks) {
    const locale = block.locale.trim();
    if (!locale) {
      continue;
    }
    const tokens = {};
    for (const row of block.rows) {
      const token = row.token.trim();
      if (!token) {
        continue;
      }
      tokens[token] = row.value;
    }
    if (Object.keys(tokens).length > 0) {
      helpStrings[locale] = tokens;
    }
  }
  return Object.keys(helpStrings).length > 0 ? helpStrings : undefined;
}

function getPreferredPreviewLocales(helpStrings) {
  const locales = [];
  const addLocale = (value) => {
    const locale = String(value || '').trim();
    if (!locale) {
      return;
    }
    if (locales.some((entry) => entry.toLowerCase() === locale.toLowerCase())) {
      return;
    }
    locales.push(locale);
  };

  addLocale(helpPreview.locale.value);
  addLocale(uiLocale);
  addLocale('en-US');

  if (helpStrings && typeof helpStrings === 'object' && !Array.isArray(helpStrings)) {
    Object.keys(helpStrings).forEach(addLocale);
  }

  return locales.length > 0 ? locales : ['en-US'];
}

function syncHelpPreviewLocaleOptions(helpStrings) {
  const locales = getPreferredPreviewLocales(helpStrings);
  const currentValue = helpPreview.locale.value;
  helpPreview.locale.replaceChildren();
  locales.forEach((locale) => {
    helpPreview.locale.append(buildOption(locale, locale));
  });
  helpPreview.locale.value = locales.find((locale) => locale.toLowerCase() === String(currentValue || '').toLowerCase()) || locales[0];
}

function renderHelpPreviewEntry(commandRef, html) {
  const entry = document.createElement('article');
  entry.className = 'factotum-entry';
  entry.dataset.state = 'HELP';

  const title = document.createElement('p');
  title.className = 'factotum-entry-title';
  title.textContent = commandRef || getMessage('appName', 'Factotum');

  const status = document.createElement('p');
  status.className = 'factotum-entry-status';
  status.textContent = getMessage('overlayHelp', 'Help');

  const body = document.createElement('div');
  body.className = 'factotum-entry-help';
  body.innerHTML = html;

  entry.append(title, status, body);
  return entry;
}

function readHelpPreviewDraft() {
  const helpHtmlStrings = readEditedHelpStrings();
  syncHelpPreviewLocaleOptions(helpHtmlStrings);

  const draft = {
    name: editorFields.name.value.trim(),
    id: editorFields.id.value.trim(),
    helpHtmlTemplate: helpTemplateEditor.state.doc.toString()
  };

  const description = readEditedDescription();
  if (description != null) {
    draft.description = description;
  }

  if (helpHtmlStrings != null) {
    draft.helpHtmlStrings = helpHtmlStrings;
  }

  const helpTemplateIssues = collectHelpTemplateIssues(draft.helpHtmlTemplate || '', draft.helpHtmlStrings);
  if (helpTemplateIssues.length > 0) {
    throw new Error(`${editorHelpTemplateLabel}: ${helpTemplateIssues.join(' ')}`);
  }

  const optionsSpec = readEditedOptionsSpec();
  if (optionsSpec != null) {
    draft.optionsSpec = optionsSpec;
  }

  return draft;
}

function refreshHelpPreview() {
  if (!selectedCommand) {
    helpPreview.host.textContent = '';
    clearHelpPreviewStatus();
    return;
  }

  try {
    const draft = readHelpPreviewDraft();
    const locale = helpPreview.locale.value || 'en-US';
    const html = buildHelpHtml(draft, locale);
    const title = draft.name && draft.id
      ? `${draft.name}@${draft.id}`
      : draft.name || getMessage('appName', 'Factotum');
    helpPreview.host.replaceChildren(renderHelpPreviewEntry(title, html));
    clearHelpPreviewStatus();
  } catch (error) {
    helpPreview.host.textContent = '';
    setHelpPreviewStatus('error', error.message || String(error));
  }
}

function extractHelpTemplateTokens(template) {
  return [...new Set(
    String(template || '')
      .matchAll(/{{\s*([A-Za-z0-9_-]+)\s*}}/g)
  )].map((match) => match[1]);
}

function collectHelpTemplateIssues(template, helpStrings) {
  const authorTokens = extractHelpTemplateTokens(template)
    .filter((token) => !RUNTIME_HELP_TEMPLATE_TOKENS.has(token));

  if (authorTokens.length === 0) {
    return [];
  }

  const localeEntries = helpStrings && typeof helpStrings === 'object' && !Array.isArray(helpStrings)
    ? Object.entries(helpStrings).filter(([, tokens]) => tokens && typeof tokens === 'object' && !Array.isArray(tokens))
    : [];

  if (localeEntries.length === 0) {
    return [formatMessage(
      'managerEditorHelpTemplateUndefinedTokens',
      editorHelpTemplateUndefinedTokensLabel,
      authorTokens.join(', ')
    )];
  }

  return localeEntries.flatMap(([locale, tokens]) => {
    const missing = authorTokens.filter((token) => !Object.prototype.hasOwnProperty.call(tokens, token));
    if (missing.length === 0) {
      return [];
    }
    return [formatMessage(
      'managerEditorHelpTemplateUndefinedTokensLocale',
      editorHelpTemplateUndefinedTokensLocaleLabel,
      [locale, missing.join(', ')]
    )];
  });
}

function buildOptionsSpecRows(value) {
  const options = Array.isArray(value?.options) ? value.options : [];
  if (options.length === 0) {
    return [{
      flags: '',
      value: 'boolean',
      required: false,
      defaultValue: '',
      defaultBoolean: '',
      descriptions: [{ locale: '', value: '' }]
    }];
  }

  return options.map((option) => {
    const valueType = option?.value === 'string' || option?.value === 'number' || option?.value === 'boolean'
      ? option.value
      : 'boolean';
    const hasDefault = Object.prototype.hasOwnProperty.call(option || {}, 'default');
    return {
      flags: Array.isArray(option?.flags) ? option.flags.map((flag) => String(flag)).join(' ') : '',
      value: valueType,
      required: Boolean(option?.required),
      defaultValue: hasDefault && valueType !== 'boolean' ? String(option.default) : '',
      defaultBoolean: hasDefault && valueType === 'boolean' ? String(Boolean(option.default)) : '',
      descriptions: buildLocalizedRows(option?.description)
    };
  });
}

function getOptionDescriptionRowsSnapshot(optionRow) {
  return getEditableRowSnapshots(optionRow, '.option-description-row', (row) => ({
    locale: row.querySelector('.option-description-locale')?.value || '',
    value: row.querySelector('.option-description-value')?.value || ''
  }));
}

function getOptionsRowsSnapshot() {
  return getEditableRowSnapshots(optionsEditor.rows, '.option-row', (row) => ({
    flags: row.querySelector('.option-row-flags')?.value || '',
    value: row.querySelector('.option-row-value')?.value || 'boolean',
    required: Boolean(row.querySelector('.option-row-required')?.checked),
    defaultValue: row.querySelector('.option-row-default')?.value || '',
    defaultBoolean: row.querySelector('.option-row-default-boolean')?.value || '',
    descriptions: getOptionDescriptionRowsSnapshot(row)
  }));
}

function optionDescriptionHasMeaningfulContent(row) {
  return Boolean(row.locale.trim() || row.value !== '');
}

function optionRowHasMeaningfulContent(row) {
  return Boolean(
    row.flags.trim()
    || row.value !== 'boolean'
    || row.required
    || row.defaultValue !== ''
    || row.defaultBoolean !== ''
    || row.descriptions.some(optionDescriptionHasMeaningfulContent)
  );
}

function parseOptionFlags(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean);
}

function validateOptionsRows(rows) {
  const optionIssues = new Map();
  const descriptionIssues = new Map();
  const seenFlags = new Map();

  rows.forEach((row, rowIndex) => {
    const populated = optionRowHasMeaningfulContent(row);
    if (!populated) {
      return;
    }

    const flags = parseOptionFlags(row.flags);
    if (flags.length === 0) {
      optionIssues.set(rowIndex, editorOptionsFlagsRequiredLabel);
    } else {
      for (const flag of flags) {
        if (!flag.startsWith('-')) {
          optionIssues.set(rowIndex, editorOptionsFlagInvalidLabel);
          break;
        }
        const key = flag;
        if (seenFlags.has(key)) {
          optionIssues.set(rowIndex, editorOptionsFlagDuplicateLabel);
          optionIssues.set(seenFlags.get(key), editorOptionsFlagDuplicateLabel);
        } else {
          seenFlags.set(key, rowIndex);
        }
      }
    }

    if (row.value === 'number' && row.defaultValue.trim() !== '' && !Number.isFinite(Number(row.defaultValue))) {
      optionIssues.set(rowIndex, editorOptionsDefaultNumberLabel);
    }

    const seenLocales = new Map();
    row.descriptions.forEach((description, descriptionIndex) => {
      const locale = description.locale.trim();
      const hasValue = description.value !== '';
      if (!locale && !hasValue) {
        return;
      }
      const key = `${rowIndex}:${descriptionIndex}`;
      if (!locale) {
        descriptionIssues.set(key, editorDescriptionLocaleRequiredLabel);
        return;
      }
      const localeKey = locale.toLowerCase();
      if (seenLocales.has(localeKey)) {
        descriptionIssues.set(key, editorDescriptionDuplicateLocaleLabel);
        descriptionIssues.set(`${rowIndex}:${seenLocales.get(localeKey)}`, editorDescriptionDuplicateLocaleLabel);
      } else {
        seenLocales.set(localeKey, descriptionIndex);
      }
    });
  });

  return { optionIssues, descriptionIssues };
}

function syncOptionsValidation() {
  const rows = getOptionsRowsSnapshot();
  const { optionIssues, descriptionIssues } = validateOptionsRows(rows);
  [...optionsEditor.rows.querySelectorAll('.option-row')].forEach((row, rowIndex) => {
    setEditableRowIssue(row, '.option-row-error', optionIssues.get(rowIndex) || '');
    [...row.querySelectorAll('.option-description-row')].forEach((descriptionRow, descriptionIndex) => {
      setEditableRowIssue(descriptionRow, '.option-description-error', descriptionIssues.get(`${rowIndex}:${descriptionIndex}`) || '');
    });
  });
  return { optionIssues, descriptionIssues };
}

function handleOptionsEditorChange() {
  syncOptionsValidation();
  updateEditorDirtyState();
  refreshHelpPreview();
}

function ensureOptionDescriptionRowPresence(optionRow) {
  const rows = optionRow.querySelector('.option-description-rows');
  ensureEditableRowPresence(rows, () => addOptionDescriptionRow(optionRow, { locale: '', value: '' }));
}

function ensureOptionRowPresence() {
  ensureEditableRowPresence(optionsEditor.rows, () => addOptionRow());
}

function addOptionDescriptionRow(optionRow, initial = { locale: '', value: '' }, options = {}) {
  const rows = optionRow.querySelector('.option-description-rows');
  const row = document.createElement('div');
  row.className = 'option-description-row';
  row.dataset.invalid = 'false';

  const grid = document.createElement('div');
  grid.className = 'option-description-grid';

  const localeField = document.createElement('div');
  localeField.className = 'option-description-locale-field';

  const localeLabel = document.createElement('div');
  localeLabel.className = 'editor-field-label option-description-field-label';
  localeLabel.textContent = editorDescriptionLocaleLabel;

  const localeInput = document.createElement('wa-input');
  localeInput.className = 'option-description-locale';
  localeInput.placeholder = editorDescriptionLocalePlaceholder;
  localeInput.size = 'small';
  localeInput.value = initial.locale || '';

  const valueInput = document.createElement('wa-textarea');
  valueInput.className = 'option-description-value editor-textarea-small';
  valueInput.label = editorDescriptionValueLabel;
  valueInput.resize = 'auto';
  valueInput.spellcheck = false;
  valueInput.value = initial.value || '';

  const deleteButton = createIconButton({
    className: 'icon-button option-description-delete',
    iconName: 'trash',
    label: editorOptionsDescriptionDeleteLabel
  });

  const issue = createRowIssue('option-description-error');

  const onChange = () => {
    handleOptionsEditorChange();
  };

  bindRowInputEvents([localeInput, valueInput], onChange);

  deleteButton.addEventListener('click', () => {
    if (rows.childElementCount === 1) {
      localeInput.value = '';
      valueInput.value = '';
      handleOptionsEditorChange();
      focusField(localeInput);
      return;
    }
    row.remove();
    ensureOptionDescriptionRowPresence(optionRow);
    handleOptionsEditorChange();
    focusField(rows.querySelector('.option-description-locale'));
  });

  localeField.append(localeLabel, localeInput);
  grid.append(localeField, valueInput);
  row.append(grid, deleteButton, issue);
  rows.append(row);

  if (options.focus) {
    focusField(localeInput);
  }

  return row;
}

function syncOptionDefaultControls(row) {
  const valueType = row.querySelector('.option-row-value')?.value || 'boolean';
  const textDefault = row.querySelector('.option-row-default');
  const booleanDefault = row.querySelector('.option-row-default-boolean');
  if (!textDefault || !booleanDefault) {
    return;
  }
  const isBoolean = valueType === 'boolean';
  textDefault.hidden = isBoolean;
  booleanDefault.hidden = !isBoolean;
  textDefault.type = valueType === 'number' ? 'number' : 'text';
}

function handleOptionValueTypeChange(row) {
  const valueType = row.querySelector('.option-row-value')?.value || 'boolean';
  const textDefault = row.querySelector('.option-row-default');
  const booleanDefault = row.querySelector('.option-row-default-boolean');
  if (valueType === 'boolean') {
    textDefault.value = '';
  } else {
    booleanDefault.value = '';
  }
  syncOptionDefaultControls(row);
  handleOptionsEditorChange();
}

function addOptionRow(initial = {
  flags: '',
  value: 'boolean',
  required: false,
  defaultValue: '',
  defaultBoolean: '',
  descriptions: [{ locale: '', value: '' }]
}, options = {}) {
  const row = document.createElement('div');
  row.className = 'option-row';
  row.dataset.invalid = 'false';

  const grid = document.createElement('div');
  grid.className = 'option-row-grid';

  const flagsInput = document.createElement('wa-input');
  flagsInput.className = 'option-row-flags';
  flagsInput.label = editorOptionsFlagsLabel;
  flagsInput.placeholder = editorOptionsFlagsPlaceholderLabel;
  flagsInput.value = initial.flags || '';

  const valueSelect = document.createElement('wa-select');
  valueSelect.className = 'option-row-value';
  valueSelect.label = editorOptionsValueLabel;
  valueSelect.size = 'small';
  valueSelect.append(
    buildOption('boolean', editorOptionsValueBooleanLabel),
    buildOption('string', editorOptionsValueStringLabel),
    buildOption('number', editorOptionsValueNumberLabel)
  );
  valueSelect.value = initial.value || 'boolean';

  const defaultInput = document.createElement('wa-input');
  defaultInput.className = 'option-row-default';
  defaultInput.label = editorOptionsDefaultLabel;
  defaultInput.value = initial.defaultValue || '';

  const defaultBooleanSelect = document.createElement('wa-select');
  defaultBooleanSelect.className = 'option-row-default-boolean';
  defaultBooleanSelect.label = editorOptionsDefaultLabel;
  defaultBooleanSelect.size = 'small';
  defaultBooleanSelect.append(
    buildOption('', editorOptionsDefaultUnsetLabel),
    buildOption('true', editorOptionsDefaultTrueLabel),
    buildOption('false', editorOptionsDefaultFalseLabel)
  );
  defaultBooleanSelect.value = initial.defaultBoolean || '';

  const requiredSwitch = document.createElement('wa-switch');
  requiredSwitch.className = 'option-row-required';
  requiredSwitch.size = 'small';
  requiredSwitch.textContent = editorOptionsRequiredLabel;
  requiredSwitch.checked = Boolean(initial.required);

  const deleteButton = createIconButton({
    className: 'icon-button option-row-delete',
    iconName: 'trash',
    label: editorOptionsDeleteLabel
  });

  const descriptionGroup = document.createElement('div');
  descriptionGroup.className = 'option-description-editor';

  const descriptionHeader = document.createElement('div');
  descriptionHeader.className = 'option-description-header';

  const descriptionLabel = document.createElement('div');
  descriptionLabel.className = 'editor-field-label';
  descriptionLabel.textContent = editorOptionsDescriptionLabel;

  const addDescriptionButton = createIconButton({
    className: 'icon-button option-description-add',
    iconName: 'plus',
    label: editorOptionsDescriptionAddLabel
  });

  const descriptionRows = document.createElement('div');
  descriptionRows.className = 'option-description-rows';

  const issue = createRowIssue('option-row-error');

  const onChange = () => {
    handleOptionsEditorChange();
  };

  bindRowInputEvents([flagsInput, defaultInput, defaultBooleanSelect, requiredSwitch], onChange);
  valueSelect.addEventListener('input', () => {
    handleOptionValueTypeChange(row);
  });
  valueSelect.addEventListener('change', () => {
    handleOptionValueTypeChange(row);
  });

  addDescriptionButton.addEventListener('click', () => {
    addOptionDescriptionRow(row, { locale: '', value: '' }, { focus: true });
    handleOptionsEditorChange();
  });

  deleteButton.addEventListener('click', () => {
    if (optionsEditor.rows.childElementCount === 1) {
      flagsInput.value = '';
      valueSelect.value = 'boolean';
      defaultInput.value = '';
      defaultBooleanSelect.value = '';
      requiredSwitch.checked = false;
      descriptionRows.replaceChildren();
      addOptionDescriptionRow(row, { locale: '', value: '' });
      syncOptionDefaultControls(row);
      handleOptionsEditorChange();
      focusField(flagsInput);
      return;
    }
    row.remove();
    ensureOptionRowPresence();
    handleOptionsEditorChange();
    focusField(optionsEditor.rows.querySelector('.option-row-flags'));
  });

  grid.append(flagsInput, valueSelect, defaultInput, defaultBooleanSelect, requiredSwitch);
  descriptionHeader.append(descriptionLabel, addDescriptionButton);
  descriptionGroup.append(descriptionHeader, descriptionRows);
  row.append(grid, deleteButton, descriptionGroup, issue);
  optionsEditor.rows.append(row);

  for (const description of Array.isArray(initial.descriptions) && initial.descriptions.length > 0
    ? initial.descriptions
    : [{ locale: '', value: '' }]) {
    addOptionDescriptionRow(row, description);
  }
  ensureOptionDescriptionRowPresence(row);
  syncOptionDefaultControls(row);
  syncOptionsValidation();

  if (options.focus) {
    focusField(flagsInput);
  }

  return row;
}

function populateOptionsEditor(value) {
  editorFields.optionsArgs.value = value?.args != null ? String(value.args) : '';
  populateEditableRows(
    optionsEditor.rows,
    buildOptionsSpecRows(value),
    (row) => addOptionRow(row),
    ensureOptionRowPresence,
    syncOptionsValidation
  );
}

function readEditedOptionsSpec() {
  const { optionIssues, descriptionIssues } = syncOptionsValidation();
  const rows = getOptionsRowsSnapshot();
  if (optionIssues.size > 0 || descriptionIssues.size > 0) {
    throw new Error(`${editorOptionsLabel}: ${[...new Set([...optionIssues.values(), ...descriptionIssues.values()])].join(' ')}`);
  }

  const optionsSpec = {};
  const args = editorFields.optionsArgs.value.trim();
  if (args) {
    optionsSpec.args = args;
  }

  const options = rows
    .filter(optionRowHasMeaningfulContent)
    .map((row) => {
      const option = {
        flags: parseOptionFlags(row.flags)
      };
      if (row.value && row.value !== 'boolean') {
        option.value = row.value;
      }
      if (row.required) {
        option.required = true;
      }
      if (row.value === 'boolean' && row.defaultBoolean !== '') {
        option.default = row.defaultBoolean === 'true';
      } else if (row.value === 'number' && row.defaultValue.trim() !== '') {
        option.default = Number(row.defaultValue);
      } else if (row.value === 'string' && row.defaultValue !== '') {
        option.default = row.defaultValue;
      }

      const description = {};
      for (const descriptionRow of row.descriptions) {
        const locale = descriptionRow.locale.trim();
        if (!locale) {
          continue;
        }
        description[locale] = descriptionRow.value;
      }
      if (Object.keys(description).length > 0) {
        option.description = description;
      }

      return option;
    });

  if (options.length > 0) {
    optionsSpec.options = options;
  }

  return Object.keys(optionsSpec).length > 0 ? optionsSpec : undefined;
}

function buildRequireRows(value) {
  const entries = Array.isArray(value) ? value : [];
  if (entries.length === 0) {
    return [{ url: '', kind: '', world: 'main' }];
  }
  return entries.map((entry) => ({
    url: typeof entry?.url === 'string' ? entry.url : '',
    kind: typeof entry?.kind === 'string' ? entry.kind : '',
    world: typeof entry?.world === 'string' && entry.world ? entry.world : 'main'
  }));
}

function getRequiresRowsSnapshot() {
  return getEditableRowSnapshots(requiresEditor.rows, '.require-row', (row) => ({
    url: row.querySelector('.require-row-url')?.value || '',
    kind: row.querySelector('.require-row-kind')?.value || '',
    world: row.querySelector('.require-row-world')?.value || ''
  }));
}

function requireRowHasMeaningfulContent(row) {
  const url = row.url.trim();
  const kind = row.kind.trim();
  const world = row.world.trim();
  return Boolean(url || kind || (world && world !== 'main'));
}

function validateRequireRows(rows) {
  const issues = new Map();
  rows.forEach((row, index) => {
    const url = row.url.trim();
    const kind = row.kind.trim();
    const world = row.world.trim();
    const populated = requireRowHasMeaningfulContent(row);
    if (!populated) {
      return;
    }
    if (!url) {
      issues.set(index, editorRequiresUrlRequiredLabel);
      return;
    }
    if (/^data:/i.test(url)) {
      issues.set(index, editorRequiresDataUrlLabel);
      return;
    }
    if (!kind) {
      issues.set(index, editorRequiresKindRequiredLabel);
      return;
    }
    if (world === 'user_script' && kind !== 'module') {
      issues.set(index, editorRequiresUserScriptModuleLabel);
    }
  });
  return issues;
}

function syncRequiresValidation() {
  const rows = getRequiresRowsSnapshot();
  const issues = validateRequireRows(rows);
  [...requiresEditor.rows.querySelectorAll('.require-row')].forEach((row, index) => {
    setEditableRowIssue(row, '.require-row-error', issues.get(index) || '');
  });
  return issues;
}

function ensureRequireRowPresence() {
  ensureEditableRowPresence(requiresEditor.rows, () => addRequireRow());
}

function handleRequiresEditorChange() {
  syncRequiresValidation();
  updateEditorDirtyState();
}

function addRequireRow(initial = { url: '', kind: '', world: '' }, options = {}) {
  const row = document.createElement('div');
  row.className = 'require-row';
  row.dataset.invalid = 'false';

  const grid = document.createElement('div');
  grid.className = 'require-row-grid';

  const urlInput = document.createElement('wa-input');
  urlInput.className = 'require-row-url';
  urlInput.label = editorRequiresUrlLabel;
  urlInput.value = initial.url || '';

  const kindSelect = document.createElement('wa-select');
  kindSelect.className = 'require-row-kind';
  kindSelect.label = editorRequiresKindLabel;
  kindSelect.placeholder = editorRequiresKindPlaceholderLabel;
  kindSelect.size = 'small';
  kindSelect.append(
    buildOption('script', 'script'),
    buildOption('module', 'module')
  );
  kindSelect.value = initial.kind || '';

  const worldSelect = document.createElement('wa-select');
  worldSelect.className = 'require-row-world';
  worldSelect.label = editorRequiresWorldLabel;
  worldSelect.size = 'small';
  worldSelect.append(
    buildOption('main', editorRequiresWorldMainLabel),
    buildOption('user_script', editorRequiresWorldUserScriptLabel)
  );
  worldSelect.value = initial.world || 'main';

  const deleteButton = createIconButton({
    className: 'icon-button require-row-delete',
    iconName: 'trash',
    label: editorRequiresDeleteLabel
  });

  const issue = createRowIssue('require-row-error');

  const onChange = () => {
    handleRequiresEditorChange();
  };

  bindRowInputEvents([urlInput, kindSelect, worldSelect], onChange);

  deleteButton.addEventListener('click', () => {
    if (requiresEditor.rows.childElementCount === 1) {
      urlInput.value = '';
      kindSelect.value = '';
      worldSelect.value = 'main';
      handleRequiresEditorChange();
      focusField(urlInput);
      return;
    }
    row.remove();
    ensureRequireRowPresence();
    handleRequiresEditorChange();
    focusField(requiresEditor.rows.querySelector('.require-row-url'));
  });

  grid.append(urlInput, kindSelect, worldSelect);
  row.append(grid, deleteButton, issue);
  requiresEditor.rows.append(row);
  syncRequiresValidation();

  if (options.focus) {
    focusField(urlInput);
  }

  return row;
}

function populateRequiresEditor(value) {
  populateEditableRows(
    requiresEditor.rows,
    buildRequireRows(value),
    (row) => addRequireRow(row),
    ensureRequireRowPresence,
    syncRequiresValidation
  );
}

function readEditedRequires() {
  const rows = getRequiresRowsSnapshot();
  const issues = validateRequireRows(rows);
  if (issues.size > 0) {
    throw new Error(`${editorRequiresLabel}: ${[...new Set(issues.values())].join(' ')}`);
  }

  const requires = rows
    .map((row) => ({
      url: row.url.trim(),
      kind: row.kind.trim(),
      world: row.world.trim()
    }))
    .filter((row) => requireRowHasMeaningfulContent(row))
    .map((row) => ({
      url: row.url,
      kind: row.kind,
      world: row.world || 'main'
    }));

  return requires.length > 0 ? requires : undefined;
}

function setEditorVisible(visible) {
  editorForm.hidden = !visible;
  editorEmpty.hidden = visible;
  if (!visible) {
    editorBaseline = null;
    helpPreview.host.textContent = '';
    clearHelpPreviewStatus();
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
    description: JSON.stringify(getDescriptionRowsSnapshot()),
    aliases: editorFields.aliases.value,
    showOverlay: editorFields.showOverlay.checked,
    code: codeEditor.state.doc.toString(),
    helpHtmlTemplate: helpTemplateEditor.state.doc.toString(),
    helpHtmlStrings: JSON.stringify(getHelpStringsBlocksSnapshot()),
    optionsArgs: editorFields.optionsArgs.value,
    options: JSON.stringify(getOptionsRowsSnapshot()),
    requires: JSON.stringify(getRequiresRowsSnapshot())
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

function refreshCommandExport() {
  clearEditorStatus();
  try {
    const command = readEditedCommand();
    editorCommandExport.value = JSON.stringify(command, null, 2);
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
  const hasSelection = range.from !== range.to;
  const source = hasSelection ? doc.slice(range.from, range.to) : doc;
  const formatted = await prettier.format(source, prettierOptions);
  editor.dispatch({
    changes: {
      from: hasSelection ? range.from : 0,
      to: hasSelection ? range.to : editor.state.doc.length,
      insert: formatted
    },
    selection: {
      anchor: hasSelection ? range.from : 0,
      head: (hasSelection ? range.from : 0) + formatted.length
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
        focusField(descriptionEditor.rows.querySelector('.localized-row-locale'));
        break;
      case 'editor-section-help':
        if (helpStringsEditor.blocks.querySelector('.help-strings-block-locale')) {
          focusField(helpStringsEditor.blocks.querySelector('.help-strings-block-locale'));
        } else {
          focusCodeMirrorEditor(helpTemplateEditor);
        }
        break;
      case 'editor-section-options':
        focusField(editorFields.optionsArgs);
        break;
      case 'editor-section-requires':
        focusField(requiresEditor.rows.querySelector('.require-row-url'));
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
  renderSelectedCommandCard(getVisibleCommands(currentCommands));
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
  populateDescriptionEditor(command.description);
  editorFields.aliases.value = aliasesForCommand(command).join(' ');
  editorFields.showOverlay.checked = command.showOverlay !== false;
  setCodeMirrorValue(codeEditor, command.code, codeLanguage);
  setCodeMirrorValue(helpTemplateEditor, command.helpHtmlTemplate || '', helpTemplateLanguage);
  populateHelpStringsEditor(command.helpHtmlStrings);
  populateOptionsEditor(command.optionsSpec);
  populateRequiresEditor(command.requires);
  setEditorVisible(true);
  editorBaseline = getEditorSnapshot();
  updateEditorDirtyState();
  refreshHelpPreview();
}

function createDraftCommand() {
  const now = Date.now();
  return {
    schemaVersion: 1,
    name: '',
    id: '',
    version: '1',
    world: 'user_script',
    showOverlay: true,
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
  const command = await getCommand(commandRef.name, commandRef.id, { allowInvalid: Boolean(commandRef.invalid) });
  if (!command) {
    setEditorVisible(false);
    throw new Error(`Command not found: ${commandRef.name}@${commandRef.id}`);
  }
  populateEditor(createEditableCommandRecord(command));
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
    showOverlay: editorFields.showOverlay.checked,
    code: codeEditor.state.doc.toString(),
    updatedAt: Date.now()
  };

  const description = readEditedDescription();
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

  const helpHtmlStrings = readEditedHelpStrings();
  if (helpHtmlStrings == null) {
    delete next.helpHtmlStrings;
  } else {
    next.helpHtmlStrings = helpHtmlStrings;
  }

  const helpTemplateIssues = collectHelpTemplateIssues(next.helpHtmlTemplate || '', next.helpHtmlStrings);
  if (helpTemplateIssues.length > 0) {
    throw new Error(`${editorHelpTemplateLabel}: ${helpTemplateIssues.join(' ')}`);
  }

  const optionsSpec = readEditedOptionsSpec();
  if (optionsSpec == null) {
    delete next.optionsSpec;
  } else {
    next.optionsSpec = optionsSpec;
  }

  const requires = readEditedRequires();
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
  button.append(createIcon('trash'));
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
  if (command.disabled && !command.invalid) {
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
    : resolveLocalizedText(command.description, uiLocale);

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
  const filteredCommands = getVisibleCommands(commands);

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
    if (command.disabled && !command.invalid) {
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

function looksLikeBundleImport(value) {
  return Boolean(value && typeof value === 'object' && value.bundleSchemaVersion != null);
}

function looksLikeCommandImport(value) {
  return Boolean(
    value
    && typeof value === 'object'
    && !Array.isArray(value)
    && typeof value.name === 'string'
    && typeof value.id === 'string'
    && typeof value.world === 'string'
    && typeof value.code === 'string'
  );
}

async function buildBundleReview(bundle) {
  const [installedIndex, installedAliases] = await Promise.all([
    listCommandIndex({ includeInvalid: true }),
    getAliasMap()
  ]);
  const installedEntries = await Promise.all(installedIndex.map(async (entry) => {
    const record = await getCommand(entry.name, entry.id, { allowInvalid: Boolean(entry.invalid) });
    return {
      key: `${entry.name}@${entry.id}`,
      invalid: Boolean(entry.invalid),
      record: entry.invalid ? null : record,
      rawRecord: entry.invalid ? record?.rawRecord || null : null
    };
  }));
  return buildBundleReviewModel({
    bundle,
    installedEntries,
    installedAliases,
    normalizeAliasMap,
    normalizeCommandRecord,
    resolveDescription: (description) => resolveLocalizedText(description, uiLocale),
    invalidDescription: invalidDescriptionLabel
  });
}

async function executeBundleReviewImport() {
  if (!bundleReviewRenderer.pendingReview) {
    return;
  }

  const reviewedBundle = buildReviewedBundle(bundleReviewRenderer.pendingReview);
  const selectedAliasCount = Object.keys(reviewedBundle.aliases || {}).length;
  const selectedInvalidCount = Array.isArray(reviewedBundle.invalidCommands) ? reviewedBundle.invalidCommands.length : 0;
  const result = await importBundle(reviewedBundle, { aliasMode: 'overwrite' });
  bundleReviewRenderer.hide();
  clearSelectedCommandState();
  const statusLines = [
    `Imported ${result.importedCommands.length} command(s).`,
    `Imported ${selectedAliasCount} alias(es).`,
    `Imported ${selectedInvalidCount} quarantined invalid command(s).`
  ];
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
}

function setExportStatusFromBundle(bundle) {
  const aliasCount = Object.keys(bundle.aliases || {}).length;
  const invalidCount = Array.isArray(bundle.invalidCommands) ? bundle.invalidCommands.length : 0;
  bundleTextarea.value = JSON.stringify(bundle, null, 2);
  const statusLines = [
    `Exported ${bundle.commands.length} command(s).`,
    `Exported ${aliasCount} alias(es).`
  ];
  if (invalidCount > 0) {
    statusLines.push(formatInvalidSummaryMessage('managerExportInvalidSummary', 'Preserved $COUNT$ invalid command(s).', invalidCount));
  }
  setBundleStatus('success', statusLines);
}

async function executeBundleReviewExport() {
  if (!bundleReviewRenderer.pendingReview) {
    return;
  }
  const reviewedBundle = buildReviewedBundle(bundleReviewRenderer.pendingReview);
  bundleReviewRenderer.hide();
  setExportStatusFromBundle(reviewedBundle);
}

async function handleImportBundle() {
  clearBundleStatus();
  bundleReviewRenderer.hide();

  let parsed;
  try {
    parsed = JSON.parse(bundleTextarea.value);
  } catch (error) {
    setBundleStatus('error', error.message || 'Invalid JSON');
    return;
  }

  try {
    if (looksLikeBundleImport(parsed)) {
      bundleReviewRenderer.show(await buildBundleReview(parsed));
      return;
    }

    if (looksLikeCommandImport(parsed)) {
      const normalized = normalizeCommandRecord(parsed);
      bundleReviewRenderer.show(await buildBundleReview({
        bundleSchemaVersion: 1,
        exportedAt: Date.now(),
        commands: [normalized],
        aliases: {}
      }));
      return;
    }

    throw new Error('Import JSON must be a bundle or a single command record');
  } catch (error) {
    setBundleStatus('error', error.message || String(error));
  }
}

async function handleExportBundle() {
  clearBundleStatus();
  bundleReviewRenderer.hide();
  try {
    const bundle = await exportBundle();
    const review = await buildBundleReview(bundle);
    review.mode = 'export';
    const hasReviewItems = review.commands.length || review.invalidCommands.length || review.aliases.length;
    if (!hasReviewItems) {
      setExportStatusFromBundle(bundle);
      return;
    }
    bundleReviewRenderer.show(review);
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

bundleReviewImportButton.addEventListener('click', () => {
  const action = bundleReviewRenderer.pendingReview?.mode === 'export'
    ? executeBundleReviewExport()
    : executeBundleReviewImport();
  Promise.resolve(action).catch((error) => {
    setBundleStatus('error', error.message || String(error));
  });
});

bundleReviewCancelButton.addEventListener('click', () => {
  bundleReviewRenderer.hide();
});

bundleReviewFilter.addEventListener('input', () => {
  if (!bundleReviewRenderer.pendingReview) {
    return;
  }
  bundleReviewRenderer.refresh();
});
bundleReviewFilter.addEventListener('wa-clear', () => {
  if (bundleReviewRenderer.pendingReview) {
    bundleReviewRenderer.refresh();
  }
});

function refreshPendingBundleReview() {
  bundleReviewRenderer.refresh();
}

bundleReviewCommandsFilter.addEventListener('input', refreshPendingBundleReview);
bundleReviewCommandsFilter.addEventListener('change', refreshPendingBundleReview);
bundleReviewCommandsFilter.addEventListener('wa-clear', refreshPendingBundleReview);
bundleReviewAliasesFilter.addEventListener('input', refreshPendingBundleReview);
bundleReviewAliasesFilter.addEventListener('change', refreshPendingBundleReview);
bundleReviewAliasesFilter.addEventListener('wa-clear', refreshPendingBundleReview);

bundleReviewCommandsSort.addEventListener('change', () => {
  bundleReviewCommandsSortKey = bundleReviewCommandsSort.value || 'name';
  updateSortDirectionButton(bundleReviewCommandsSortDirection, bundleReviewCommandsSortKey, bundleReviewCommandsSortDirectionValue);
  refreshPendingBundleReview();
});

bundleReviewCommandsSortDirection.addEventListener('click', () => {
  bundleReviewCommandsSortDirectionValue = toggleSortDirection(bundleReviewCommandsSortDirectionValue);
  updateSortDirectionButton(bundleReviewCommandsSortDirection, bundleReviewCommandsSortKey, bundleReviewCommandsSortDirectionValue);
  refreshPendingBundleReview();
});

bundleReviewAliasesSort.addEventListener('change', () => {
  bundleReviewAliasesSortKey = bundleReviewAliasesSort.value || 'alias';
  updateSortDirectionButton(bundleReviewAliasesSortDirection, bundleReviewAliasesSortKey, bundleReviewAliasesSortDirectionValue);
  refreshPendingBundleReview();
});

bundleReviewAliasesSortDirection.addEventListener('click', () => {
  bundleReviewAliasesSortDirectionValue = toggleSortDirection(bundleReviewAliasesSortDirectionValue);
  updateSortDirectionButton(bundleReviewAliasesSortDirection, bundleReviewAliasesSortKey, bundleReviewAliasesSortDirectionValue);
  refreshPendingBundleReview();
});

bundleReviewCommandsSelectAll.addEventListener('click', () => {
  bundleReviewRenderer.setSelection('commands', true);
});

bundleReviewCommandsSelectNone.addEventListener('click', () => {
  bundleReviewRenderer.setSelection('commands', false);
});

bundleReviewAliasesSelectAll.addEventListener('click', () => {
  bundleReviewRenderer.setSelection('aliases', true);
});

bundleReviewAliasesSelectNone.addEventListener('click', () => {
  bundleReviewRenderer.setSelection('aliases', false);
});

bundleTextarea.addEventListener('input', () => {
  bundleReviewRenderer.hide();
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
  updateSortDirectionButton(commandSortDirection, commandSortKey, commandSortDirectionValue);
  renderCommands(currentCommands);
});

commandSortDirection.addEventListener('click', () => {
  commandSortDirectionValue = toggleSortDirection(commandSortDirectionValue);
  updateSortDirectionButton(commandSortDirection, commandSortKey, commandSortDirectionValue);
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

function bindFormatterButton(button, editor, options, errorPrefix) {
  button.addEventListener('mousedown', (event) => {
    event.preventDefault();
  });
  button.addEventListener('click', () => {
    formatCodeMirrorSelection(editor, options).catch((error) => {
      console.error(`[factotum] ${errorPrefix} failed`, error);
      setEditorStatus('error', error.message || String(error));
    });
  });
}

bindFormatterButton(editorCodeFormatButtons.js, codeEditor, {
  parser: 'babel',
  plugins: [prettierPluginBabel, prettierPluginEstree]
}, 'format code as js');
bindFormatterButton(editorCodeFormatButtons.html, codeEditor, {
  parser: 'html',
  plugins: [prettierPluginHtml]
}, 'format code as html');
bindFormatterButton(editorCodeFormatButtons.css, codeEditor, {
  parser: 'css',
  plugins: [prettierPluginPostcss]
}, 'format code as css');
bindFormatterButton(editorHelpTemplateFormatButtons.js, helpTemplateEditor, {
  parser: 'babel',
  plugins: [prettierPluginBabel, prettierPluginEstree]
}, 'format help template as js');
bindFormatterButton(editorHelpTemplateFormatButtons.html, helpTemplateEditor, {
  parser: 'html',
  plugins: [prettierPluginHtml]
}, 'format help template as html');
bindFormatterButton(editorHelpTemplateFormatButtons.css, helpTemplateEditor, {
  parser: 'css',
  plugins: [prettierPluginPostcss]
}, 'format help template as css');

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
    field.addEventListener('input', () => {
      updateEditorDirtyState();
      refreshHelpPreview();
    });
    field.addEventListener('change', () => {
      updateEditorDirtyState();
      refreshHelpPreview();
    });
  });

helpPreview.locale.addEventListener('input', refreshHelpPreview);
helpPreview.locale.addEventListener('change', refreshHelpPreview);
helpModeTabs.addEventListener('wa-tab-show', refreshHelpPreview);

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

descriptionEditor.addButton.addEventListener('click', () => {
  addDescriptionRow({ locale: '', value: '' }, { focus: true });
  handleDescriptionEditorChange();
});

helpStringsEditor.addButton.addEventListener('click', () => {
  addHelpStringsBlock({ locale: '', rows: [{ token: '', value: '' }] }, { focus: true });
  handleHelpStringsEditorChange();
});

optionsEditor.addButton.addEventListener('click', () => {
  addOptionRow({
    flags: '',
    value: 'boolean',
    required: false,
    defaultValue: '',
    defaultBoolean: '',
    descriptions: [{ locale: '', value: '' }]
  }, { focus: true });
  handleOptionsEditorChange();
});

requiresEditor.addButton.addEventListener('click', () => {
  addRequireRow({ url: '', kind: '', world: '' }, { focus: true });
  handleRequiresEditorChange();
});

loadCommands()
  .then(() => {
    console.log('[factotum] manager UI loaded');
  })
  .catch((error) => {
    console.error('[factotum] manager UI failed', error);
  });

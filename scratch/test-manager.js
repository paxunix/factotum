import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/menu/menu.js';
import '@shoelace-style/shoelace/dist/components/menu-item/menu-item.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/switch/switch.js';
import '@shoelace-style/shoelace/dist/components/tab/tab.js';
import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js';
import '@shoelace-style/shoelace/dist/components/tag/tag.js';
import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';

setBasePath('./vendor/shoelace');

const loadStatus = document.getElementById('load-status');
if (loadStatus) {
  loadStatus.textContent = 'UI script loaded.';
  loadStatus.classList.add('is-loaded');
}

const commands = {
  'cmd-1': {
    name: 'clip.clean',
    id: 'demo.clip.clean',
    world: 'isolated',
    enabled: true,
    description: 'Normalize clipboard text into a cleaned snippet.',
    help: '<h1>clip.clean</h1>\n<p>Clean clipboard text.</p>',
    code: "export async function main(argv, ctx) {\n  ctx.log('cleaning clipboard');\n}\n"
  },
  'cmd-2': {
    name: 'bmk.clean',
    id: 'demo.bmk.clean',
    world: 'main',
    enabled: false,
    description: 'Remove stale bookmarks by URL pattern.',
    help: '<h1>bmk.clean</h1>\n<p>Remove stale bookmarks.</p>',
    code: "export async function main(argv, ctx) {\n  ctx.log('cleaning bookmarks');\n}\n"
  },
  'cmd-3': {
    name: 'json.view',
    id: 'demo.json.view',
    world: 'isolated',
    enabled: true,
    description: 'Render JSON with a focus on large payloads.',
    help: '<h1>json.view</h1>\n<p>Render JSON in a readable format.</p>',
    code: "export async function main(argv, ctx) {\n  ctx.log('render json');\n}\n"
  }
};

const editorPane = document.getElementById('editor-pane');
const nameInput = document.querySelector('sl-input[label="Name"]');
const idInput = document.querySelector('sl-input[label="Id"]');
const worldSelect = document.querySelector('sl-select[label="World"]');
const descArea = document.querySelector('sl-textarea[label="Description"]');
const helpArea = document.querySelector('sl-textarea[label="Help HTML"]');
const codeBox = document.querySelector('.code-box pre');
const actionSelectedName = document.getElementById('action-selected-name');
const actionEnableName = document.getElementById('action-enable-name');
const actionEditName = document.getElementById('action-edit-name');
const actionDeleteName = document.getElementById('action-delete-name');
const editorSelectedName = document.getElementById('editor-selected-name');
const enableToggle = document.getElementById('action-enable-toggle');

const applyCommand = (key) => {
  const cmd = commands[key];
  if (!cmd) return;
  actionSelectedName.textContent = cmd.name;
  actionEnableName.textContent = cmd.name;
  actionEditName.textContent = cmd.name;
  actionDeleteName.textContent = cmd.name;
  editorSelectedName.textContent = cmd.name;
  enableToggle.checked = cmd.enabled;
  nameInput.value = cmd.name;
  idInput.value = cmd.id;
  worldSelect.value = cmd.world;
  descArea.value = cmd.description;
  helpArea.value = cmd.help;
  codeBox.textContent = cmd.code;
};

applyCommand('cmd-1');

const cmdTabs = document.getElementById('cmd-tabs');
cmdTabs.addEventListener('sl-tab-show', (event) => {
  applyCommand(event.detail.name);
});

const actionTabs = document.getElementById('action-tabs');
const syncEditorVisibility = (panelName) => {
  const isEdit = panelName === 'action-edit';
  editorPane.classList.toggle('is-hidden', !isEdit);
};

syncEditorVisibility('action-enable');

actionTabs.addEventListener('sl-tab-show', (event) => {
  syncEditorVisibility(event.detail.name);
});

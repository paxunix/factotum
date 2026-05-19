import { setBasePath } from '@awesome.me/webawesome/dist/webawesome.js';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/card/card.js';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/option/option.js';
import '@awesome.me/webawesome/dist/components/select/select.js';
import '@awesome.me/webawesome/dist/components/switch/switch.js';
import '@awesome.me/webawesome/dist/components/tab/tab.js';
import '@awesome.me/webawesome/dist/components/tab-group/tab-group.js';
import '@awesome.me/webawesome/dist/components/tab-panel/tab-panel.js';
import '@awesome.me/webawesome/dist/components/tag/tag.js';
import '@awesome.me/webawesome/dist/components/textarea/textarea.js';

setBasePath('./vendor/webawesome');

const loadStatus = document.getElementById('load-status');
if (loadStatus) {
  loadStatus.textContent = 'UI script loaded.';
  loadStatus.classList.add('is-loaded');
}

const commands = {
  'cmd-1': {
    name: 'clip.clean',
    id: 'demo.clip.clean',
    world: 'user_script',
    enabled: true,
    description: 'Normalize clipboard text into a cleaned snippet.',
    help: '<h1>clip.clean</h1>\n<p>Clean clipboard text.</p>',
    code: "export async function main(argv, ctx) {\n  ctx.log('cleaning clipboard');\n}\n"
  },
  'cmd-2': {
    name: 'bmk.clean',
    id: 'demo.bmk.clean',
    world: 'user_script',
    enabled: false,
    description: 'Remove stale bookmarks by URL pattern.',
    help: '<h1>bmk.clean</h1>\n<p>Remove stale bookmarks.</p>',
    code: "export async function main(argv, ctx) {\n  ctx.log('cleaning bookmarks');\n}\n"
  },
  'cmd-3': {
    name: 'json.view',
    id: 'demo.json.view',
    world: 'user_script',
    enabled: true,
    description: 'Render JSON with a focus on large payloads.',
    help: '<h1>json.view</h1>\n<p>Render JSON in a readable format.</p>',
    code: "export async function main(argv, ctx) {\n  ctx.log('render json');\n}\n"
  }
};

const editorPane = document.getElementById('editor-pane');
const nameInput = document.querySelector('wa-input[label="Name"]');
const idInput = document.querySelector('wa-input[label="Id"]');
const worldInput = document.querySelector('wa-input[label="World"]');
const descArea = document.querySelector('wa-textarea[label="Description"]');
const helpArea = document.querySelector('wa-textarea[label="Help HTML"]');
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
  worldInput.value = cmd.world;
  descArea.value = cmd.description;
  helpArea.value = cmd.help;
  codeBox.textContent = cmd.code;
};

applyCommand('cmd-1');

const cmdTabs = document.getElementById('cmd-tabs');
cmdTabs.addEventListener('wa-tab-show', (event) => {
  applyCommand(event.detail.name);
});

const actionTabs = document.getElementById('action-tabs');
const syncEditorVisibility = (panelName) => {
  const isEdit = panelName === 'action-edit';
  editorPane.classList.toggle('is-hidden', !isEdit);
};

syncEditorVisibility('action-enable');

actionTabs.addEventListener('wa-tab-show', (event) => {
  syncEditorVisibility(event.detail.name);
});

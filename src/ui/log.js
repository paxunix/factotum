import { setBasePath } from '@awesome.me/webawesome/dist/webawesome.js';
import '@awesome.me/webawesome/dist/components/button/button.js';

// Log UI entrypoint (v1 skeleton)
setBasePath(chrome.runtime.getURL('vendor/webawesome'));

const title = chrome.i18n.getMessage('logsTitle');
const hint = chrome.i18n.getMessage('logsHint');
const navManager = chrome.i18n.getMessage('navManager');
const navLogs = chrome.i18n.getMessage('navLogs');

document.title = title;
document.getElementById('log-title').textContent = title;
document.getElementById('log-hint').textContent = hint;
document.getElementById('nav-manager').textContent = navManager;
document.getElementById('nav-logs').textContent = navLogs;

console.log('[factotum] log UI loaded');

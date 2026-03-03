import { setBasePath } from '@awesome.me/webawesome/dist/webawesome.js';
import '@awesome.me/webawesome/dist/components/button/button.js';

// Ensure Web Awesome assets resolve inside the extension bundle.
setBasePath(chrome.runtime.getURL('vendor/webawesome'));

const title = chrome.i18n.getMessage('managerTitle');
const hint = chrome.i18n.getMessage('managerHint');
const navManager = chrome.i18n.getMessage('navManager');
const navLogs = chrome.i18n.getMessage('navLogs');

document.title = title;
document.getElementById('manager-title').textContent = title;
document.getElementById('manager-hint').textContent = hint;
document.getElementById('nav-manager').textContent = navManager;
document.getElementById('nav-logs').textContent = navLogs;

console.log('[factotum] manager UI loaded');

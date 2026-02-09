import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';

// Ensure Shoelace assets resolve inside the extension bundle.
setBasePath(chrome.runtime.getURL('vendor/shoelace'));

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

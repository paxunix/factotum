import { setBasePath } from '@awesome.me/webawesome/dist/webawesome.js';
import '@awesome.me/webawesome/dist/components/button/button.js';

setBasePath(chrome.runtime.getURL('vendor/webawesome'));

const title = chrome.i18n.getMessage('popupTitle');
const hint = chrome.i18n.getMessage('popupHint');
const menuManager = chrome.i18n.getMessage('menuManager');
const menuLogs = chrome.i18n.getMessage('menuLogs');

document.title = title;
document.getElementById('popup-title').textContent = title;
document.getElementById('popup-hint').textContent = hint;
document.getElementById('nav-manager').textContent = menuManager;
document.getElementById('nav-logs').textContent = menuLogs;

console.log('[factotum] popup loaded');

const openPage = (page) => {
  const target =
    page === 'manager'
      ? chrome.runtime.getURL('ui/manager.html')
      : chrome.runtime.getURL('ui/log.html');
  chrome.tabs.create({ url: target });
};

document.getElementById('nav-manager').addEventListener('click', () => openPage('manager'));
document.getElementById('nav-logs').addEventListener('click', () => openPage('logs'));

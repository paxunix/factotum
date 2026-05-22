import { setBasePath } from '@awesome.me/webawesome/dist/webawesome.js';
import '@awesome.me/webawesome/dist/components/button/button.js';

setBasePath(chrome.runtime.getURL('vendor/webawesome'));

const title = chrome.i18n.getMessage('popupTitle');
const hint = chrome.i18n.getMessage('popupHint');
const menuManager = chrome.i18n.getMessage('menuManager');

document.title = title;
document.getElementById('popup-title').textContent = title;
document.getElementById('popup-hint').textContent = hint;
document.getElementById('nav-manager').textContent = menuManager;

console.log('[factotum] popup loaded');

const openPage = () => {
  const target = chrome.runtime.getURL('ui/manager.html');
  chrome.tabs.create({ url: target });
};

document.getElementById('nav-manager').addEventListener('click', openPage);

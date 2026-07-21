import { setBasePath } from '@awesome.me/webawesome/dist/webawesome.js';
import { getMessage } from '../shared/i18n.js';
import '@awesome.me/webawesome/dist/components/button/button.js';

setBasePath(chrome.runtime.getURL('vendor/webawesome'));

const title = getMessage('popupTitle', 'Factotum');
const menuManager = getMessage('menuManager', 'Open Manager');

document.title = title;
document.getElementById('popup-title').textContent = title;
document.getElementById('nav-manager').textContent = menuManager;

console.log('[factotum] popup loaded');

const openPage = () => {
  const target = chrome.runtime.getURL('ui/manager.html');
  chrome.tabs.create({ url: target });
};

document.getElementById('nav-manager').addEventListener('click', openPage);

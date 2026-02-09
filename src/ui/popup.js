import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js';
import '@shoelace-style/shoelace/dist/components/menu/menu.js';
import '@shoelace-style/shoelace/dist/components/menu-item/menu-item.js';

setBasePath(chrome.runtime.getURL('vendor/shoelace'));

console.log('[factotum] popup loaded');

const menu = document.getElementById('quick-nav');
menu.addEventListener('sl-select', (event) => {
  const { value } = event.detail.item;
  const target =
    value === 'manager'
      ? chrome.runtime.getURL('ui/manager.html')
      : chrome.runtime.getURL('ui/log.html');
  chrome.tabs.create({ url: target });
});

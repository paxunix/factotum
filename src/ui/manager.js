import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';

// Ensure Shoelace assets resolve inside the extension bundle.
setBasePath(chrome.runtime.getURL('dist/vendor/shoelace'));

console.log('[factotum] manager UI loaded');

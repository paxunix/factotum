import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';

// Log UI entrypoint (v1 skeleton)
setBasePath(chrome.runtime.getURL('vendor/shoelace'));

console.log('[factotum] log UI loaded');

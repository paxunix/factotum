"use strict";

/**
 * Contains code that should only run via load by the extension.
 */

ContentScript.injectFactotumApi(document);

chrome.runtime.onMessage.addListener(ContentScript.factotumListener);
window.addEventListener("message", ContentScript.messageListener, false);

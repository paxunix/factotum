(async () => {


"use strict";

let ContentScript = (await import(browser.runtime.getURL("scripts/ContentScript.js"))).default;


/**
 * Contains code that should only run via load by the extension.
 */

(async () => {
    await ContentScript.injectFactotumApi(document);

    // Listener for communication from background page
    browser.runtime.onMessage.addListener(ContentScript.factotumListener);

    // Listener for communication from page (injected Factotum)
    window.addEventListener("message", ContentScript.messageListener, false);

})();


})();   // async

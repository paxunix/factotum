"use strict";

import ContentScript from "./ContentScript.js";
import WrappErr from "./wrapperr-esm.js";

let browser = require("../node_modules/webextension-polyfill/dist/browser-polyfill.js");

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

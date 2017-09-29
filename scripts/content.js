"use strict";

import ContentScript from "./ContentScript.js";
import WrappErr from "./wrapperr-esm.js";


/**
 * Contains code that should only run via load by the extension.
 */

var p = ContentScript.injectFactotumApi(document);

p.then(function () {
    chrome.runtime.onMessage.addListener(ContentScript.factotumListener);
    window.addEventListener("message", ContentScript.messageListener, false);
}).catch(error => {
    throw new WrappErr(error, "Error injecting Factotum API");
});

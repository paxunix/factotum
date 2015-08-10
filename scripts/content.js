"use strict";

var ContentScript = require("./ContentScript.js");


/**
 * Contains code that should only run via load by the extension.
 */

var p = ContentScript.injectFactotumApi(document);

p.then(function () {
    chrome.runtime.onMessage.addListener(ContentScript.factotumListener);
    window.addEventListener("message", ContentScript.messageListener, false);
}).catch(function () {
    console.log("Error injecting Factotum API");
});

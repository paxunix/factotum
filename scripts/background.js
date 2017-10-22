"use strict";

import FactotumBg from "./FactotumBg.js";
import FcommandManager from "./FcommandManager.js";
import Util from "./Util.js";
import FcommandErrors from "./FcommandErrors.js";

let browser = require("../node_modules/webextension-polyfill/dist/browser-polyfill.js");

window.g_fcommandManager = new FcommandManager(new FcommandErrors());

// Register Omnibox listeners.

// XXX: commenting out onInputStarted since it currently doesn't do what it
// says on the box: https://code.google.com/p/chromium/issues/detail?id=258911
//chrome.omnibox.onInputStarted.addListener(FactotumBg.onOmniboxInputStarted);
browser.omnibox.onInputEntered.addListener(FactotumBg.onOmniboxInputEntered);
browser.omnibox.onInputChanged.addListener(FactotumBg.onOmniboxInputChanged);

// Listen for messages from content script
browser.runtime.onMessage.addListener(FactotumBg.responseHandler);

// Ensure some test Fcommands are always present
let fetchUrls = [
    browser.runtime.getURL("example/load-jquery.html"),
    browser.runtime.getURL("example/bgtest.html"),
    browser.runtime.getURL("example/bgtest2.html"),
];

for (let url of fetchUrls)
{
    g_fcommandManager.fetchFcommandUrl(url);
}

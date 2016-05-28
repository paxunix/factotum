"use strict";

import FactotumBg from "./FactotumBg.js";
import FcommandManager from "./FcommandManager.js";
import Util from "./Util.js";
import WrappErr from "wrapperr";

window.fcommandManager = new FcommandManager();

// Register Omnibox listeners.

// XXX: commenting out onInputStarted since it currently doesn't do what it
// says on the box: https://code.google.com/p/chromium/issues/detail?id=258911
//chrome.omnibox.onInputStarted.addListener(FactotumBg.onOmniboxInputStarted);
chrome.omnibox.onInputEntered.addListener(FactotumBg.onOmniboxInputEntered);
chrome.omnibox.onInputChanged.addListener(FactotumBg.onOmniboxInputChanged);

// Listen for messages from content script
chrome.runtime.onMessage.addListener(FactotumBg.responseHandler);

// XXX: during testing, to create an Fcommand on-the-fly in devtools
import Fcommand from "./Fcommand.js";

// Ensure some test Fcommands are always present
let fetchThese = [
    Util.fetchDocument(chrome.runtime.getURL("example/load-jquery.html")),
    Util.fetchDocument(chrome.runtime.getURL("example/bgtest.html")),
    Util.fetchDocument(chrome.runtime.getURL("example/bgtest2.html")),
];

for (let p of fetchThese)
{
    fcommandManager
    let p_getFcommand = p.then(bodyText => {
        return new Fcommand(bodyText, navigator.language);
    });

    let p_saveFcommand =
        p_getFcommand.then(fcommand => fcommandManager.save(fcommand));

    p_saveFcommand.catch(error =>
        p_getFcommand.then(fcommand =>
            fcommandManager.saveError(new WrappErr(error, `Fcommand load failure (${fcommand.extractedData.title} - ${fcommand.extractedData.guid})`))
        )
    );
}

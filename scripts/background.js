"use strict";

var FactotumBg = require("./FactotumBg.js");


if (1) {   // XXX:  this is for testing only.  Preload Fcommands so we can invoke them.
FactotumBg.XXXcommandCache = { };      // for testing only

var Util = require("./Util.js");
var Fcommand = require("./Fcommand.js");

var fetchThese = [
    Util.fetchDocument(chrome.runtime.getURL("example/load-jquery.html")),
    Util.fetchDocument(chrome.runtime.getURL("example/bgtest.html")),
];

fetchThese.forEach(function (p) {
    p.then(function resolvedWith(event) {
        var fcommand = new Fcommand(event.target.responseText, navigator.language);
        FactotumBg.XXXcommandCache[fcommand.metadata.guid] = fcommand;
    }).
    catch(function rejectedWith(data) {
        console.log("Fcommand load failure:", data);
        chrome.notifications.create(
            "",
            {
                type: "basic",
                iconUrl: chrome.runtime.getURL("icons/md/error.png"),
                title: "Error loading Fcommand",
                message: data.message,
                // XXX: showing the stack is useless inside a tiny
                // notification.  Show the message and maybe a button
                // for more details, that pops a window that shows the
                // stack.
                // Should record all failures so you can view errors from
                // the extension menu?  Kind of like a JS console.
            },
            function() {}
        );
    });
});

}


// Register Omnibox listeners.
chrome.omnibox.onInputEntered.addListener(FactotumBg.onOmniboxInputEntered);
chrome.omnibox.onInputChanged.addListener(FactotumBg.onOmniboxInputChanged);

// Listen for messages from content script
chrome.runtime.onMessage.addListener(FactotumBg.responseHandler);

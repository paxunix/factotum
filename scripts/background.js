"use strict";

var FactotumBg = require("./FactotumBg.js");
var FcommandManager = require("./FcommandManager.js");

window.fcommandManager = new FcommandManager();

// Register Omnibox listeners.
chrome.omnibox.onInputEntered.addListener(FactotumBg.onOmniboxInputEntered);
chrome.omnibox.onInputChanged.addListener(FactotumBg.onOmniboxInputChanged);

// Listen for messages from content script
chrome.runtime.onMessage.addListener(FactotumBg.responseHandler);

if (1) {   // XXX:  this is for testing only.  Preload Fcommands so we can invoke them.

// XXX: during testing, to create an Fcommand on-the-fly in devtools
window.Fcommand = require("./Fcommand.js");

var Util = require("./Util.js");

// Ensure some test Fcommands are always present
var fetchThese = [
    Util.fetchDocument(chrome.runtime.getURL("example/load-jquery.html")),
    Util.fetchDocument(chrome.runtime.getURL("example/bgtest.html")),
];

fetchThese.forEach(function (p) {
    p.then(function resolvedWith(event) {
            var fcommand = new Fcommand(event.target.responseText, navigator.language);
            return fcommandManager.save(fcommand);
        })
    .then(function (res) {
            console.log("Test fcommand (" + res + ") loaded");
        })
    .catch(function rejectedWith(data) {
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

}   // test code only

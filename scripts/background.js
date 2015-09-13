"use strict";

var FactotumBg = require("./FactotumBg.js");
var FcommandManager = require("./FcommandManager.js");

window.fcommandManager = new FcommandManager();

// Register Omnibox listeners.

// XXX: commenting out onInputStarted since it currently doesn't do what it
// says on the box: https://code.google.com/p/chromium/issues/detail?id=258911
//chrome.omnibox.onInputStarted.addListener(FactotumBg.onOmniboxInputStarted);
chrome.omnibox.onInputEntered.addListener(FactotumBg.onOmniboxInputEntered);
chrome.omnibox.onInputChanged.addListener(FactotumBg.onOmniboxInputChanged);

// Listen for messages from content script
chrome.runtime.onMessage.addListener(FactotumBg.responseHandler);

// XXX:  consider doing this only done if there are any Fcommands that support
// menu
fcommandManager.createMainContextMenu().then(function (res) {

// XXX: during testing, to create an Fcommand on-the-fly in devtools
window.Fcommand = require("./Fcommand.js");

var Util = require("./Util.js");

// Ensure some test Fcommands are always present
var fetchThese = [
    Util.fetchDocument(chrome.runtime.getURL("example/load-jquery.html")),
    Util.fetchDocument(chrome.runtime.getURL("example/bgtest.html")),
    Util.fetchDocument(chrome.runtime.getURL("example/bgtest2.html")),
];

fetchThese.forEach(function (p) {
    p.then(function resolvedWith(event) {
        var fcommand = new Fcommand(event.target.responseText, navigator.language);
        return fcommandManager.save(fcommand);
    }).then(function (fcommand) {
        return fcommand.createContextMenu(FcommandManager.MAIN_MENU_ID);
    }).catch(function rejectedWith(data) {
        console.log("Fcommand load failure:", data);
        chrome.notifications.create(
            "",
            {
                type: "basic",
                iconUrl: chrome.runtime.getURL("icons/md/error.png"),
                title: "Error loading Fcommand",
                message: data.toString(),
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

});

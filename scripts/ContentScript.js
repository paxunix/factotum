'use strict';

module.exports = (function() {

var TransferObject = require("./TransferObject.js");
var Util = require("./Util.js");


var ContentScript = {};


/**
 * Helper to append a node to the document's <head> or document if head
 * isn't present.
 * Exists primarily to simplify testing by giving a known function to mock.
 */
ContentScript.appendNodeToDocumentHead = function (node)
{
    (document.head || document.documentElement).appendChild(node);
}   // ContentScript.appendNodeToDocumentHead


/**
 * Return a Promise to load the import document specified by the transfer
 * object's data.
 * @param {TransferObject} transferObj - Input/output data.  This object is rejected/resolved.
 * @returns {Promise} - promise to load the import document
 */
ContentScript.getLoadImportPromise = function (transferObj)
{
    return new Promise(function (resolve, reject) {
        // If the import document for the Fcommand is still present, the
        // Fcommand has not completed yet.
        // XXX: this is the same code as in inject.js.  Would be nice to put
        // it in one place.
        if (document.querySelector(`head link#fcommand-${transferObj.get("content.guid")}[rel=import]`))
        {
            transferObj.set("bg.errorMessage", `Fcommand '${transferObj.get("content.title")}' (${transferObj.get("content.guid")}) is still running in this tab.`);
            reject(transferObj);

            return;
        }

        var elem = Util.createImportLink(document, transferObj);

        elem.onload = function onload() {
            resolve(transferObj);
        };

        elem.onerror = function onerror(evt) {
            // XXX:  should support error obj (like we used to) as well as
            // just error message???
            transferObj.set("bg.errorMessage", evt.statusText);
            reject(transferObj);
        };

        ContentScript.appendNodeToDocumentHead(elem);
    });     // new Promise
}   // ContentScript.getLoadImportPromise


// Define a connection listener that loads an Fcommand import document
// passed from Factotum.  If an exception occurs while executing the
// Fcommand, the error message is returned to Factotum.
// The rejection object is expected to contain an error property whose value
// is either a string or an Error object.
// The promise value is a TransferObject.
ContentScript.factotumListener = function (request)
{
    var transferObj = new TransferObject(request);

    ContentScript.getLoadImportPromise(transferObj).
        catch(function (rejectWith) {
            chrome.runtime.sendMessage(rejectWith);
        });

    // No response
    return false;
}   // ContentScript.factotumListener


// Define a listener for messages posted from the content's window.
// Fcommands whose code runs in the "page" context use this to communicate
// back to the extension.
ContentScript.messageListener = function (evt)
{
    // Only accept messages from same frame and that conform to our
    // expectations.
    if (evt.source !== window ||
        typeof(evt.data) !== "object" ||
        evt.data === null ||
        !("guid" in evt.data))
            return;

    chrome.runtime.sendMessage(evt.data);
}   // ContentScript.messageListener


// Return a promise to insert the Factotum API into the page, so in-page JS
// has access to it.
ContentScript.injectFactotumApi = function (document)
{
    var p = new Promise(function (resolve, reject) {
        var s = document.createElement("script");
        s.src = chrome.runtime.getURL("build/inject.js");
        s.onload = function () {
            // No need to keep the script around once it has run
            s.parentNode.removeChild(s);
            resolve();
        };
        s.onerror = function () {
            reject();
        };

        (document.head || document.documentElement).appendChild(s);
    });

    return p;
}   // ContentScript.injectFactotumApi


return ContentScript;

})();   // module.exports

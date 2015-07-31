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


// Keep track of Fcommands currently executing in this tab, since we need to
// prevent the same Fcommand from running multiple overlapping times.
ContentScript.Cache = {
    _cache: { },

    get: function (key) {
        return this._cache[key];
    },

    set: function (key, value) {
        this._cache[key] = value;
    },

    delete: function (key) {
        delete this._cache[key];
    },

    clear: function () {
        this._cache = { };
    },
};


/**
 * Return a Promise to load the import document specified by the transfer
 * object's data.
 * @param {TransferObject} transferObj - Input/output data.  This object is rejected/resolved.
 * @returns {Promise} - promise to load the import document
 */
ContentScript.getLoadImportPromise = function (transferObj)
{
    return new Promise(function (resolve, reject) {
        if (ContentScript.Cache.get(transferObj.getGuid()))
        {
            transferObj.setErrorMessage("Fcommand '" + transferObj.getTitle() +
                "' (" + transferObj.getGuid() + ") is still running in this tab.");
            reject(transferObj);

            return;
        }
        else
            ContentScript.Cache.set(transferObj.getGuid(), true);

        // XXX:  why does this need to be put on the transferObj, if
        // it's only needed in this function (and a ref to it is appended to
        // the document head)?
        transferObj.linkElement = Util.createImportLink(document, transferObj);

        transferObj.linkElement.onload = function onload() {
            resolve(transferObj);
        };

        transferObj.linkElement.onerror = function onerror(evt) {
            // XXX:  should support error obj (like we used to) as well as
            // just error message???
            transferObj.setErrorMessage(evt.statusText);
            reject(transferObj);
        };

        ContentScript.appendNodeToDocumentHead(transferObj.linkElement);
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
            // This Fcommand is no longer running in this tab.
            ContentScript.Cache.delete(rejectWith.getGuid());

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

    // This Fcommand is no longer running in this tab.
    ContentScript.Cache.delete(evt.data.guid);

    chrome.runtime.sendMessage(evt.data);
}   // ContentScript.messageListener


// Insert the Factotum API into the page, so in-page JS has access to it.
ContentScript.injectFactotumApi = function (document)
{
    var s = document.createElement("script");
    s.src = chrome.runtime.getURL("scripts/inject.js");
    s.onload = function () {
        // No need to keep the script around once it has run
        s.parentNode.removeChild(s);
    };

    (document.head || document.documentElement).appendChild(s);
}   // ContentScript.injectFactotumApi


return ContentScript;

})();   // module.exports

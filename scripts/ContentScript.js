'use strict';

module.exports = (function() {

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


// Each promise ultimately fulfills to an object so that necessary state can
// be passed to other promises.  The object can contain:
//      request: the request object as passed from the background page
//      linkElement:  the HTMLLinkElement that specifies the import doc
//      error:  Error object (only present if a promise has been rejected)


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
 * Return a Promise to load the import document specified in request.
 * @param {Object} request - Input/output data.  This becomes the object
 * passed to resolves/rejecters.
 * @property {String} request.documentString - the HTML string to use as the import document for the Fcommand
 * @property {String} request.cmdline - minimist parsed object containing Fcommand cmdline data
 * @property {String} request.guid - Fcommand GUID
 * @property {Object} request.internalOptions - internal options (like debug, help, etc.)
 * @returns {Promise} - promise to load the import document
 */
ContentScript.getLoadImportPromise = function (request)
{
    return new Promise(function (resolve, reject) {
        if (ContentScript.Cache.get(request.guid))
        {
            request.error = "Fcommand '" + request.title +
                "' (" + request.guid + ") is still running in this tab.";
            reject(request);

            return;
        }
        else
            ContentScript.Cache.set(request.guid, true);

        request.linkElement = Util.createImportLink(document, request);

        request.linkElement.onload = function onload() {
            resolve(request);
        };

        request.linkElement.onerror = function onerror(evt) {
            request.error = Error(evt.statusText);
            reject(request);
        };

        ContentScript.appendNodeToDocumentHead(request.linkElement);
    });     // new Promise
}   // ContentScript.getLoadImportPromise


// Define a connection listener that loads an Fcommand import document
// passed from Factotum.  If an exception occurs while executing the
// Fcommand, the error message is returned to Factotum.
// The rejection object is expected to contain an error property whose value
// is either a string or an Error object.
ContentScript.factotumListener = function (request)
{
    ContentScript.getLoadImportPromise(request).
        catch(function (rejectWith) {
            // This Fcommand is no longer running in this tab.
            ContentScript.Cache.delete(rejectWith.guid);

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

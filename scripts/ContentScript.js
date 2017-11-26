'use strict';

import TransferObject from "./TransferObject.js";

let browser = require("../node_modules/webextension-polyfill/dist/browser-polyfill.js");


class ContentScript
{


/**
 * Returns a string to be used as the id on the link.import element injected
 * into the page.
 * @param {String} guid - The GUID of the Fcommand
 */
static getFcommandImportId(guid)
{
    return `fcommand-${guid}`;
}   // ContentScript.getFcommandImportId


/**
 * Create a <link> import element to be inserted in the parentDocument.
 * @param {HTMLDocument} parentDocument - The document the <link> element will be appended to
 * @param {TransferObject} transferObj - Object containing data from the bg.  Modifies TransferObject to no longer have the document string.
 * @return {HTMLLinkElement} - A <link> element.
 */
static createImportLink(parentDocument, transferObj)
{
    var blob = new Blob([transferObj.get("_content.documentString")], { type: "text/html" });
    var link = parentDocument.createElement("link");
    link.rel = "import";
    link.id = ContentScript.getFcommandImportId(transferObj.get("_content.guid"));

    // No need to pass the document string since we already extracted it for
    // our use.
    transferObj.delete("_content.documentString");

    // Content script needs access to all the transferred data
    link.dataset.transferObj = JSON.stringify(transferObj);
    link.href = URL.createObjectURL(blob);

    return link;
}   // ContentScript.createImportLink



/**
 * Helper to append a node to the document's <head> or document if head
 * isn't present.
 * Exists primarily to simplify testing by giving a known function to mock.
 */
static appendNodeToDocumentHead(node)
{
    (document.head || document.documentElement).appendChild(node);
}   // ContentScript.appendNodeToDocumentHead


/**
 * Return a Promise to load the import document specified by the transfer
 * object's data.
 * @param {TransferObject} transferObj - Input/output data.  This object is rejected/resolved.
 * @returns {Promise} - promise to load the import document; resolves/rejects with transferObj.
 */
static getLoadImportPromise(transferObj)
{
    return new Promise(function (resolve, reject) {
        // If the import document for the Fcommand is still present, the
        // Fcommand has not completed yet.
        // XXX: this is the same code as in inject.js.  Would be nice to put
        // it in one place.
        if (document.querySelector(`head link#fcommand-${transferObj.get("_content.guid")}[rel=import]`))
        {
            transferObj.set("_bg.errorMessage", `Fcommand '${transferObj.get("_content.title")}' (${transferObj.get("_content.guid")}) is still running in this tab.`);
            throw transferObj;
        }

        var elem = ContentScript.createImportLink(document, transferObj);

        elem.onload = function onload() {
            resolve(transferObj);
        };

        elem.onerror = function onerror(evt) {
            // XXX:  should support error obj (like we used to) as well as
            // just error message???
            transferObj.set("_bg.errorMessage", evt.statusText);
            reject(transferObj);
        };

        ContentScript.appendNodeToDocumentHead(elem);
    });
}   // ContentScript.getLoadImportPromise


// Define a connection listener that loads an Fcommand import document
// passed from Factotum.  If an exception occurs while executing the
// Fcommand, the error message is returned to Factotum.
// The rejection object is expected to contain an error property whose value
// is either a string or an Error object.
// The promise value is a TransferObject.
static factotumListener(request, sender)
{
    // Ignore any messages not from us
    if (sender.id !== chrome.runtime.id)
        return false;

    var transferObj = new TransferObject(request);

    ContentScript.getLoadImportPromise(transferObj).
        catch(function (rejectWith) {
            browser.runtime.sendMessage(rejectWith);
        });

    // No response
    return false;
}   // ContentScript.factotumListener


// Define a listener for messages posted from the content's window.
// Fcommands whose code runs in the "page" context use this to communicate
// back to the extension.
static messageListener(evt)
{
    // Only accept messages from same frame and that conform to our
    // expectations.
    if (evt.source !== window ||
        typeof(evt.data) !== "object" ||
        evt.data === null ||
        typeof(evt.data.storage) !== "object")      // XXX: internals of TransferObject
            return;

    var transferObj = new TransferObject(evt.data);
    browser.runtime.sendMessage(transferObj);
}   // ContentScript.messageListener


// Return a promise to insert the Factotum API into the page, so in-page JS
// has access to it.
static injectFactotumApi(document)
{
    return new Promise(function (resolve, reject) {
        var s = document.createElement("script");
        s.src = browser.runtime.getURL("inject.bundle.js");
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
}   // ContentScript.injectFactotumApi


}

export default ContentScript;

(async () => {


"use strict";

let TransferObject = (await import("./TransferObject.js")).default;


// XXX: make me a class
/**
 * Define the Factotum API available to all Fcommands within a page.
 */

window.Factotum = { };

/**
 * Return the import element for the given guid.
 * @param {HTMLDocument} document - the document to search
 * @param {String} guid - Fcommand guid to look for
 * @return {HTMLLinkElement} the import element.
 */
Factotum._getImportElement = function (document, guid)
{
    return document.querySelector(`head link#fcommand-${guid}[rel=import]`);
}   // Factotum._getImportElement


/**
 * Retrieves the object encoded in the given data attribute for an Fcommand.
 * @param {String} guid - Fcommand's guid.
 * @param {String} attributeName - Attribute name that contains the JSON-stringified form of.
 * @return {Object} Object containing the attribute's data.
 */
Factotum._getDataAttribute = function (document, guid, attributeName)
{
    var linkEl = Factotum._getImportElement(document, guid);
    return JSON.parse(linkEl.dataset[attributeName]);
}   // Factotum._getDataAttribute


// Remove the import document <link> element.
Factotum._cleanup = function (document, guid)
{
    var linkEl = Factotum._getImportElement(document, guid);
    if (linkEl)
    {
        URL.revokeObjectURL(linkEl.href);
        linkEl.remove();
    }
}   // ContentScript._cleanup


/**
 * Return the ID of the currently running Fcommand (when called from
 * within the Fcommand's scripts running during import).
 * @param {HTMLDocument} document - Document object to search
 * @return {String} String GUID of the Fcommand represented by document.
 */
Factotum.getFcommandId = function (document)
{
    return document.querySelector("head meta[name=guid]").content;
}   // Factotum.getFcommandId


/**
 * Run the given Fcommand function.  You call this to invoke your Fcommand
 * code.
 * @param {Function} fcommandFunc - function that is the Fcommand.  Takes
 * these parameters:
 * @property {TransferObject} transferObj - contains command line options, tab disposition, etc.  @see {TransferObject}
 * @property {Object} browser - WebExtension's browser object.  @see https://developer.mozilla.org/en-US/Add-ons/WebExtensions
 */
Factotum.runCommand = function (fcommandFunc)
{
    // XXX: test me
    var importDoc = document.currentScript.ownerDocument;
    var guid = Factotum.getFcommandId(importDoc);
    var transferObj = new TransferObject(Factotum._getDataAttribute(document, guid, "transferObj"));
    var clonedTransferObject = transferObj.clone().setImportDocument(importDoc);
    var isDebug = transferObj.get("_content.internalCmdlineOptions").debug;

    // It is important that the Fcommand function receive a cloned transfer
    // object so we maintain our own copy of it in this call frame
    // independently of whatever the Fcommand does to it.
    var p = new Promise((res, rej) => {
        if (isDebug) debugger;

        return res(fcommandFunc(clonedTransferObject));
    });

    p.then(function (bgData) {
        if (typeof bgData !== "undefined")
        {
            transferObj.setBgData(bgData);
            postMessage(transferObj, "*");
        }
    }).catch(function (error) {
        // If a thrown Error, its details will not be preserved when passed
        // to the background context, so pull out the stack and use it
        // as the error string.
        transferObj.set("_bg.errorMessage",
            (error instanceof Error) ?  error.stack : error);
        postMessage(transferObj, "*");
    }).finally(() => {
        Factotum._cleanup(document, guid);
    });
}   // Factotum.runCommand


Factotum.ConfigDialog = (await import("./ConfigDialog.js")).default;

})();   // async

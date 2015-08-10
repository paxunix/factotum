"use strict";

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
 * @property {Object} opts - minimist command line parameters passed to the Fcommand
 * @property {HTMLDocument} importDoc - the import document containing the Fcommand
 * @property {Function} onSuccess - called by the Fcommand code to indicate succesful completion.  Expects on Object (containing the data to be passed to the Fcommands bg code (if any)).
 * @property {Function} onFailure - called by the Fcommand code to indicate failure.  Expects one Object (either an Error object or a string).
 */
Factotum.runCommand = function (fcommandFunc)
{
    // XXX: test me
    var importDoc = document.currentScript.ownerDocument;
    var guid = Factotum.getFcommandId(importDoc);
    var opts = Factotum._getDataAttribute(document, guid, "fcommandArgs");
    var internalOptions = Factotum._getDataAttribute(document, guid, "fcommandInternalOptions");

    var p = new Promise(function (resolve, reject) {
        if (internalOptions.debug)
            debugger;

        // Call the Fcommand
        fcommandFunc(opts, importDoc, resolve, reject);
    });

    p.then(function (bgData) {
        Factotum._cleanup(document, guid);

        var data = {
            guid: guid,     // so the bg page can find the fcommand bg code
            data: bgData,   // passed to the bg code
            opts: opts,     // so bg code can know the cmdline
            internalOptions: internalOptions    // so bg code can enable debug
        };
        // XXX:  should use a transferobject?  Shouldn't be needed if
        // instead the listener in the content page converts this data into
        // a transfer object (since then transferobject doesn't also have to
        // be injected into the page)
        postMessage(data, "*");
    }).catch(function (error) {
        Factotum._cleanup(document, guid);

        // If a thrown Error, its details will not be preserved when passed
        // to the background context, so pull out the stack and use it
        // as the error string.
        // XXX:  this should be put in a transferobject
        var response = {
            guid: guid,
            errorMessage: (error instanceof Error) ?  error.stack : error,
        };

        postMessage(response, "*");

        if (error instanceof Error)
            throw error;
    });
}   // Factotum.runCommand

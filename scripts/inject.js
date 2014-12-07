"use strict";

/**
 * Define the Factotum API available to all Fcommands within a page.
 */

window.Factotum = { };

/**
 * Retrieves the object encoded in the given data attribute for an Fcommand.
 * @param {String} guid - Fcommand's guid.
 * @param {String} attributeName - Attribute name that contains the JSON-stringified form of.
 * @return {Object} Object containing the attribute's data.
 */
Factotum._getDataAttribute = function (guid, attributeName)
{
    var linkEl = document.querySelector("head link#fcommand-" +
            guid + "[rel=import]")

    return JSON.parse(linkEl.dataset[attributeName]);
}   // Factotum._getDataAttribute


/**
 * Return the ID of the currently running Fcommand (when called from
 * within the Fcommand's scripts running during import).
 */
Factotum.getFcommandId = function ()
{
    var fcommandDoc = document.currentScript.ownerDocument;
    return fcommandDoc.querySelector("head meta[name=guid]").content;
}   // Factotum.getFcommandId


/**
 * Run the given Fcommand function.  You call this to invoke your Fcommand
 * code.
 * XXX: document fcommandFunc params
 */
Factotum.runCommand = function (fcommandFunc)
{
    var guid = Factotum.getFcommandId();
    var importDoc = document.currentScript.ownerDocument;
    var parameters = Factotum._getDataAttribute(guid, "fcommandArgs");
    var internalOptions = Factotum._getDataAttribute(guid, "fcommandInternalOptions");

    var p = new Promise(function (resolve, reject) {
        if (internalOptions.debug)
            debugger;

        // Call the Fcommand
        fcommandFunc(parameters, importDoc, resolve, reject);
    });

    p.then(function (bgData) {
        var data = {
            guid: guid,
            data: bgData,
            internalOptions: internalOptions
        };
        postMessage(data, "*");
    }).catch(function (error) {
        // If a thrown Error, its details will not be preserved when passed
        // to the background context, so pull out the stack and use it
        // as the error string.
        var response = {
            guid: guid,
            error: (error instanceof Error) ?  error.stack : error,
        };

        postMessage(response, "*");

        if (error instanceof Error)
            throw error;
    });
}   // Factotum.runCommand

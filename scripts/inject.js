"use strict";

/**
 * Define the Factotum API available to all Fcommands within a page.
 */

window.Factotum = { };

/**
 * Available to be called from with page-context Fcommand code.  It returns
 * the minimist options hash of the parsed Fcommand command line.
 */
window.Factotum.getParameters = function (guid)
{
    var linkEl = document.querySelector("head link#fcommand-" +
            guid + "[rel=import]")

    return JSON.parse(linkEl.dataset.fcommandArgs);
}   // Factotum.getParameters


window.Factotum.getInternalOptions = function (guid)
{
    var linkEl = document.querySelector("head link#fcommand-" +
            guid + "[rel=import]")

    return JSON.parse(linkEl.dataset.fcommandInternalOptions);
}   // Factotum.getInternalOptions


/**
 * Return the ID of the currently running Fcommand (when called from
 * within the Fcommand's scripts running during import).
 */
window.Factotum.getFcommandId = function ()
{
    var fcommandDoc = document.currentScript.ownerDocument;
    return fcommandDoc.querySelector("head meta[name=guid]").content;
}   // Factotum.getFcommandId


/**
 * Run the given Fcommand function.  You call this to invoke your Fcommand
 * code.
 * XXX: document fcommandFunc params
 */
window.Factotum.runCommand = function (fcommandFunc)
{
    var fcommandId = window.Factotum.getFcommandId();
    var importDoc = document.currentScript.ownerDocument;
    var parameters = window.Factotum.getParameters(fcommandId);
    var internalOptions = window.Factotum.getInternalOptions(fcommandId);

    var p = new Promise(function (resolve, reject) {
        if (internalOptions.debug)
            debugger;

        // Call the Fcommand
        fcommandFunc(parameters, importDoc, resolve, reject);
    });

    p.then(function (bgData) {
        var data = {
            fcommandId: fcommandId,
            data: bgData,
            internalOptions: internalOptions
        };
        window.postMessage(data, "*");
    }).catch(function (error) {
        // If a thrown Error, its details will not be preserved when passed
        // to the background context, so pull out the stack and use it
        // as the error string.
        var response = {
            fcommandId: fcommandId,
            error: (error instanceof Error) ?  error.stack : error,
        };

        window.postMessage(response, "*");

        if (error instanceof Error)
            throw error;
    });
}   // Factotum.runCommand

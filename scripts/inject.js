"use strict";

/**
 * Define the Factotum API available to all Fcommands within a page.
 */

window.Factotum = { };

/**
 * Available to be called from with page-context Fcommand code.  It returns
 * the minimist options hash of the parsed Fcommand command line.
 */
window.Factotum.getParameters = function ()
{
    // XXX: how do we know which Fcommand to look for?  Since there can only
    // be one per page at a time (that's not strictly true, because async
    // processing may mean delayed removal of the import doc).  That reminds
    // me that Fcommand code has to call an API function in order to remove
    // the import doc.
    // Actually, we can use a Promise, although it means you have to call a
    // particular resolver function to indicate you're done.  This also
    // can provide a means of reporting errors in Fcommands (they can call
    // reject).  Does this matter?  Since Fcommands in page context now just
    // run, they're just like loading a regular import, so is extra handling
    // really necessary?  It is if you want to surface Fcommand errors via
    // the extension rather than just in the JS console.  However, all of
    // this means a Factotum API must be called to invoke the Fcommand
    // function.  Maybe that's not a bad idea.
}   // Factotum.getParameters


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
    var parameters = window.Factotum.getParameters();

    var p = new Promise(function (resolve, reject) {
        if (parameters.internalOptions.debug)
            debugger;

        // Call the Fcommand
        fcommandFunc(parameters, importDoc, resolve, reject);
    });

    p.then(function (bgData) {
        var data = {
            fcommandId: fcommandId,
            data: bgData
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

'use strict';

var ContentScript = {};


/**
 * Helper to append a node to the document's <head>
 * Exists primarily to simplify testing by giving a known function to mock.
 */
ContentScript.appendNodeToDocumentHead = function (node)
{
    document.head.appendChild(node);
}   // ContentScript.appendNodeToDocumentHead


ContentScript.doCleanup = function (opts)
{
    opts.linkElement.remove();
}   // ContentScript.doCleanup


// Each promise ultimately fulfills to an object so that necessary state can
// be passed to other promises.  The object can contain:
//      request: the request object as passed from the background page
//      linkElement:  the HTMLLinkElement that specifies the import doc
//      error:  Error object (only present if a promise has been rejected)


/**
 * Return a Promise to load the import document specified in request.
 * @param {Object} obj - Input/output data.
 * @param {Document} document - Document to be the parent of the import doc.
 * @returns {Promise} - promise to load the import document
 *
 * obj => {
 *      // data from the background page
 *      request => {
 *          // the HTML string to use as the import document for the Fcommand
 *          documentString: String,
 *
 *          // minimist parsed object containing Fcommand cmdline data
 *          cmdline: Object,
 *
 *          // Fcommand GUID
 *          guid: String,
 *
 *          // internal options (like --debug, --help, etc.)
 *          internalOptions: Object,
 *      },
 *      // document to receive the import
 *      document:  HTMLDocument,
 * }
 */
ContentScript.getLoadImportPromise = function (obj)
{
    return new Promise(function (resolve, reject) {
        obj.linkElement = Util.createImportLink(obj.document, obj.request);

        obj.linkElement.onload = function onload() {
            resolve(obj);
            URL.revokeObjectURL(obj.linkElement.href);
        };

        obj.linkElement.onerror = function onerror(evt) {
            obj.error = Error(evt.statusText);
            reject(obj);
            URL.revokeObjectURL(obj.linkElement.href);
        };

        ContentScript.appendNodeToDocumentHead(obj.linkElement);
    });     // new Promise
}   // ContentScript.getLoadImportPromise


/** Return a function that calls the response function with the data in the
 * promise chain so far and propagates the resolved object.  It should be
 * called for both success and failure.
 * @param {Object} request - @see ContentScript.getLoadImportPromise.  Must
 *      contain at least the 'cmdline' property.
 * @param {Object} responseFunc - To be called to signify the Fcommand has completed.
 * @return {Function} Resolve/reject function suitable for use in the
 * promise chain.
 */
ContentScript.getResponseFuncCaller = function (request, responseFunc)
{
    return function (resolvedWith) {
        responseFunc({
                error: resolvedWith.error,
            });

        return resolvedWith;
    };
}   // getResponseFuncCaller


// Define a connection listener that executes Fcommand code passed from
// Factotum.  If an exception occurs while executing the Fcommand, the error
// message is returned to Factotum.
ContentScript.factotumListener = function (request, sender, responseFunc)
{
    var callResponseFunc =
        ContentScript.getResponseFuncCaller(request, responseFunc);

    ContentScript.getLoadImportPromise({ request: request, document: document }).
        then(callResponseFunc, callResponseFunc).
        then(ContentScript.doCleanup, ContentScript.doCleanup);

    return false;
}   // ContentScript.factotumListener


// Define a listener for messages posted from the content's window.
// Fcommands whose code runs in the "page" context use this to communicate
// back to the extension.
ContentScript.messageListener = function (evt)
{
    if (!("guid" in evt.data))
        return;

    console.log("Received message: ", arguments);
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

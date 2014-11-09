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
    URL.revokeObjectURL(opts.linkElement.href);
    opts.linkElement.remove();
}   // ContentScript.doCleanup


// Each promise ultimately fulfills to an object so that necessary state can
// be passed to other promises.  The object can contain:
//      request: the request object as passed from the background page
//      linkElement:  the HTMLLinkElement that specifies the import doc
//      error:  Error object (only present if a promise has been rejected)
//      bgCodeString: code string to be sent back to the background page for
//                    evaluation.  It is expected to be returned by the
//                    Fcommand.


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
 *          // or, the URL to use as the import document
 *          documentURL: URL,
 *
 *          // minimist parsed object containing Fcommand cmdline data
 *          cmdline: Object,
 *
 *          // Fcommand code string
 *          codeString: String,
 *      },
 *      // document to receive the import
 *      document:  HTMLDocument,
 * }
 */
ContentScript.getLoadImportPromise = function (obj)
{
    return new Promise(function (resolve, reject) {
        obj.linkElement = Util.createImportLink(obj.document,
            "XXXFcommandID", obj.request);

        obj.linkElement.onload = function onload() {
            resolve(obj);
        };

        obj.linkElement.onerror = function onerror(evt) {
            obj.error = Error(evt.statusText);
            reject(obj);
        };

        ContentScript.appendNodeToDocumentHead(obj.linkElement);
    });     // new Promise
}   // ContentScript.getLoadImportPromise


/**
 * Return a promise to run Fcommand code and resolve with the promise's
 * resolved-with object containing a code string to be passed to the
 * background page.
 * @param {Object} resolvedWith - Object the import promise was fulfilled with.  Expected to contain:
 *      request:  {Object} - @see ContentScript.getLoadImportPromise
 *      linkElement:  {HTMLLinkElement} - @see ContentScript.getLoadImportPromise
 * @returns {Promise} - promise to run the Fcommand code.  The promise will
 *      be resolved with the resolvedWith object, which will have an
 *      additional key bgCodeString that contains the code string to be
 *      passed to the background page for evaluation.
 */
ContentScript.getFcommandRunPromise = function (resolvedWith)
{
    var code = new Function(resolvedWith.request.codeString);
    var p = new Promise(function (resolve, reject) {
        code(resolvedWith.linkElement.import, resolve);
    });

    return p.then(function (bgCodeString) {
        resolvedWith.bgCodeString = bgCodeString;
        return resolvedWith;
    }).catch(function (error) {
        resolvedWith.error = error;
        throw resolvedWith;
    });
}   // ContentScript.getFcommandRunPromise


// Define a connection listener that executes Fcommand code passed from
// Factotum.  If an exception occurs while executing the Fcommand, the error
// message is returned to Factotum.
//
ContentScript.factotumListener = function (request, sender, responseFunc)
{
    var callResponseFunc = function (opts) {
        responseFunc(opts);
        return opts;
    };

    getLoadImportPromise({ request: request, document: document }).
        then(getFcommandPromiseToRun).
        then(callResponseFunc, callResponseFunc).
        then(doCleanup, doCleanup);

    // Indicate that we will be calling responseFunc() asynchronously.
    return true;
}   // ContentScript.factotumListener

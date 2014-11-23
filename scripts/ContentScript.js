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
//      bgCodeArray: function object and arguments to be stringified and
//          sent back to the background page for evaluation.  It is expected
//          to be passed to the response callback that was given to the
//          Fcommand.


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
    // XXX:  documentString and documentURL (which I'll probably drop)
    // should be optional, because it may just be the Fcommand needs to run
    // code and has no need for an import document.
    // This would be an optimization, since the way the system works is by
    // importing the Fcommand document.  If, however, the author decides
    // there is nothing needed from the import and just wants to eval the
    // Fcommand JS, there should be a setting per fcommand that avoids
    // importing the doc and just runs the JS.  Similar in spirit to
    // allowing a bg-only Fcommand.
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
 *      additional key bgCodeArray (see above).
 */
ContentScript.getFcommandRunPromise = function (resolvedWith)
{
    var code = new Function(resolvedWith.request.codeString);
    var p = new Promise(function (resolve, reject) {
        code({
            importDocument: resolvedWith.linkElement.import,
            cmdline: resolvedWith.request.cmdline,
            responseCallback: resolve,
        });
    });

    return p.then(function (bgCodeArray) {
        if (typeof(bgCodeArray) !== "undefined")
            if (!Util.isArray(bgCodeArray))
                throw Error("responseCallback's first argument must be undefined or an array");

        resolvedWith.bgCodeArray = bgCodeArray;
        return resolvedWith;
    }).catch(function (error) {
        // If a thrown Error, its details will not be preserved when passed
        // to the background context, so pull out the stack and use it
        // as the error string.
        if (error instanceof Error)
            resolvedWith.error = error.stack;
        else
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
    // XXX XXX: should be able to handle the case where the callback isn't
    // called and then call it implicitly after the Fcommand has
    // executed, just in case the user forgets to do so.
    var callResponseFunc = function (resolvedWith) {
        // Only include what is needed by the background page to ensure we
        // don't inadvertently create a circular reference.
        responseFunc({
                bgCodeString: Util.getCodeString(resolvedWith.bgCodeArray,
                                  { debug: request.cmdline.debug === "bg" }),
                error: resolvedWith.error,
            });
        return resolvedWith;
    };

    ContentScript.getLoadImportPromise({ request: request, document: document }).
        then(ContentScript.getFcommandRunPromise).
        then(callResponseFunc, callResponseFunc).
        then(ContentScript.doCleanup, ContentScript.doCleanup);

    // Indicate that we will be calling responseFunc() asynchronously.
    return true;
}   // ContentScript.factotumListener

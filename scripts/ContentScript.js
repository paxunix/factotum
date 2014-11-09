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
    var link = opts.linkElement.remove();
    URL.revokeObjectURL(link.href);
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
 * Return a promise to fun Fcommand code.
 * @param {Object} resolvedWith - Object the import promise was fulfilled with.
 * @returns {Promise} - promise to run the Fcommand code
 */
ContentScript.getFcommandRunPromise = function (resolvedWith)
{
    return new Promise(function (resolve, reject) {
        try {
            var code = new Function(resolvedWith.request.codeString);
            resolvedWith.bgCodeString = code(resolvedWith.linkElement.import);
            // XXX: should support asynchrous code return, which means this
            // code has to call a function passed in and the return from
            // that function is used as the bgCodeString.
            resolve(resolvedWith);
        }

        catch (e)
        {
            resolvedWith.error = e;
            reject(resolvedWith);
        }
    });
}   // ContentScript.getFcommandRunPromise


/**
 * Returns a promise that calls the response function to communicate back to
 * the background script.
 */
ContentScript.getResponsePromise = function (resolvedWith)
{
    return new Promise(function (resolve, reject) {
        var code = new Function(resolvedWith.request.codeString);
        resolvedWith.bgCodeString = code(opts.linkElement.import);
        resolve(resolvedWith);
    });
}   // ContentScript.getResponsePromise


// Define a connection listener that executes Fcommand code passed from
// Factotum.  If an exception occurs while executing the Fcommand, the error
// message is returned to Factotum.
//
ContentScript.factotumListener = function (request, sender, responseFunc)
{
    var response = {
        // Save a deep copy of the request data
        // XXX:  this will have issues if some of the values in the object
        // are Dates, Functions, etc.  Since we have complete control over
        // this since it's passed from the bg script, this should not be an
        // issue.
        request: JSON.parse(JSON.stringify(request)),
    };

    var callResponseFunc = function (opts) {
        responseFunc();
        return opts;
    };

    getLoadImportPromise({ request: request, document: document, responseFuncXXX: responseFunc }).
        then(getFcommandPromiseToRun).
        then(callResponseFunc).
        catch(function failure(opts) {
            opts.error = error
            responseFunc({ error: error });
        }).
        then(doCleanup);

    // Indicate that we will be calling responseFunc() asynchronously.
    return true;
}   // ContentScript.factotumListener

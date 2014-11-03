/**
 * Helper to append a node to the document's <head>
 * Exists primarily to simplify testing by giving a known function to mock.
 */
function appendNodeToDocumentHead(node)
{
    document.head.appendChild(node);
}   // appendNodeToDocumentHead


// Define a connection listener that executes Fcommand code passed from
// Factotum.  If an exception occurs while executing the Fcommand, the error
// message is returned to Factotum.
//
// request => {
//      // the HTML string to use as the import document for the Fcommand
//      documentString: String,
//
//      // or, the URL to use as the import document
//      documentURL: URL,
//
//      // the guid of the fcommand
//      fcommandId: String,
//
//      // minimist opts parsed object containing parameters for the Fcommand
//      opts: Object,
// }
function factotumListener(request, sender, responseFunc)
{
    var response = {
        // Save a deep copy of the request data
        // XXX:  this will have issues if some of the values in the object
        // are Dates, Functions, etc.  Since we have complete control over
        // this since it's passed from the bg script, this should not be an
        // issue.
        request: JSON.parse(JSON.stringify(request)),
    };

    try {
        // Add the import link for the Fcommand's document to the page
        // XXX: while the import mechanism won't include the same resource
        // multiple times, there is no reason to add the import more than
        // once (an Fcommand may be used many times on a single page).
        if (!("fcommandId" in request))
            throw Error("'fcommandId' is required");

        var opts = {};
        if ("documentString" in request)
            opts = { documentString: request.documentString };
        else if ("documentURL" in request)
            opts = { documentURL: request.documentURL };
        else
            throw Error("'documentString' or 'documentURL' is required");

        var link = Util.createImportLink(document,
            Util.getFcommandImportId(request.fcommandId),
            opts);

        link.onload = function (evt) {
            // XXX: the Fcommand is executed in here
            console.log("import onload:", evt);
            responseFunc(response);
        };

        link.onerror = function (evt) {
            console.log("import onerror:", evt);
            response.exception = "XXX: error loading import document";
            responseFunc(response);
        };

        appendNodeToDocumentHead(link);
    }

    catch (e)
    {
        // The exception from the page can't be passed back to the extension
        // (it shows up as an empty object), so copy the data out of it.
        // XXX:  this poorly handles non-object exceptions (e.g. throw 42)
        //response.errorData = {
            //message: e.message,
            //stack: e.stack,
        //};
        response.exception = e.stack;
        responseFunc(response);
    }   // catch

    // DO NOT call responseFunc() here (it was called if there was a problem
    // setting up the import, or after the import loaded, or if the import
    // failed).  Calling it here would send back an immediate response to
    // the background page, which is undesirable.

    // Indicate that we may be calling responseFunc() asynchronously (from
    // when the import succeeds/fails).
    return true;
}   // factotumListener

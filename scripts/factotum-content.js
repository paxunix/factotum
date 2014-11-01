// XXX: refactor this into a script that is loaded as another content script
// and also by the background page, since it will be used for both.
var id2BlobUrlCache = {};
getStringBlobUrl = function (id, content, mimeType)
{
    if (!(id in id2BlobUrlCache))
    {
        var blob = new Blob([content], { type: mimeType });
        id2BlobUrlCache[id] = URL.createObjectURL(blob);
    }

    return id2BlobUrlCache[id];
}   // getStringBlobUrl


// Define a connection listener that executes Fcommand code passed from
// Factotum.  If an exception occurs while executing the Fcommand, the error
// message is returned to Factotum.
// Variables prefixed with '_' are intended for internal use only.
//
// _request => {
//      // the URL to use as the import document for the Fcommand
//      document: String,
//
//      // minimist opts parsed object containing parameters for the Fcommand
//      opts: Object,
// }
//
//
// XXX: using some tricks to remove them from the user code's scope would be
// fancier and better.
function factotumListener(_request, _sender, _responseFunc)
{
    var _response = {
        // Save a copy of the request data
        request: JSON.parse(JSON.stringify(_request)),
    };

    try {
        // Add the import link for the Fcommand's document to the page
        // XXX: while the import mechanism won't include the same resource
        // multiple times, there is no reason to add the import more than
        // once (an Fcommand may be used many times on a single page).
        if (_request.document)
        {
            var url = getStringBlobUrl("XXXID", _request.document, "text/html");
            var link = document.createElement("link");
            link.rel = "import";
            link.href = url;
            //link.onload = function(e) {...};
            //link.onerror = function(e) {...};
            document.head.appendChild(link);
        }
    }

    catch (e)
    {
        // The exception from the page can't be passed back to the extension, so
        // copy the data out of it.
        // XXX:  this poorly handles non-object exceptions (e.g. throw 42)
        //_response.errorData = {
            //message: e.message,
            //stack: e.stack,
        //};
        _response.exception = e;
    }   // catch

    _responseFunc(_response);
}   // factotumListener


chrome.extension.onRequest.addListener(factotumListener);

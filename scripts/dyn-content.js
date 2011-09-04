// This code is dynamically injected into the current page the first time an
// Fcommand is invoked.

// Define a connection listener that executes Fcommand code passed from
// Factotum.  If an exception occurs while executing the Fcommand, the error
// message is returned to Factotum.
function factotumListener(request, sender, responseFunc)
{
    var response = {
        cmdlineObj: request.cmdlineObj,
    };

    try {
        // The Fcommand code is wrapped in eval so any errors from its parsing
        // are caught by this try/catch as well as any exceptions it throws.
        eval(request.codeString);
    }

    catch (e)
    {
        // The exception from the page can't be passed back to the extension, so
        // copy the data out of it.
        response.errorData = {
            message: e.message,
            stack: e.stack,
        };
    }   // catch

    responseFunc(response);
}   // factotumListener


chrome.extension.onRequest.addListener(factotumListener);

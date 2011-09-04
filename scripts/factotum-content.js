// Define a connection listener that executes Fcommand code passed from
// Factotum.  If an exception occurs while executing the Fcommand, the error
// message is returned to Factotum.
// Variables prefixed with '_' are intended for internal use only.
// XXX: using some tricks to remove them from the user code's scope would be
// fancier and better.
// XXX:  this code should be responsible for loading prerequisite scripts and
// CSS, otherwise Factotum has to keep track of whether or not it has been done
// for this page already.
// XXX:  should restrict requests to only be executed if sent by Factotum.
function factotumListener(_request, _sender, _responseFunc)
{
    var cmdlineObj = _request.cmdlineObj;
    var _response = {
        // XXX:  should deep-copy this in case the Fcommand code changes the
        // cmdline data that was passed in.
        cmdlineObj: _request.cmdlineObj,
    };

    try {
        // The Fcommand code is wrapped in eval so any errors from its parsing
        // are caught by this try/catch as well as any exceptions it throws.

        // XXX:  Needs to be wrapped in an anonymous function so if the user
        // code calls return, it's not this function that is returning (or we'd
        // fail to call the response function).
        eval(_request.codeString);
    }

    catch (e)
    {
        // The exception from the page can't be passed back to the extension, so
        // copy the data out of it.
        _response.errorData = {
            message: e.message,
            stack: e.stack,
        };
    }   // catch

    _responseFunc(_response);
}   // factotumListener


chrome.extension.onRequest.addListener(factotumListener);

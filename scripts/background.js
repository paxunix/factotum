// Function: listener
//      Listen for requests from other extensions.
//
// Parameters:
//      request - data request object.  Possible requests:
//          register: {     - registers the sending extension as a handler
//                            for the commands in commandList.
//              commandList:  array of commands
//              optionSpec:  option specification (see GetOpt.getOptions)
//                  for the commands
//              }
function listener(request, sender, sendResponse)
{
    var response = {
        success: false,
        error: "Unrecognized request."
    };

    if (request.register)
    {
        // Need to catch all exceptions so an error due to bad data from a
        // request doesn't kill us.
        try {

        if (!jQuery.isArray(request.register.factotumCommands))
        {
            throw("request.register.factotumCommands must be an array.");
        }

        response = { success: true };

        }   // try

        catch (e)
        {
            response.error = e;
        }
    }

    sendResponse(response);
}  // listener

chrome.extension.onRequestExternal.addListener(listener);
chrome.extension.onRequest.addListener(listener);       // for testing

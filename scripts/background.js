var Factotum = {};

// Hash of command names to arrays of metadata for those commands.  Arrays
// are used because the same command may be registered by multiple
// extensions.
Factotum.commands = {};


// Primarily useful as a function during testing.
Factotum.clear = function()
{
    Factotum.commands = {};
};  // Factotum.clear


// Function: listener
//      Listen for requests from other extensions.
//
// Parameters:
//      request - data request object.  Possible requests:
//          register: {     - registers the sending extension as a handler
//                            for the commands in commandList.
//              factotumCommands:  array of command names
//              optionSpec:  option specification (see GetOpt.getOptions)
//                  for the commands
//              }
Factotum.listener = function(request, sender, sendResponse)
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

        if (request.register.optionSpec &&
            !jQuery.isPlainObject(request.register.optionSpec))
        {
            throw("request.register.optionSpec must be an Object.");
        }

        jQuery.each(request.register.factotumCommands, function (n, cmdName)
        {
            // XXX:  should return an error if the command was already
            // registered by the same extension.

            // Command metadata is stored in an array since a single command
            // may be registered by more than one extension.
            Factotum.commands[cmdName] =
                (Factotum.commands[cmdName] || []).concat([{
                    optspec:  request.register.optionSpec || {},
                    extensionId:  sender.id
                }]);
        });

        response = { success: true };

        }   // try

        catch (e)
        {
            response.error = e;
        }
    }

    sendResponse(response);
};  // Factotum.listener


chrome.extension.onRequestExternal.addListener(Factotum.listener);
chrome.extension.onRequest.addListener(Factotum.listener);       // for testing

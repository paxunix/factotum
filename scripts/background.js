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
//              shortDesc: show this description in the omnibox for these
//                  commands
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

        if (typeof(request.register.shortDesc) !== "string")
        {
            throw("request.register.shortDesc must be a string.");
        }

        jQuery.each(request.register.factotumCommands, function (n, cmdName)
        {
            // If the sender extension has already registered this command,
            // respond with error.
            if (jQuery.grep(Factotum.commands[cmdName] || [], function(el, n) {
                    return el.extensionId === sender.id;
                }).length != 0)
            {
                throw("Extension " + sender.id + " has already registered command '" + cmdName + "'.");
            }

            // Command metadata is stored in an array since a single command
            // may be registered by more than one extension.
            Factotum.commands[cmdName] =
                (Factotum.commands[cmdName] || []).concat([{
                    optspec:  request.register.optionSpec || {},
                    extensionId:  sender.id,
                    shortDesc: request.register.shortDesc
                }]);
        });

        response = { success: true };

        }   // try

        catch (e)
        {
            response.error = e;
        }
    }   // if request.register

    sendResponse(response);
};  // Factotum.listener


chrome.extension.onRequestExternal.addListener(Factotum.listener);
chrome.extension.onRequest.addListener(Factotum.listener);       // for testing

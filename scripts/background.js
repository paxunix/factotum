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
            // All command names are stored in lowercase to facilitate
            // case-insensitive comparison.
            cmdName = cmdName.toLowerCase();

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


// Function: omniboxOnInputEntered
//      Handles requests when an Omnibox input has been entered.
//
// Parameters:
//      text:  string entered by user in Omnibox
Factotum.omniboxOnInputEntered = function(text)
{
    // Check if the first word is a known F-command.
    var argv = GetOpt.shellWordSplit(text);

    if (argv.length < 1)
        return;

    var cmd = argv.shift();
    if (!(cmd in Factotum.commands))
    {
        // XXX: should user receive indication?
        console.debug("Unknown F-command: " + cmd);
        return;
    }

    var cmdline = GetOpt.getOptions(Factotum.commands[cmd].optspec, argv);

    // Dispatch command by request to the extension that handles it.
    chrome.extension.sendRequest(
        Factotum.commands[cmd].extensionId,
        { commandLine: cmdline },
        function (response) {
            if (typeof(response) !== "undefined" &&
                !response.success)
            {
                // XXX: what to do if we got back failure???
                console.debug("F-command request returned failure.");
            }
        }
    );
};  // Factotum.omniboxOnInputEntered 


// Listeners for communicating with self (primarily for testing) and other
// extensions.
chrome.extension.onRequestExternal.addListener(Factotum.listener);
chrome.extension.onRequest.addListener(Factotum.listener);

// Register Omnibox listeners.
chrome.experimental.omnibox.
    onInputEntered.addListener(Factotum.omniboxOnInputEntered);

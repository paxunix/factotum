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


// Register the given command.
// Throws an error string if there is any problem.
Factotum.registerCommand = function(cmdData, senderId)
{
    if (!jQuery.isArray(cmdData.factotumCommands))
    {
        throw("factotumCommands must be an array.");
    }

    if (cmdData.optionSpec &&
        !jQuery.isPlainObject(cmdData.optionSpec))
    {
        throw("optionSpec must be an Object.");
    }

    if (typeof(cmdData.shortDesc) !== "string")
    {
        throw("shortDesc must be a string.");
    }

    jQuery.each(cmdData.factotumCommands, function (n, cmdName)
    {
        // All command names are stored in lowercase to facilitate
        // case-insensitive comparison.
        cmdName = cmdName.toLowerCase();

        // If the sender extension has already registered this command,
        // respond with error.
        if (jQuery.grep(Factotum.commands[cmdName] || [], function(el, n) {
                return el.extensionId === senderId;
            }).length != 0)
        {
            throw("Extension " + senderId + " has already registered command '" + cmdName + "'.");
        }

        // Command metadata is stored in an array since a single command
        // may be registered by more than one extension.
        Factotum.commands[cmdName] =
            (Factotum.commands[cmdName] || []).concat([{
                optspec:  cmdData.optionSpec || {},
                extensionId:  senderId,
                shortDesc: cmdData.shortDesc
            }]);
    });
};  // Factotum.registerCommand 


// Function: listener
//      Listen for requests from this or other extensions.
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
//          command: {  - this is a request to execute this command
//              name:   lowercased command name (always a non-empty string)
//              opts:   hash of options to their values
//              argv:   shell-split list of "command line" words
//          }
Factotum.listener = function(request, sender, sendResponse)
{
    var response = {
        success: false,
    };

    // Need to catch all exceptions so an error due to bad data from a
    // request doesn't kill us.
    try {

    if (request.register)
    {
        Factotum.registerCommand(request.register, sender.id);
    }   // if request.register
    else
    // Handle internal Factotum F-commands.
    if (request.command)
    {
        console.debug("request: ", request);
    }
    else
    {
        throw("Unrecognized request.");
    }

    response = { success: true };

    }   // try

    catch (e)
    {
        response.error = e;
    }

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
        {
            command: cmd,
            opts: cmdline.opts,
            argv: cmdline.argv
        },
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

var Factotum = {};

// We need to know our extension ID so we can dispatch internal F-Commands
// directly, rather than through sendRequest (which does not work if the
// listener and sender are within the same file).
Factotum.extensionId = chrome.extension.getURL().match(/:\/\/([^\/]+)/)[1];

// Hash of command names to arrays of metadata for those commands.  Arrays
// are used because the same command may be registered by multiple
// extensions.
Factotum.commands = {};


// Internal commands are called directly.
Factotum.internalCmd2Func = {
    help: function(command, opts, argv) {
              console.debug("XXX: 'help' called; command: ", command,
                            "opts:", opts, "argv:", argv);
          },
};


// Primarily useful as a function during testing.
Factotum.clear = function()
{
    Factotum.commands = {};
    Factotum.registerInternalCommands();
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


// Given an F-command string, dispatch it to the approriate command.  If the
// command is internal, it will be called directly.  Otherwise, a request is
// sent to the extension for that F-command.
Factotum.dispatchCommand = function(text)
{
    // Check if the first word is a known F-command.
    var argv = GetOpt.shellWordSplit(text);

    if (argv.length < 1)
        return;

    var cmd = argv.shift().toLowerCase();
    if (!(cmd in Factotum.commands))
    {
        // XXX:  should user be notified?
        return;
    }

    // XXX: since commands[cmd] is an array of possible commands, for now we
    // just take the first one.  We will have to check for and use the
    // active one.
    var cmdObj = Factotum.commands[cmd][0];
    var cmdlineObj = GetOpt.getOptions(cmdObj.optspec, argv);

    // If command is an internal command, dispatch directly (sendRequest
    // will do nothing because the listener and sender are in the same
    // process).  XXX: should show any feedback if command fails or that a
    // response was received?
    if (cmdObj.extensionId === Factotum.extensionId)
    {
        if (Factotum.internalCmd2Func[cmd])
            Factotum.internalCmd2Func[cmd](cmd, cmdlineObj.opts,
                                           cmdlineObj.argv);
    }
    else
    {
        // Otherwise, dispatch command by request to the extension that
        // handles it.
        chrome.extension.sendRequest(
            cmdObj.extensionId,
            {
                command: cmd,
                opts: cmdlineObj.opts,
                argv: cmdlineObj.argv
            }
        );
    }
};  // Factotum.dispatchCommand


// Register internal Factotum F-commands.
Factotum.registerInternalCommands = function()
{
    Factotum.registerCommand({
        factotumCommands: [ "HELP" ],
        shortDesc: "Factotum help"
    }, Factotum.extensionId);
};


// Listener for Omnibox entered input.
Factotum.onOmniboxInputEntered = function(text)
{
    Factotum.dispatchCommand(text);
};  // Factotum.onOmniboxInputEntered 


// Listeners for communicating with self (primarily for testing) and other
// extensions.
chrome.extension.onRequestExternal.addListener(Factotum.listener);
chrome.extension.onRequest.addListener(Factotum.listener);

// Register Omnibox listeners.
chrome.experimental.omnibox.
    onInputEntered.addListener(Factotum.onOmniboxInputEntered);

Factotum.registerInternalCommands();

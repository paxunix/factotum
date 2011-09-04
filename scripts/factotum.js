var Factotum = {};


Factotum.registerInternalCommands = function()
{
    Fcommands.set({
        names: [ "help" ],
        guid: "c274b610-4215-11e0-9207-0800200c9a66",
        description: "Factotum Help",
        execute: function () { // XXX:  temp impl
            console.log("Factotum help. document:", document, "Args:", cmdlineObj);
        }
    });
};  // Factotum.registerInternalCommands


// Listener for Omnibox input.
Factotum.onOmniboxInputEntered = function(text)
{
    Factotum.dispatch(text);
};  // Factotum.onOmniboxInputEntered


// Return an omnibox suggestion object with content string matching argv and
// a description incorporating the command name and the description
// associated with the command.
Factotum.getSuggestion = function(fcommand, argv)
{
    // If the Fcommand's description property is a function, call it with
    // the command args to get the description string to use.
    var desc = jQuery.isFunction(fcommand.description) ?
        fcommand.description(argv) :
        fcommand.description;

    return {
        content: fcommand.names[0] + " " + argv.join(" "),
        description: '<dim>Factotum:</dim> <match>' +
            fcommand.names[0] + "</match>" +
            (desc ? " <dim>(" + desc + ")</dim>" : "")
    };
}   // Factotum.getSuggestion


// Listener for Omnibox changes
Factotum.onOmniboxInputChanged = function(text, suggestFunc)
{
    // If the current tab's URL is an internal one, Fcommands won't work.  Show
    // an omnibox suggestion to indicate that.
    chrome.tabs.getSelected(null, function (tab) {


    // XXX:  it is possible for some Fcommands to run (e.g. those that can run
    // fine in the background page).  For now, disallow them all when run
    // on an internal Chrome page).
    if (tab.url.search(/^(chrome|about)/) !== -1)
    {
        chrome.omnibox.setDefaultSuggestion({
            description: '<match>Factotum commands cannot be run from Chrome pages.</match>'
        });

        return;
    }

    // At least one word is needed in command line.
    var argv = GetOpt.shellWordSplit(text);
    if (argv.length < 1)
        return;

    var cmdName = argv.shift();
    var commandList = Fcommands.getCommandsByPrefix(cmdName);
    var suggestions = [];

    jQuery.each(commandList, function (i, el) {
        suggestions.push(Factotum.getSuggestion(el, argv));
    });

    // If there is at least one suggestion, make the first one the default
    // and set the rest of them as possibilities.
    if (suggestions.length > 0)
    {
        var suggestion = suggestions.shift();

        delete suggestion.content;
        chrome.omnibox.setDefaultSuggestion(suggestion);

        suggestFunc(suggestions);
    }
    else
    {
        // If there are no suggestions, then the given prefix is an unknown
        // command.  Set the default suggestion to indicate that.
        chrome.omnibox.setDefaultSuggestion({
            description: "<dim>Factotum:</dim> '<match>" + cmdName +
                "</match>' is an unknown command."
        });
    }


    });   // chrome.tabs.getSelected
};  // Factotum.onOmniboxInputChanged


// Given a command line, figure out the Fcommand and run its function.  Once the
// function has executed, run the response callback, passing the response from
// the function.
Factotum.dispatch = function(cmdline)
{
    // At least one word is needed in command line.
    var argv = GetOpt.shellWordSplit(cmdline);
    if (argv.length < 1)
        return;

    var invokedCmdName = argv.shift();
    var commandList = Fcommands.getCommandsByPrefix(invokedCmdName);

    if (commandList.length === 0)
    {
        // XXX:  should user be notified?
        return;
    }

    // XXX: for now we just take the first one.  We will have to check for
    // and use the active one.
    var fcommandObj = commandList[0];

    // Parse the remaining words of the command line, using the Fcommand's
    // option spec if there is one.  Also include the real and invoked names of
    // the Fcommand being executed.
    var cmdlineObj = GetOpt.getOptions(fcommandObj.optSpec || {}, argv);
    cmdlineObj.commandName = {
        real: fcommandObj.names[0],
        invoked: invokedCmdName
    };

    // Ensure everything from this point happens for the current tab.
    chrome.tabs.getSelected(null, function (tab) {
        Factotum.sendScriptRequest(tab.id, fcommandObj, cmdlineObj);
    });
}   // Factotum.dispatch


// Send a request to the wrapper content script to evaluate the Fcommand code
// contained in the given request.
Factotum.sendScriptRequest = function(tabId, fcommandObj, cmdlineObj)
{
    // Build the code string to be loaded into the current page.
    // XXX: document somewhere about 'cmdlineObj' being available to the
    // function.
    var codeStr;

    // If the Fcommand's 'execute' property is a function, it'll
    // need to be invoked within the context.
    if (jQuery.isFunction(fcommandObj.execute))
    {
        codeStr = "(" + fcommandObj.execute.toString() + ")();";
    }
    else
    {
        codeStr = fcommandObj.execute;
    }

    var requestObj = {
        codeString: codeStr,
        cmdlineObj: cmdlineObj
    };

    chrome.tabs.sendRequest(tabId, requestObj, Factotum.responseHandler);
};  // Factotum.sendScriptRequest


// Called when each Fcommand has finished executing.
//   response       - the object returned from the content script.
//      .errorData  - an object containing exception data if the Fcommand failed
//                    by throwing an exception.  If no throw occurred, this
//                    property will not exist.
//          .message   - the message text of the exception.
//          .stack     - stack dump of the exception (if the exception was a
//                       builtin exception; e.g. SyntaxError, ReferenceError,
//                       etc.)  XXX:  where should we show the stack if there is
//                       one?
Factotum.responseHandler = function (response)
{
    if (response.errorData)
    {
        // XXX: Should all errors be logged?  Should store a rotated log of
        // these to help users troubleshoot problems with Fcommands?

        // XXX: consider an option to choose desktop notifications or infobars.
        // Infobars would neatly associate the error notification with the tab
        // in which the code was executed.
        var notification = webkitNotifications.createNotification(
            "icons/error.png",
            "Error in '" + response.cmdlineObj.commandName.real + "' command",
            response.errorData.message
        );

        if ('stack' in response.errorData)
        {
            console.log("Stack:", response.errorData.stack);
        }

        notification.show();

        // Remove the notification after 10 seconds.
        // XXX:  Should that period be configurable?
        setTimeout(function () {
                notification.cancel();
            }, 10000);
    }
};  // Factotum.responseHandler

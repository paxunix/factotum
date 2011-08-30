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
    Fcommands.dispatch(text);
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
};  // Factotum.onOmniboxInputChanged


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
            "Command Error",
            response.errorData.message
        );

        notification.show();

        // Remove the notification after 10 seconds.
        // XXX:  Should that period be configurable?
        setTimeout(function () {
                notification.cancel();
            }, 10000);
    }
};  // Factotum.responseHandler

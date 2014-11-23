"use strict";

var Factotum = {};

// XXX: variables in this global scope are visible to the response code
// string.

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
    return {
        content: argv.join(" "),
        description: '<match>' +
            fcommand + "</match><dim>" + argv.join(" ") + "</dim>"
    };
}   // Factotum.getSuggestion


// Listener for Omnibox changes
Factotum.onOmniboxInputChanged = function(text, suggestFunc)
{
    // If the current tab's URL is an internal one, Fcommands won't work.  Show
    // an omnibox suggestion to indicate that.
    chrome.tabs.query({ active: true }, function (tabs) {


    // XXX:  it is possible for some Fcommands to run (e.g. those that can run
    // fine in the background page).  For now, disallow them all when run
    // on an internal Chrome page).
    // XXX:  instead, only show Fcommands flagged as running from bg
    if (tabs[0].url.search(/^(chrome|about)/) !== -1)
    {
        chrome.omnibox.setDefaultSuggestion({
            description: '<match>Factotum commands cannot be run from Chrome pages.</match>'
        });

        return;
    }

    // At least one word is needed in command line.
    var argv = ShellParse.split(text);
    if (argv.length < 1)
        return;

    var cmdName = argv.shift();
    var suggestions = [ Factotum.getSuggestion(cmdName, argv) ];
    var suggestion = suggestions.shift();

    delete suggestion.content;
    chrome.omnibox.setDefaultSuggestion(suggestion);
    suggestFunc(suggestions);

    });   // chrome.tabs.query
};  // Factotum.onOmniboxInputChanged


// Given a command line, figure out the Fcommand and run its function.  Once the
// function has executed, run the response callback, passing the response from
// the function.
Factotum.dispatch = function (cmdline)
{
    var argv = ShellParse.split(cmdline);
    var minimistOpts = {
        XXX: "XXX: use optspec for fcommand",
    };

    // Augment any given optspec with options common to all Fcommands
    Util.addInternalOptions(minimistOpts);

    var opts = minimist_parseopts(argv.slice(1), minimistOpts);
    // XXX: get the Fcommand codestring from storage
    var XXX_defaultFcommand = function (data)
    {
        console.log("Default Fcommand. cmdline: ", data.cmdline); 
        data.responseCallback();
    };

    var request = {
        documentString: "XXX",  // XXX: get the Fcommand document from storage
        documentURL: "XXX",  // XXX: if an internal Fcommand, give its url
        cmdline: opts,
        codeString : Util.getCodeString([XXX_defaultFcommand],
            { debug: opts.debug === true }),
    };

    // XXX: if Fcommand is flagged bg-only, execute it right here

    // XXX: handle Fcommand's help here; it doesn't have to run in-page

    // Ensure everything from this point happens for the current tab.
    chrome.tabs.query({ active: true }, function (tabs) {
        console.log("XXX Tab:", tabs[0]);
        chrome.tabs.sendMessage(tabs[0].id, request, Factotum.responseHandler);
    });
}   // Factotum.dispatch


// Called when each Fcommand has finished/failed executing.
Factotum.responseHandler = function (response)
{
    if (chrome.runtime.lastError)
    {
        // XXX: this represents a failure in the extension and it
        // should be surfaced to the user somehow (response will be
        // undefined)
        console.log("reponse handler error:", chrome.runtime.lastError);
        return;
    }

    if ("error" in response)
    {
        console.log("error from content script:", response.error);
        return;
    }

    try
    {
        // XXX:  this is extremely dangerous, since it means user-space code
        // can execute in the background page.  This is the only way to call
        // chrome.* APIs, though, and some Fcommands will need that.
        // Avoid creating a closure (i.e. don't use eval()), so the code has
        // no access to any local variables currently in scope.
        (new Function(response.bgCodeString))();
    }

    catch (e)
    {
        // XXX: this needs to be surfaced to the user somehow
        console.log("Response code failure:", e);
    }
};  // Factotum.responseHandler

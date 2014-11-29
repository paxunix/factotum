"use strict";

var Factotum = {};

// XXX: variables in this global scope are visible to the response code
// string.

// Listener for Omnibox input.
Factotum.onOmniboxInputEntered = function(text)
{
    Factotum.dispatch(text);
};  // Factotum.onOmniboxInputEntered


// Return a omnibox suggestion object suitable for the default suggestion,
// i.e. has no content because that's determined on entry.
Factotum.getOmniboxDescription = function(opts)
{
    // XXX: detect internal options here too and modify the suggestion based
    // on them.  Or maybe we should always add e other suggestions:  one for
    // bg debug, fcommand debug, and help.  That will use up all the space
    // in the omnibox dropdown, though.  And you'll still want to support
    // --debug and --help anyway.
    // You can do the split and parse for internal options here, then
    // generate better suggestions.  And pass the parsed data instead of
    // rejoining everything.
    // XXX: detect multiple fcommands and show them
    // only show internal option suggestions once an unambiguous Fcommand is
    // known

    // Show an indicator for which internal option was entered.
    var leader = "";
    if (opts.debug === "bg")
        leader = "[Debug-bg]";
    else if (opts.debug)
        leader = "[Debug]";
    else if (opts.help)
        leader = "[Help]";

    // Command isn't known yet, so show nothing
    if (opts._.length === 0)
        opts._ = [ "" ];

    var description = leader + " <match>" + opts._[0] + "</match>" +
        "<dim>" + opts._.slice(1).join(" ") + "</dim>";

    return description;
}   // Factotum.getOmniboxDescription


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

    if (text === "")
        return;

    var argv = ShellParse.split(text);

    // Set the default omnibox suggestion based on what's entered so far.
    // To support internal options as the first word, consider the entire
    // command line.
    var internalOptions = Factotum.checkInternalOptions(argv);
    var defaultDesc = Factotum.getOmniboxDescription(internalOptions);
    chrome.omnibox.setDefaultSuggestion({ description: defaultDesc });

    // XXX: append alternate Fcommand suggestions based on first word
    //var suggestions = [{
    //}];
    //suggestFunc(suggestions);

    });   // chrome.tabs.query
};  // Factotum.onOmniboxInputChanged


// If --debug was given, it can only be "bg" or true/false.
Factotum.normalizeInternalOptions = function (opts)
{
    if ("debug" in opts)
        if (typeof(opts.debug) === "string")
            if (opts.debug === "")
                opts.debug = true;
            else if (opts.debug !== "bg")
                delete opts.debug;

    return opts;
}   // Factotum.normalizeInternalOptions


// Return a minimist-opts object that has checked for --help or --debug
// options in argv.
Factotum.checkInternalOptions = function (argv)
{
    // "debug" can be either a boolean (Fcommand debug) or a string
    // (bg-script debug).  Skip the first word, since that's the command
    // name.
    var opts = minimist_parseopts(argv, {
        string: "debug",
        boolean: [ "debug", "help" ],
    });

    return Factotum.normalizeInternalOptions(opts);
}   // Factotum.checkInternalOptions


// Given a command line, figure out the Fcommand and run its function.  Once the
// function has executed, run the response callback, passing the response from
// the function.
Factotum.dispatch = function (cmdline)
{
    var argv = ShellParse.split(cmdline);
    var minimistOpts = {
        XXX: "XXX: use optspec for fcommand",
    };

    // Internal option parsing examines the entire command line, not just
    // everything after the first word.  Then parse the args resulting from
    // that as the actualy command line.
    var internalOptions = Factotum.checkInternalOptions(argv);
    var opts = minimist_parseopts(internalOptions._, minimistOpts);

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
        internalOptions: internalOptions,
        codeString : Util.getCodeString([XXX_defaultFcommand],
            { debug: internalOptions.debug === true }),
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

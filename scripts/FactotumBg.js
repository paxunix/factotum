"use strict";

module.exports = (function() {

var ShellParse = require("./ShellParse.js");
var GetOpt = require("./GetOpt.js");
var Help = require("./Help.js");
var Fcommand = require("./Fcommand.js");

var FactotumBg = { };


// Return a omnibox suggestion object suitable for the default suggestion,
// i.e. has no content because that's determined on entry.
FactotumBg.getOmniboxDescription = function(opts) {
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
    if (opts.bgdebug)
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
};  // FactotumBg.getOmniboxDescription


// Listener for Omnibox changes
FactotumBg.onOmniboxInputChanged = function(text, suggestFunc) {
    if (text === "")
        return;

    // If the current tab's URL is an internal one, Fcommands won't work.  Show
    // an omnibox suggestion to indicate that.
    chrome.tabs.query({ active: true }, function (tabs) {

    // Set the default omnibox suggestion based on what's entered so far.
    // To support internal options as the first word, consider the entire
    // command line.
    var internalOptions = FactotumBg.parseCommandLine(text);
    var defaultDesc = FactotumBg.getOmniboxDescription(internalOptions);
    chrome.omnibox.setDefaultSuggestion({ description: defaultDesc });

    // XXX: append alternate Fcommand suggestions based on first word in
    // internalOptions._ (since that's argv without the internal options)
    var suggestions = [{
        content: "loadjquery",
        description: "Load jQuery",
    }];
    suggestFunc(suggestions);

    });   // chrome.tabs.query
};  // FactotumBg.onOmniboxInputChanged


// Return an object that has checked for help or debug options in argv.
FactotumBg.checkInternalOptions = function (argv) {
    var opts = GetOpt.getOptions({
        "debug": { type: "boolean", aliases: [ "fg-debug", "fgdebug" ] },
        "bgdebug": { type: "boolean", aliases: [ "bg-debug" ] },
        "help": { type: "boolean" },
    }, argv);

    return opts;
};  // FactotumBg.checkInternalOptions


// Given a command line, check it for internal options and return the parsed
// data.
FactotumBg.parseCommandLine = function (text) {
    var argv = ShellParse.split(text);

    // To support internal options as the first word, consider the entire
    // command line.
    return FactotumBg.checkInternalOptions(argv);
};  // FactotumBg.parseCommandLine


// Given a command line, figure out the Fcommand and run its function.  Once the
// function has executed, run the response callback, passing the response from
// the function.
FactotumBg.onOmniboxInputEntered = function (cmdline) {
    // Internal option parsing examines the entire command line, not just
    // everything after the first word.  Then parse the args resulting from
    // that as the actualy command line.
    var internalOptions = FactotumBg.parseCommandLine(cmdline);

    fcommandManager.getByPrefix(internalOptions._[0])
        .then(function (fcommands) {
            if (fcommands.length === 0)
                return;

            var fcommand = fcommands[0];

            if (internalOptions.help)
            {
                if (fcommand.extractedData.helpMarkup === null)
                {
                    // XXX: surface this to user
                    throw Error("No help available for Fcommand '" +
                        fcommand.extractedData.title + "' (" + fcommand.extractedData.guid + ").");
                }

                Help.showFcommandHelp(fcommand.extractedData.guid);
                return;
            }

            // Parse the command line
            var opts = GetOpt.getOptions(fcommand.extractedData.optspec, internalOptions._);

            // If the Fcommand is bg-only, invoke it now.
            if (fcommand.extractedData.context === "bg")
            {
                fcommand.runBgCode(undefined, opts, internalOptions);
                return;
            }

            // XXX: build this in a function so we can test it to be sure
            // the content script receives what we expect
            var request = {
                documentString: fcommand.documentString,
                title: fcommand.extractedData.title,
                guid: fcommand.extractedData.guid,
                cmdline: opts,
                internalOptions: internalOptions,
            };

            // Ensure everything from this point happens for the current tab.
            chrome.tabs.query({ active: true }, function (tabs) {
                // If the current page is internal, it can't run a "page"
                // context Fcommand.
                if (fcommand.extractedData.context !== "bg" &&
                    tabs[0].url.search(/^(chrome|about)/) !== -1)
                {
                    console.log("Fcommand '" + fcommand.extractedData.title + "' cannot run on a browser page.");
                    return;
                }

                chrome.tabs.sendMessage(tabs[0].id, request);
            });
        }).catch(function (rejectWith) {
            // XXX: surface error to user
            console.log("Failed to run Fcommand: ", rejectWith);
        });


    // XXX: some feedback if no matching Fcommand found for entered cmdline?
    // This can be done within the omnibox.
};  // FactotumBg.onOmniboxInputEntered


// Called when each Fcommand has finished/failed executing.
FactotumBg.responseHandler = function (response) {
    if (chrome.runtime.lastError)
    {
        // XXX: this represents a failure in the extension and it
        // should be surfaced to the user somehow (response will be
        // undefined)
        console.log("response handler error:", chrome.runtime.lastError);
        return;
    }

    if ("error" in response)
    {
        // XXX: should show guid and Fcommand description or something
        // (maybe the cmdline)
        console.log("error from content script:", response.error);
        return;
    }

    if (response.guid && "data" in response)
    {
        console.log("Fcommand responded:", response);

        fcommandManager.get(response.guid)
            .then(function (fcommand) {
                    fcommand.runBgCode(
                        response.data,
                        response.opts,
                        response.internalOptions
                    );
                })
            .catch(function (rej) {
                    // XXX: surface error to user
                    console.log("Fcommand bg code failed: ", rej);
                });
    }
};  // FactotumBg.responseHandler


return FactotumBg;

})();  // module.exports function

"use strict";

module.exports = (function() {

var ShellParse = require("./ShellParse.js");
var GetOpt = require("./GetOpt.js");
var Help = require("./Help.js");
var Fcommand = require("./Fcommand.js");

var FactotumBg = { };


FactotumBg.stringifyInternalOptions = function(opts) {
    return (opts.bgdebug ? "--bg-debug" :
        (opts.debug ? "--debug" :
            (opts.help ? "--help" : "")));
    // XXX: test me
}   // FactotumBg.stringifyInternalOptions


/**
 * Return an omnibox suggestion description.
 * @param {Object} cmdlineObj - command line data
 * @property cmdlineObj.title - Fcommand title for this suggestion.
 * @property cmdlineObj.text - the command line text as entered
 */
FactotumBg.getOmniboxDescription = function(cmdlineObj) {
    if (cmdlineObj.text === "")
        return "Enter a command and arguments";

    // XXX: need to escape HTML entities
    var description =
        (cmdlineObj.title !== "" ?
            "<match>" + cmdlineObj.title + "</match> " :
            "") +
        "<dim>" + cmdlineObj.text + "</dim>";

    return description;

    // XXX: test me
};  // FactotumBg.getOmniboxDescription


// Set the default description before any text is entered.
// XXX: this is currently not invoked, due to
// https://code.google.com/p/chromium/issues/detail?id=258911
FactotumBg.onOmniboxInputStarted = function() {
    var description = FactotumBg.getOmniboxDescription({
            title: "",
            text: ""
        });

    chrome.omnibox.setDefaultSuggestion({ description: description });
};  // FactotumBg.onOmniboxInputStarted


// Listener for Omnibox changes.
// If no text is yet entered:
//      - set the default suggestion to some meaningful description about
//        what to do (e.g. "Enter a command and arguments").  There
//        are no further suggestions at that point.
// After each subsequent character is entered (up to the first space):
//      - set the default suggestion to exactly what is typed (but pretty)
//      - generate a set of additional suggestions by looking up all
//        Fcommands with the prefix and presenting them in preferred order,
//        with all of the arguments given.
FactotumBg.onOmniboxInputChanged = function(text, suggestFunc) {
    // Default suggestion is always the exact command line as entered so
    // far.
    var description = FactotumBg.getOmniboxDescription({
            title: "Run Fcommand:",
            text: text
        });

    chrome.omnibox.setDefaultSuggestion({ description: description });

    // Parse the command line to extract any internal options that may be
    // given and find the first word (the Fcommand keyword).
    var internalOptions = FactotumBg.parseCommandLine(text);

    // If no command, generate no further suggestions.
    if (internalOptions._.length === 0)
        return;

    // Create alternate suggestions based on Fcommands whose keywords match
    // the given Fcommand name so far.  By keeping the default suggestion to
    // be exactly what was typed, we can dispatch to Fcommands whose full
    // name is a prefix of another Fcommand's longer name (e.g. 'jq' versus
    // 'jqtest').
    fcommandManager.getByPrefix(internalOptions._[0])
        .then(function (fcommands) {
                var suggestions = [];
                var internalOptionString =
                    FactotumBg.stringifyInternalOptions(internalOptions);

                // Build up list of suggestions for matched Fcommands.
                // Substitute the primary keyword in place of the prefix so
                // far and preserve the rest of the command line.
                fcommands.forEach(function (fcommand) {
                    // Prepend a space to the suggestion so that Chrome
                    // doesn't think it's the same as the default suggestion
                    // and remove it from the omnibox as you type extra
                    // non-space characters.  This seems like a bug.
                    var cmdline = " " +
                        fcommand.extractedData.keywords[0] + " " +
                        (internalOptionString !== "" ?
                            internalOptionString + " " :
                            "") +
                        internalOptions._.slice(1).join(" ");

                    // XXX:  this does not ensure that when the command is
                    // entered, the proper Fcommand will be invoked
                    // (because this query will be re-run and will take the
                    // first cmd matching the prefix, which may not be the
                    // one that was selected).  Need to include the guid on
                    // the command line for the suggested ones.  Could do it
                    // with a generic fcommand "launcher" that takes an
                    // internal option of guid
                    suggestions.push({
                        description: FactotumBg.getOmniboxDescription({
                                text: cmdline,
                                title: fcommand.extractedData.title
                            }),
                        content: cmdline,
                    });
                });

                suggestFunc(suggestions);
            })
        .catch(function (rej) {
                // XXX: surface to user
                console.log("Failed to retrieve Fcommands for '" + internalOptions._[0] + "': ", rej);
            });
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
            // XXX: need to include the parameter passed to this script so
            // that the Fcommand can know if current/new foreground/new
            // background tab action was used to enter the command.
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

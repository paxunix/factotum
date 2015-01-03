"use strict";

module.exports = (function() {

var ShellParse = require("./ShellParse.js");
var GetOpt = require("./GetOpt.js");
var Help = require("./Help.js");
var Fcommand = require("./Fcommand.js");

var FactotumBg = { };

var FCOMMAND_GUID_DELIM = "--guid=";

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
FactotumBg.onOmniboxInputChanged = function(text, suggestFunc) {
    // Parse the command line to extract any internal options that may be
    // given and find the first word (the Fcommand keyword).
    var internalOptions = FactotumBg.parseCommandLine(text);

    // If no command, take the default description (something was entered,
    // but there's no Fcommand word yet).
    if (internalOptions._.length === 0)
    {
        var description = FactotumBg.getOmniboxDescription({
                title: "",
                text: text
            });

        chrome.omnibox.setDefaultSuggestion({ description: description });
        return;
    }

    // The default suggestion always has the exact command line as entered
    // so far.
    var description = FactotumBg.getOmniboxDescription({
            title: "Run Fcommand: ",
            text: text
        });

    chrome.omnibox.setDefaultSuggestion({
        description: description
    });

    // Create a suggestions using the first Fcommand whose keywords match
    // the given Fcommand name prefix so far.  The default suggestion is
    // always exactly what is entered.
    fcommandManager.getByPrefix(internalOptions._[0])
        .then(function (fcommands) {
                var suggestions = [];
                var internalOptionString =
                    FactotumBg.stringifyInternalOptions(internalOptions);

                // Build up list of suggestions for matched Fcommands.
                // Substitute the primary keyword in place of the prefix so
                // far and preserve the rest of the command line.
                fcommands.forEach(function (fcommand) {
                    // Append the guid of each Fcommand in the suggestion's
                    // content.  This is needed because Chrome will suppress
                    // omnibox entries if their content is the same as that
                    // of an existing entry.  The guid is the only way to be
                    // sure each entry is unique (since you could have the
                    // same keyword used in multiple Fcommands).  This guid
                    // suffix will be stripped off prior to dispatch.  It
                    // looks ugly, but augmenting the content is the only
                    // way to both pass this information and distinguish
                    // between "identical" omnibox entries.
                    // This augmentation can break things (e.g. if a guid
                    // has '--guid--' in it), but that's just something we
                    // have to put up with for now.  Note that we do NOT
                    // process the --guid as an internal option (because it
                    // is appended to whatever the user has entered, they
                    // may have typed "--", which stop option parsing, thus
                    // the --guid would appear as a regular argument and be
                    // skipped by the option parser).
                    var cmdline =
                        fcommand.extractedData.keywords[0] + " " +
                        (internalOptionString !== "" ?
                            internalOptionString + " " :
                            "") +
                        internalOptions._.slice(1).join(" ") +
                        "  " + FCOMMAND_GUID_DELIM +
                        fcommand.extractedData.guid;

                    suggestions.push({
                        description: FactotumBg.getOmniboxDescription({
                                text: cmdline,
                                title: "Run '" + fcommand.extractedData.title + "':"
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


// Given a command line, figure out the Fcommand and run its function.
FactotumBg.onOmniboxInputEntered = function (cmdline) {
    // Strip off the guid inserted for the omnibox suggestion.  If it
    // exists, use it to dispatch directly to the proper Fcommand;
    // otherwise, query for the first Fcommand with a keyword equal to the
    // given prefix.
    var guidFromCmdline = null;
    var extraDataIndex = cmdline.lastIndexOf(FCOMMAND_GUID_DELIM);

    if (extraDataIndex !== -1)
    {
        guidFromCmdline = cmdline.substr(extraDataIndex + FCOMMAND_GUID_DELIM.length);
        // Rewrite command line without the extra data
        cmdline = cmdline.substr(0, extraDataIndex - 1);
    }

    // Internal option parsing examines the entire command line, not just
    // everything after the first word.  Then parse the args resulting from
    // that as the actualy command line.
    var internalOptions = FactotumBg.parseCommandLine(cmdline);

    var lookupPromise = guidFromCmdline !== null ?
        fcommandManager.getByGuid(guidFromCmdline).then(function (res) {
                // Make sure an array is returned
                return res === undefined ? [] : [ res ]
            }) :
        fcommandManager.getByKeyword(internalOptions._[0]);

    lookupPromise.then(function (fcommands) {
            if (fcommands.length === 0)
            {
                // XXX: surface to user
                console.log("No matching Fcommand found.");
                return;
            }

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

        fcommandManager.getByGuid(response.guid)
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

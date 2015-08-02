"use strict";

module.exports = (function() {

var ShellParse = require("./ShellParse.js");
var GetOpt = require("./GetOpt.js");
var Help = require("./Help.js");
var Fcommand = require("./Fcommand.js");
var TransferObject = require("./TransferObject.js");

var FactotumBg = { };

var FCOMMAND_GUID_DELIM = "--guid=";

FactotumBg.stringifyInternalOptions = function(opts) {
    var ret = [];

    if (opts.bgdebug) ret.push("--bg-debug");
    if (opts.debug) ret.push("--debug");
    if (opts.help) ret.push("--help");

    return ret.join(" ");
}   // FactotumBg.stringifyInternalOptions


FactotumBg.replaceHtmlEntities = function(s) {
    return s.replace(/[<>&'"]/gm, function(i) {
            return "&#" + i.charCodeAt(0) + ";";
        });
}   // FactotumBg.replaceHtmlEntities


/**
 * Return an omnibox suggestion.
 * @param {String} title - Fcommand title for this suggestion
 * @param {Object} opts - parsed command line object (as returned by
 * GetOpt.getOptions().
 */
FactotumBg.getOmniboxSuggestion = function(title, opts) {
    var suggestion = {};

    if (opts === undefined || opts._ === undefined || opts._.length === 0)
    {
        suggestion.description = "Enter a command and arguments";
        suggestion.content = "";
        return suggestion;
    }

    // Reconstruct the command line, without the keyword.  The order won't
    // be identical to what was typed, but that's okay.
    var optsClone = JSON.parse(JSON.stringify(opts));
    var cmdline = FactotumBg.reconstructCmdline(optsClone);
    var keyword = optsClone._.shift();
    var description = [];

    if (title !== undefined && title !== null && title !== "")
        description.push("<url>" + FactotumBg.replaceHtmlEntities(title) + "</url>");

    if (keyword.length)
        description.push("<match>" + FactotumBg.replaceHtmlEntities(keyword) + "</match>");

    if (cmdline.noKeyword !== "")
        description.push("<dim>" + FactotumBg.replaceHtmlEntities(cmdline.noKeyword) + "</dim>");

    suggestion.description = description.join(" ");
    suggestion.content = cmdline.withKeyword;

    return suggestion;
};  // FactotumBg.getOmniboxSuggestion


/**
 * Return a suitable reconstruction of the commandline, given a parsed
 * option object.  It won't perfectly match the original, but it will have
 * all the pieces in the right places so that reparsing it would yield the
 * same results.
 * @param {Object} opts - Parsed command line options object.
 * @return {Object} Contains the reconstructed command line, with and
 * without the keyword (since one is needed for descriptions and the other
 * needed for dispatching).
 *      {
 *          noKeyword: {String},
 *          withKeyword: {String}
 *      }
 */
FactotumBg.reconstructCmdline = function(opts)
{
    var ret = { };

    opts = opts || {};
    opts._ = opts._ || [];

    // Clone args array and extract the keyword
    var keyword = opts._.concat([]).shift();
    var cmdline = [
        keyword
    ];

    // Append internal options
    if (opts.bgdebug) cmdline.push("--bg-debug");
    if (opts.debug) cmdline.push("--debug");
    if (opts.help) cmdline.push("--help");

    // Append remainder of arguments
    cmdline = cmdline.concat(opts._.slice(1));

    ret.withKeyword = cmdline.join(" ");
    ret.noKeyword = cmdline.slice(1).join(" ");

    return ret;
};  // FactotumBg.reconstructCmdline


// Set the default description before any text is entered.
// XXX: this is currently not invoked, due to
// https://code.google.com/p/chromium/issues/detail?id=258911
FactotumBg.onOmniboxInputStarted = function() {
    var suggestion = FactotumBg.getOmniboxSuggestion("", {});
    delete suggestion.content;
    chrome.omnibox.setDefaultSuggestion(suggestion);
};  // FactotumBg.onOmniboxInputStarted


// Listener for Omnibox changes.
FactotumBg.onOmniboxInputChanged = function(text, suggestFunc) {
    // Parse the command line to extract any internal options that may be
    // given and find the first word (the Fcommand keyword).
    var internalOptions = FactotumBg.parseCommandLine(text);

    // If no command, take the default description (something was entered,
    // but there's no Fcommand word yet).  Otherwise, the default suggestion
    // always has the exact command line as entered so far.
    var suggestion = FactotumBg.getOmniboxSuggestion(
        internalOptions._.length === 0 ? "" : "Run Fcommand:",
        internalOptions);
    delete suggestion.content;
    chrome.omnibox.setDefaultSuggestion(suggestion);

    // Create a suggestions using the first Fcommand whose keywords match
    // the given Fcommand name prefix so far.  The default suggestion is
    // always exactly what is entered.
    fcommandManager.getByPrefix(internalOptions._[0])
        .then(function (fcommands) {
                var suggestions = [];

                // Build up list of suggestions for matched Fcommands.
                // Substitute the primary keyword in place of the prefix so
                // far and preserve the rest of the command line.
                fcommands.forEach(function (fcommand) {
                    // Append the guid of each Fcommand to the suggestion's
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
                    // has '--guid=' in it), but that's just something we
                    // have to put up with for now.  Note that we do NOT
                    // process the --guid when parsing internal options
                    // because it is appended to whatever the user has
                    // entered.  Since they may have typed "--" (which stops
                    // option parsing) --guid would appear as a regular
                    // argument and be skipped by the option parser.
                    var suggestion = FactotumBg.getOmniboxSuggestion(
                            "Run '" + fcommand.extractedData.title + "':",
                            internalOptions
                        );
                    suggestion.content += " " + FCOMMAND_GUID_DELIM +
                        fcommand.extractedData.guid;

                    suggestions.push(suggestion);
                });

                suggestFunc(suggestions);
            })
        .catch(function (rej) {
                // XXX: surface to user
                console.log("Failed to retrieve Fcommands for '" + internalOptions._[0] + "': ", rej);
            });
};  // FactotumBg.onOmniboxInputChanged


// Return an object that has parsed for help or debug options in argv.
FactotumBg.parseInternalOptions = function (argv) {
    var opts = GetOpt.getOptions({
        "debug": { type: "boolean", aliases: [ "fg-debug", "fgdebug" ] },
        "bgdebug": { type: "boolean", aliases: [ "bg-debug" ] },
        "help": { type: "boolean" },
    }, argv);

    return opts;
};  // FactotumBg.parseInternalOptions


// Given a command line, check it for internal options and return the parsed
// data.
FactotumBg.parseCommandLine = function (text) {
    var argv = ShellParse.split(text);

    // To support internal options as the first word, consider the entire
    // command line.
    return FactotumBg.parseInternalOptions(argv);
};  // FactotumBg.parseCommandLine


// Given a command line, figure out the Fcommand and run its function.
FactotumBg.onOmniboxInputEntered = function (cmdline, tabDisposition) {
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

            var requestData = fcommand
                .getContentScriptRequestData(new TransferObject()
                    .setCmdlineOptions(opts)
                    .setInternalCmdlineOptions(internalOptions)
                    .setTabDisposition(tabDisposition)
                );

            // Dispatching the Fcommand requires we know the current tab.
            // We don't care about tab disposition here:  if a new tab was
            // requested, we can't easily tell when the Factotum content
            // script has been loaded within it, after which this code
            // dispatches the Fcommand to it.  It's easier (for now, at
            // least), to just invoke the Fcommand based on the current tab
            // and pass the tab disposition to the Fcommand to be used
            // appropriately.
            chrome.tabs.query({ active: true }, function (tabs) {
                // Include current tab info in request
                requestData.setCurrentTab(tabs[0]);

                // If the current page is internal, it can't run a "page"
                // context Fcommand.
                // XXX: may need some about: urls here too
                if (tabs[0].url.search(/^chrome/) !== -1)
                {
                    console.log("Fcommand '" + requestData.getTitle() + "' cannot run on a browser page.");
                    return;
                }

                chrome.tabs.sendMessage(tabs[0].id, requestData);
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
    // XXX:  shouldn't response be a TransferObject????
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
                        // XXX: this should take an object of the same form
                        // as passed to the content script
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

"use strict";


import ShellParse from "./ShellParse.js";
import GetOpt from "./GetOpt.js";
import TransferObject from "./TransferObject.js";

let FCOMMAND_GUID_DELIM = "--guid=";


class FactotumBg
{


static stringifyInternalOptions(opts) {
    var ret = [];

    if (opts.bgdebug) ret.push("--bg-debug");
    if (opts.debug) ret.push("--debug");
    if (opts.help) ret.push("--help");

    return ret.join(" ");
}   // FactotumBg.stringifyInternalOptions


static replaceHtmlEntities(s) {
    return s.replace(/[<>&'"]/gm, function(i) {
            return `&#${i.charCodeAt(0)};`;
        });
}   // FactotumBg.replaceHtmlEntities


/**
 * Return an omnibox suggestion.
 * @param {String} title - Fcommand title for this suggestion
 * @param {Object} opts - parsed command line object (as returned by
 * GetOpt.getOptions().
 */
static getOmniboxSuggestion(title, opts) {
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
        description.push(`<url>${FactotumBg.replaceHtmlEntities(title)}</url>`);

    if (keyword.length)
        description.push(`<match>${FactotumBg.replaceHtmlEntities(keyword)}</match>`);

    if (cmdline.noKeyword !== "")
        description.push(`<dim>${FactotumBg.replaceHtmlEntities(cmdline.noKeyword)}</dim>`);

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
static reconstructCmdline(opts)
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
static onOmniboxInputStarted() {
    var suggestion = FactotumBg.getOmniboxSuggestion("", {});
    delete suggestion.content;
    browser.omnibox.setDefaultSuggestion(suggestion);
};  // FactotumBg.onOmniboxInputStarted


// Listener for Omnibox changes.
static onOmniboxInputChanged(text, suggestFunc) {
    // Parse the command line to extract any internal options that may be
    // given and find the first word (the Fcommand keyword).
    var internalOptions = FactotumBg.parseCommandLine(text);

    // If the user removes all text from the omnibox after the trigger word,
    // the command line array will be empty and lookups will fail.  So, do
    // nothing.
    if (internalOptions._.length === 0)
        return;

    // Create a suggestions using the first Fcommand whose keywords match
    // the given Fcommand name prefix so far.
    let prefix = internalOptions._[0];
    g_fcommandManager.getByPrefix(prefix)
        .then(function (fcommands) {
                var suggestions = [];

                // If the given prefix yields no Fcommands, feedback to the
                // user via the default suggestion (which does nothing).
                if (fcommands.length === 0)
                {
                    browser.omnibox.setDefaultSuggestion({
                        description: `Unknown Fcommand keyword prefix '${prefix}'...`
                    });

                    return;
                }

                // Otherwise, set the default suggestion to be the first
                // Fcommand that matched (this must be the same logic as in
                // FactotumBg.onOmniboxInputEntered).
                var suggestion = FactotumBg.getOmniboxSuggestion(
                        `Run '${fcommands[0].extractedData.title}':`,
                        internalOptions
                    );
                delete suggestion.content;
                browser.omnibox.setDefaultSuggestion(suggestion);

                // Since the default suggestion takes care of the first
                // Fcommand, there is no need to duplicate it again in the
                // remainder of the suggestions.
                fcommands.shift();

                // Build up list of suggestions for remaining matched
                // Fcommands.  Substitute the primary keyword in place of
                // the prefix so far and preserve the rest of the command
                // line.
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
                            `Run '${fcommand.extractedData.title}':`,
                            internalOptions
                        );
                    suggestion.content += " " + FCOMMAND_GUID_DELIM +
                        fcommand.extractedData.guid;

                    suggestions.push(suggestion);
                });

                suggestFunc(suggestions);
        }).catch(error => {
            g_fcommandManager.getErrorManager().save(error, `Failed to retrieve Fcommands for prefix '${prefix}'`);
        });
};  // FactotumBg.onOmniboxInputChanged


// Return an object that has parsed for help or debug options in argv.
static parseInternalOptions(argv) {
    var opts = GetOpt.getOptions({
        "debug": { type: "boolean", aliases: [ "fg-debug", "fgdebug", "debugfg", "debug-fg" ] },
        "bgdebug": { type: "boolean", aliases: [ "bg-debug", "debug-bg", "debugbg" ] },
        "help": { type: "boolean" },
    }, argv);

    return opts;
};  // FactotumBg.parseInternalOptions


// Given a command line, check it for internal options and return the parsed
// data.
static parseCommandLine(text) {
    var argv = ShellParse.split(text);

    // To support internal options as the first word, consider the entire
    // command line.
    return FactotumBg.parseInternalOptions(argv);
};  // FactotumBg.parseCommandLine


// Given a command line, figure out the Fcommand and run its function.
static onOmniboxInputEntered(cmdline, tabDisposition) {
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
    // that as the actual command line.
    var internalOptions = FactotumBg.parseCommandLine(cmdline);

    var transferObj = TransferObject.build()
        .set("_content_internalCmdlineOptions", internalOptions)
        .setTabDisposition(tabDisposition);

    let prefix = internalOptions._[0];
    var p_lookupFcommand = guidFromCmdline !== null ?
        g_fcommandManager.getByGuid(guidFromCmdline).then(function (fcommand) {
                return fcommand === undefined ? [] : [ fcommand ]
            }) :
        g_fcommandManager.getByPrefix(prefix);

    let p_gotFcommand = p_lookupFcommand.then(function (fcommands) {
            if (fcommands.length === 0)
            {
                throw new Error(`No matching Fcommand found for prefix '${prefix}'`);
            }

            return fcommands[0];
        });

    p_gotFcommand.then(fcommand => {
        if (internalOptions.help)
        {
            return fcommand.popupHelpWindow();
        }

        // Not requesting help, so execute command
        transferObj.setCommandLine(
            GetOpt.getOptions(fcommand.extractedData.optspec,
                internalOptions._)
        );

        return fcommand.execute(transferObj)
            .catch(error => {
                g_fcommandManager.getErrorManager().save(error, `Failed to execute Fcommand '${fcommand.extractedData.title}'`);
            });
    }).catch(error => {
        g_fcommandManager.getErrorManager().save(error);
    });
    // XXX: this really needs to be rewritten to be testable
};  // FactotumBg.onOmniboxInputEntered


// Called when each Fcommand has finished/failed executing.
static responseHandler(response, sender) {
    if (sender.id !== chrome.runtime.id)
        return Promise.resolve();

    var transferObj = TransferObject.deserialize(response);
    // XXX: there is probably other data in sender we should check.  Like
    // verify the message came from our content script.
    // XXX: not sure that this useful since this is just using data sent to
    // us after the Fcommand has completed.
    // transferObj.setCurrentTab(sender.tabs.Tab);

    if (transferObj.has("_bg_errorMessage"))
    {
        // XXX: should show guid and Fcommand description or something
        // (maybe the cmdline).  Would have to include that in the
        // transferobject.  Otherwise  you can't clearly know which Fcommand
        // returned the error.
        return g_fcommandManager.getErrorManager().save(transferObj.get("_bg_errorMessage"));
    }

    if (transferObj.has("_content_guid") && transferObj.hasBgData())
    {
        console.log("Fcommand responded:", transferObj);

        return g_fcommandManager.getByGuid(transferObj.get("_content_guid"))
            .then(function (fcommand) {
                    return fcommand.runBgCode(transferObj)
                })
            .catch(error => {
                    g_fcommandManager.getErrorManager().save(error, "Fcommand bg code failed");
                });
    }

    return Promise.resolve();
};  // FactotumBg.responseHandler


}   // class FactotumBg


export default FactotumBg;

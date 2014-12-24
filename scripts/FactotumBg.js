"use strict";

module.exports = (function() {

var ShellParse = require("./ShellParse.js");
var GetOpt = require("./GetOpt.js");
var Help = require("./Help.js");

var FactotumBg = { };

// XXX: variables in this global scope are visible to the response code
// string.

// Listener for Omnibox input.
FactotumBg.onOmniboxInputEntered = function(text) {

    FactotumBg.dispatch(text);
};  // FactotumBg.onOmniboxInputEntered


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
            description: "<match>Factotum commands cannot be run from Chrome pages.</match>"
        });

        return;
    }

    if (text === "")
        return;

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
        "debug": { type: "boolean", aliases: [ "fg-debug" ] },
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
FactotumBg.dispatch = function (cmdline) {
    // Internal option parsing examines the entire command line, not just
    // everything after the first word.  Then parse the args resulting from
    // that as the actualy command line.
    var internalOptions = FactotumBg.parseCommandLine(cmdline);

    // XXX: test code only
    for (var guid in FactotumBg.XXXcommandCache)
    {
        try {
            var fcommand = FactotumBg.XXXcommandCache[guid];
            if (fcommand.metadata.keywords.indexOf(internalOptions._[0]) === -1)
                continue;

            if (internalOptions.help)
            {
                if (fcommand.helpMarkup === null)
                    throw Error("No help available for Fcommand '" +
                        fcommand.metadata.description + "' (" + guid + ").");

                Help.showFcommandHelp(guid);
                break;
            }

            // Parse the command line
            var opts = GetOpt.getOptions(fcommand.optspec, internalOptions._);

            // If the Fcommand is bg-only, invoke it now.
            if (fcommand.metadata.context === "bg")
            {
                // Set up a fake response and invoke the bg code as though
                // the response were sent from the content script.
                var fcommandDoc = Fcommand._parseDomFromString(fcommand.documentString);
                FactotumBg.runBgCode({
                    guid: guid,
                    internalOptions: internalOptions,
                    data: {
                        document: fcommandDoc,
                        cmdline: opts,
                    }
                });

                break;
            }

            var request = {
                documentString: fcommand.documentString,
                description: fcommand.metadata.description,
                guid: fcommand.metadata.guid,
                cmdline: opts,
                internalOptions: internalOptions,
            };

            // Ensure everything from this point happens for the current tab.
            chrome.tabs.query({ active: true }, function (tabs) {
                console.log("XXX Tab:", tabs[0]);
                chrome.tabs.sendMessage(tabs[0].id, request);
            });
        }

        catch (e) {
            // XXX: surface error to user
            console.log("Fcommand error: ", e);
        }
    }

    // XXX: some feedback if no matching Fcommand found for entered cmdline?
    // This can be done within the omnibox.
};  // FactotumBg.dispatch


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
        // XXX: using the guid in the response, load the bg code for the
        // Fcommand and run it.
        console.log("Fcommand responded:", response);
        FactotumBg.runBgCode(response);
    }
};  // FactotumBg.responseHandler


// Retrieve the bg code for the Fcommand and run it with the given data.
FactotumBg.runBgCode = function (response) {
    if (!(response.guid in FactotumBg.XXXcommandCache))
        return;

    try {
        // Create function that runs the bg code.  If bg-debugging was
        // requested, insert a debugger statement so that the user will drop
        // into the debugger within their recognizable code (note that Dev
        // Tools must be open for Factotum's background page for this to
        // work, since that's the context in which the code is being run).
        var bgFunction = new Function("data",
            (response.internalOptions.bgdebug ? "debugger;\n" : "") +
                FactotumBg.XXXcommandCache[response.guid].bgCodeString);

        // Run the Fcommand's bgCode
        bgFunction(response.data);
    }

    catch (e) {
        // XXX:  surface error to user
        console.log("Fcommand '" + response.guid + "' error: ", e);
    }

    // XXX: test me
};  // FactotumBg.runBgCode


// XXX:  this is for testing only.  Preload an Fcommand so we can invoke it.
FactotumBg.XXXcommandCache = { };      // for testing only

var Util = require("./Util.js");
var Fcommand = require("./Fcommand.js");

var fetchThese = [
    Util.fetchDocument(chrome.runtime.getURL("example/load-jquery.html")),
    Util.fetchDocument(chrome.runtime.getURL("example/bgtest.html")),
];

fetchThese.forEach(function (p) {
    p.then(function resolvedWith(event) {
        var fcommand = new Fcommand(event.target.responseText, navigator.language);
        FactotumBg.XXXcommandCache[fcommand.metadata.guid] = fcommand;
    }).
    catch(function rejectedWith(data) {
        console.log("Fcommand load failure:", data);
        chrome.notifications.create(
            "",
            {
                type: "basic",
                iconUrl: chrome.runtime.getURL("icons/md/error.png"),
                title: "Error loading Fcommand",
                message: data.message,
                // XXX: showing the stack is useless inside a tiny
                // notification.  Show the message and maybe a button
                // for more details, that pops a window that shows the
                // stack.
                // Should record all failures so you can view errors from
                // the extension menu?  Kind of like a JS console.
            },
            function() {}
        );
    });
});


// XXX: until FcommandManager(?) exists, want this accessible so other views
// can access it
window.FactotumBg = FactotumBg;

return FactotumBg;

})();  // module.exports function

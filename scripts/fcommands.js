// Storage and manipulation of F-commands.


var Fcommands = {
    FcommandStorageKey: "FcommandData",
    guid2Command: { },
};


// Install the given Fcommand.
// commandData is a hash of
//      names:  array of names used to execute command.
//      guid:  identifier to be used for this command.
//      description:  optional string or function to describe what this
//          command does.  If not given, a default string will be used.  If
//          a function, it is called when the description is needed and
//          should return a string (receives the argv for the command, no
//          command name).  This is used to generate the text that appears
//          in the omnibox when this command is entered.
//      optSpec: optional command line parse object specification
//      execute:  string or text representation of code to run for this
//          command.
//      icon: optional URL for a favicon-type icon for this command.
//      help: optional string containing HTML markup 'help text' for this
//          function.
//      scriptUrls: optional array containing URLs for scripts to be
//          injected into the page prior to this command's execution.
Fcommands.set = function(commandData)
{
    if (!jQuery.isPlainObject(commandData))
        throw("commandData must be an object.");

    if (!('guid' in commandData))
        throw("commandData.guid is required.");

    if (typeof(commandData.guid) !== "string")
        throw("commandData.guid must be a string.");

    if (!('names' in commandData))
        throw("commandData.names is required.");

    if (!jQuery.isArray(commandData.names))
        throw("commandData.names must be an array.");

    if (!('execute' in commandData))
        throw("commandData.execute is required.");

    if (typeof(commandData.execute) !== "string" &&
        !jQuery.isFunction(commandData.execute))
            throw("commandData.execute must be a string or a function.");

    if ('description' in commandData)
    {
        if (typeof(commandData.description) !== 'string' &&
            !jQuery.isFunction(commandData.description))
            throw("commandData.description must be a string or a function.");
    }
    else
        commandData.description = "XXX: default description";

    if ('icon' in commandData && typeof(commandData.icon) !== 'string')
        throw("commandData.icon must be a string.");
    // XXX:  need default favicon???

    if ('optSpec' in commandData &&
        !jQuery.isPlainObject(commandData.optSpec))
        throw("commandData.optSpec must be an object.");

    if ('help' in commandData && typeof(commandData.help) !== "string")
        throw("commandData.help must be a string.");

    if ('scriptUrls' in commandData)
    {
        if (!jQuery.isArray(commandData.scriptUrls))
            throw("commandData.scriptUrls must be an array.");

        // Each script URL needs to be a string.
        for (var i = 0; i < commandData.scriptUrls.length; ++i)
            if (typeof(commandData.scriptUrls[i]) !== 'string')
                throw("commandData.scriptUrls[" + i + "] is not a string.");
    }

    // XXX:  check for the unlikely possibility that you are overwriting an
    // existing Fcommand with this guid?
    Fcommands.guid2Command[commandData.guid] = commandData;
    Fcommands.persist();
}   // Fcommands.set


// Return array of Fcommand objects whose command names begin with the
// prefix.  The array is ordered lexicographically by matching command name.
Fcommands.getCommandsByPrefix = function (prefix)
{
    var commandList = [];

    // Loop through each Fcommand's aliases and save the Fcommands with any
    // alias that case-insensitively matches /^prefix/.
    jQuery.each(Fcommands.guid2Command, function (guid, fcmd) {
        jQuery.each(fcmd.names, function (i, name) {
            if (name.toLowerCase().indexOf(prefix.toLowerCase()) == 0)
            {
                commandList.push({name: name, command: fcmd});

                // This Fcommand matches, no need to check the rest of its
                // aliases.
                return false;
            }
        });
    });

    commandList.sort(function (a, b) {
        return a.name.localeCompare(b.name);
    });

    return jQuery.map(commandList, function (el, i) {
        return el.command;
    });
}   // Fcommands.getCommandsByPrefix


// Given a command line, figure out the Fcommand and run its function.
Fcommands.dispatch = function(cmdline)
{
    // At least one word is needed in command line.
    var argv = GetOpt.shellWordSplit(cmdline);
    if (argv.length < 1)
        return;

    var cmdName = argv.shift();
    var commandList = Fcommands.getCommandsByPrefix(cmdName);

    if (commandList.length === 0)
    {
        // XXX:  should user be notified?
        return;
    }

    // XXX: for now we just take the first one.  We will have to check for
    // and use the active one.
    var fcommand = commandList[0];

    // Parse the remaining words of the command line, using the Fcommand's
    // option spec if there is one.
    var cmdlineObj = GetOpt.getOptions(fcommand.optSpec || {}, argv);

    // Inject any required prerequisite scripts and CSS into the page and
    // then inject the Fcommand to execute so it all runs within the page
    // context.
    // XXX: need to insert CSS also
    // XXX:  this means Factotum commands won't work if the current tab is a
    // chrome: URL.

    // Each load chains to the prior one so we know all loads are finished
    // before the Fcommand script is chained to the final load.
    var scriptUrls = fcommand.scriptUrls || [];
    function scriptLoader(index)
    {
        if (index >= scriptUrls.length)
        {
            // Establish a context in which the Fcommand will be executed.
            // Stringify the function and inject it into the page.
            // XXX:  document somewhere about 'cmdlineObj' being available
            // to the function.

            var codeBlock = [
                "(function (cmdlineObj) { ",
            ];

            // If the Fcommand's 'execute' property is a function, it'll
            // need to be invoked within the context.
            if (jQuery.isFunction(fcommand.execute))
            {
                codeBlock.push("(", fcommand.execute.toString(), ")();");
            }
            else
            {
                codeBlock.push(fcommand.execute);
            }

            codeBlock.push("}(", JSON.stringify(cmdlineObj), "))");

            chrome.tabs.executeScript(null, { code: codeBlock.join("") },
                  function() { console.log("callback args: ", arguments); });
            return;
        }

        chrome.tabs.executeScript(null,
            { file: scriptUrls[index] },
            function() { scriptLoader(index + 1); });
    }

    scriptLoader(0);
}   // Fcommands.dispatch


// Delete a single Fcommand by guid.
Fcommands.delete = function (guid)
{
    delete Fcommands.guid2Command[guid];
    Fcommands.persist();
}   // Fcommands.delete


// Delete all Fcommands.
Fcommands.deleteAll = function ()
{
    Fcommands.guid2Command = { };
    Fcommands.persist();
}   // Fcommands.deleteAll


// Save all Fcommands.
Fcommands.persist = function()
{
    // Since JSON won't stringify functions, any Fcommand properties that
    // are functions must be converted to a string before storage.  We also
    // persist which properties were converted so that we can turn the
    // strings back into functions only if they were not strings to begin
    // with (this matters for the description property, which can be a
    // string or a function).

    var guid2CommandCopy = jQuery.extend(true, {}, Fcommands.guid2Command);
    jQuery.each(guid2CommandCopy, function (guid, fcommand) {
        jQuery.each(fcommand, function (k, v) {
            if (jQuery.isFunction(v))
            {
                fcommand[k] = v.toString();
                fcommand["_converted_" + k] = 1;
            }
        });
    });

    localStorage.setItem(Fcommands.FcommandStorageKey,
        JSON.stringify(guid2CommandCopy));
}   // Fcommands.persist


// Load persisted Fcommands and return an object representing them.
Fcommands.load = function()
{
    var guid2Command = JSON.parse(
        localStorage.getItem(Fcommands.FcommandStorageKey) || "{}"
    );

    jQuery.each(guid2Command, function (guid, fcommand) {
        jQuery.each(fcommand, function (k, v) {
            // If the property was one we converted (see Fcommands.persist),
            // turn the string back into a function.
            if (("_converted_" + k) in fcommand)
            {
                delete fcommand["_converted_" + k];
                fcommand[k] = eval("(" + v + ")");
            }
        });
    });

    return guid2Command;
}   // Fcommands.load

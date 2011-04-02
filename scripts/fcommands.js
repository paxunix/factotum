// Storage and manipulation of F-commands.


var Fcommands = {
    guid2Command: { }
};


// Install the given Fcommand.
// commandData is a hash of
//      names:  array of names used to execute command.
//      guid:  identifier to be used for this command.
//      description:  optional string or function to describe what this
//          command does.  If not given, a default string will be used.  If
//          a function, it is called when the description is needed and
//          should return a string.
//      optSpec: optional command line parse object specification
//      execute:  function to do this command's action(s)
//      icon: optional URL for a favicon-type icon for this command.
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

    if (!jQuery.isFunction(commandData.execute))
        throw("commandData.execute must be a function.");

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

    Fcommands.guid2Command[commandData.guid] = commandData;
}   // Fcommands.set


// Return array of Fcommand objects whose command names begin with the
// prefix.  The array is ordered lexicographically by matching command name.
Fcommands.getCommandsByPrefix = function (prefix)
{
    var commandList = [];
    var prefixRegex = new RegExp("^" + prefix, "i");

    // Loop through each Fcommand's aliases and save the Fcommands with any
    // alias that case-insensitively matches /^prefix/.
    jQuery.each(Fcommands.guid2Command, function (guid, fcmd) {
        jQuery.each(fcmd.names, function (i, name) {
            if (name.search(prefixRegex) != -1)
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

    // Dispatch.
    try
    {
        return fcommand.execute(cmdlineObj);
    }

    catch (e)
    {
        // XXX:  how to report error to user?
        console.log("Fcommand '" + cmdName + "' threw: " + e);
    }

    return undefined;
}   // Fcommands.dispatch


// Delete a single Fcommand by guid.
Fcommands.delete = function (guid)
{
    delete Fcommands.guid2Command[guid];
}   // Fcommands.delete


// Delete all Fcommands.
Fcommands.deleteAll = function ()
{
    Fcommands.guid2Command = { };
}   // Fcommands.deleteAll

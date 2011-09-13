// Storage and manipulation of F-commands.


var Fcommands = {
    guid2Command: { },
    onFsError: function (e) {
        // XXX:  how to best report file system error to user?
        var msg = "FileSystem error:";
        console.error(msg, e);
        throw msg + " " + e;
    },
};

// XXX: 50 MB storage for Fcommands is sufficient?
Fcommands.fileSystem = new FileSystem(50 * 1024 * 1024, Fcommands.onFsError);


// Install the given Fcommand.
// commandData is a hash of
//      names:  array of names used to execute command.
//      guid:  identifier to be used for this command.
//      description:  optional string to describe what this command does.  If
//          not given, a default string will be used.  This is used to generate
//          the text that appears in the omnibox when this command is entered.
//      optSpec: optional command line parse object specification
//      execute:  a function or text representation of code to run for this
//          command.
//      icon: optional URL for a favicon-type icon for this command.
//      help: optional string containing HTML markup 'help text' for this
//          function.
//      scriptUrls: optional array containing URLs for scripts to be
//          injected into the page prior to this command's execution.
//  XXX:  needs to take a successFn callback that is called once the Fcommand is
//  successfully saved.
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
        if (typeof(commandData.description) !== 'string')
            throw("commandData.description must be a string.");
    }
    else
        commandData.description = "No command description provided.";

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
    else
    {
        commandData.scriptUrls = [];
    }

    Fcommands.guid2Command[commandData.guid] = commandData;

    // Don't save internal Fcommands (i.e. those whose execute property is a
    // function) to storage.
    if (!jQuery.isFunction(commandData.execute))
        Fcommands.saveCommand(commandData); // XXX:  success func?
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


// Delete a single Fcommand by guid.
Fcommands.deleteCommand = function (guid, onSuccessFn)
{
    delete Fcommands.guid2Command[guid];
    Fcommands.fileSystem.removeFile(guid, onSuccessFn);
}   // Fcommands.deleteCommand


// Save the given Fcommand.
Fcommands.saveCommand = function(fcommand, onSuccessFn)
{
    // XXX:  check for the unlikely possibility that you are overwriting an
    // existing Fcommand with this guid?

    // An Fcommand is saved in a file named its guid.
    Fcommands.fileSystem.writeFile(fcommand.guid,
        JSON.stringify(fcommand), onSuccessFn);
}   // Fcommands.saveCommand


// Load saved Fcommands.
Fcommands.load = function(onDoneFn)
{
    var setCommand = function (list)
    {
        if (list.length == 0)
            onDoneFn();

        Fcommands.fileSystem.readFile(list.shift(), function (data) {
            Fcommands.set(JSON.parse(data));
            // XXX:  setCommand should probably be called in onsuccessfn passed
            // to Fcommands.set().
            setCommand(list);
        });
    };

    Fcommands.fileSystem.getFileList(function (list) {
        setCommand(list);
    });
}   // Fcommands.load

// Storage and manipulation of F-commands.


var Fcommands = { };

var guid2Command = { };


// Install the given Fcommand.
// commandData is a hash of
//      names:  array of names used to execute command.
//      guid:  identifier to be used for this command.
//      description:  optional string or function to describe what this
//          command does.  If not given, a default string will be used.  If
//          a function, it is called when the description is needed and
//          should return a string.
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
}   // Fcommands.set

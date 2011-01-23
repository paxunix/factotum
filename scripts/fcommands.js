// Storage and manipulation of F-commands.


var Fcommands = { };


// Install the given Fcommand.
// commandData is a hash of
//      name:  name used to execute command.
//      aliases: optional array of alias names for this command.
//      description:  optional string or function to describe what this
//          command does.  If not given, a default string will be used.  If
//          a function, it is called when the description is needed and
//          should return a string.
//      execute:  function to do this command's action(s)
//      icon: URL for a favicon-type icon for this command.
Fcommands.set = function(commandData)
{
    if (!jQuery.isPlainObject(commandData))
        throw("commandData must be an object.");

    if (!('name' in commandData))
        throw("commandData.name is required.");

    if (typeof(commandData.name) !== "string")
        throw("commandData.name must be a string.");

    if (!('execute' in commandData))
        throw("commandData.execute is required.");

    if (!jQuery.isFunction(commandData.execute))
        throw("commandData.execute must be a function.");

    if ('description' in commandData &&
        (typeof(commandData.description) !== 'string' &&
         !jQuery.isFunction(commandData.description)))
        throw("commandData.description must be a string or a function.");

    if ('icon' in commandData && typeof(commandData.icon) !== 'string')
        throw("commandData.icon must be a string.");
}   // Fcommands.set

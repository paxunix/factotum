// Storage and manipulation of F-commands.


var Fcommands = { };


// Install the given Fcommand.
// commandData is a hash of
//      names:  array of names used to execute command.
//      aliases: optional array of alias names for this command.
//      description:  optional string or function to describe what this
//          command does.  If not given, a default string will be used.  If
//          a function, it is called when the description is needed and
//          should return a string.
//      execute:  function to do this command's action(s)
Fcommands.set = function(commandData)
{
    if (!jQuery.isPlainObject(commandData))
        throw("commandData must be an object.");

    if (!('names' in commandData))
        throw("commandData.names is required.");

    if (!jQuery.isArray(commandData.names))
        throw("commandData.names must be an array.");

    if (commandData.names.length < 1)
        throw("commandData.names array must have at least one element.");

    if (jQuery.grep(commandData.names, function (el,n) {
            return typeof(el) !== 'string'
        }).length > 0)
        throw("commandData.names must contain strings.");

    if (!('execute' in commandData))
        throw("commandData.execute is required.");

    if (!jQuery.isFunction(commandData.execute))
        throw("commandData.execute must be a function.");

    if ('description' in commandData &&
        (typeof(commandData.description) !== 'string' &&
         !jQuery.isFunction(commandData.description)))
        throw("commandData.description must be a string or a function.");
}   // Fcommands.get

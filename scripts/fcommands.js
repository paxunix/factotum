// Storage and manipulation of F-commands.


var Fcommands = {
// Hash of
//      name:  name used to execute command
// to
//      description:  string to describe what this F-command does.  Will
//          be used in the Omnibox.
//      execute:  function to do this F-command's action(s)
};


Fcommands.set = function(commandData)
{
    if (!jQuery.isPlainObject(commandData))
        throw("commandData must be an object.");

    if (!('name' in commandData))
        throw("commandData.name is required.");

    if (!('description' in commandData))
        throw("commandData.description is required.");

    if (!('execute' in commandData))
        throw("commandData.execute is required.");
}   // Fcommands.get

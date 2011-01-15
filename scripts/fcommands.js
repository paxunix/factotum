// Storage and manipulation of F-commands.


var Fcommands = {
    // name:  name used to execute command
    // description:  string to describe what this F-command does.  Will be
    //      used in the Omnibox.
    // optionSpec:  optionSpec used to parse command line
};


Fcommands.set = function(commandData)
{
    if (!jQuery.isPlainObject(commandData))
        throw("commandData must be an object.");

    if (!('name' in commandData))
        throw("commandData.name is required.");

    if (!('description' in commandData))
        throw("commandData.description is required.");
}   // Fcommands.get

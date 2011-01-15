// Storage and manipulation of F-commands.


var Fcommands = {
    // name:  name used to execute command
    // optionSpec:  optionSpec used to parse command line
};


Fcommands.set = function(commandData)
{
    if (!jQuery.isPlainObject(commandData))
        throw("commandData must be an object.");
}   // Fcommands.get

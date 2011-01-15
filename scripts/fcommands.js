// Storage and manipulation of F-commands.


var Fcommands = {};


Fcommands.get = function(name)
{
    if (!localStorage.getItem(name))
        return null;
}   // Fcommands.get

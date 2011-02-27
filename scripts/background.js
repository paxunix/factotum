var Factotum = {};


Factotum.registerInternalCommands = function()
{
    Fcommands.set({
        names: [ "help" ],
        guid: "c274b610-4215-11e0-9207-0800200c9a66",
        description: "Factotum Help",
        execute: function(cmdobj) { // XXX
            console.log("Factotum help. Args:", cmdobj);
        }
    });
};  // Factotum.registerInternalCommands


// Listener for Omnibox input.
Factotum.onOmniboxInputEntered = function(text)
{
    Fcommands.dispatch(text);
};  // Factotum.onOmniboxInputEntered 


// Register Omnibox listener.
chrome.omnibox.onInputEntered.addListener(Factotum.onOmniboxInputEntered);

Factotum.registerInternalCommands();

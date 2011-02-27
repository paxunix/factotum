var Factotum = {};


// Listener for Omnibox input.
Factotum.onOmniboxInputEntered = function(text)
{
    Fcommands.dispatch(text);
};  // Factotum.onOmniboxInputEntered 


// Register Omnibox listener.
chrome.omnibox.onInputEntered.addListener(Factotum.onOmniboxInputEntered);

// Register Omnibox listeners.
chrome.omnibox.onInputEntered.addListener(Factotum.onOmniboxInputEntered);
chrome.omnibox.onInputChanged.addListener(Factotum.onOmniboxInputChanged);

Factotum.registerInternalCommands();

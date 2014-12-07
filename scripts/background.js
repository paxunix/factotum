"use strict";

// Register Omnibox listeners.
chrome.omnibox.onInputEntered.addListener(Factotum.onOmniboxInputEntered);
chrome.omnibox.onInputChanged.addListener(Factotum.onOmniboxInputChanged);

// Listen for messages from content script
chrome.runtime.onMessage.addListener(Factotum.responseHandler);

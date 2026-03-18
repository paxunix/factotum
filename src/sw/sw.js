import { getOmniboxSuggestions, preloadOmniboxSession } from './dispatch.js';
import {
  cancelForNavigation,
  cancelForTabClose,
  executeOmniboxInput,
  handleRuntimeControlMessage
} from './inject.js';

console.log('[factotum] service worker starting');

chrome.runtime.onInstalled.addListener(() => {
  console.log('[factotum] installed');
});

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  getOmniboxSuggestions(text)
    .then((suggestions) => suggest(suggestions))
    .catch((error) => {
      console.error('[factotum] omnibox suggestion error', error);
      suggest([]);
    });
});

chrome.omnibox.onInputStarted.addListener(() => {
  preloadOmniboxSession().catch((error) => {
    console.error('[factotum] omnibox preload error', error);
  });
});

chrome.omnibox.onInputEntered.addListener((text) => {
  executeOmniboxInput(text).catch((error) => {
    console.error('[factotum] invocation error', error);
  });
});

chrome.runtime.onMessage.addListener((message, sender) => {
  handleRuntimeControlMessage(message, sender).catch((error) => {
    console.error('[factotum] runtime control error', error);
  });
  return false;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  cancelForTabClose(tabId).catch((error) => {
    console.error('[factotum] tab close cancel error', error);
  });
});

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) {
    return;
  }

  cancelForNavigation(details.tabId).catch((error) => {
    console.error('[factotum] navigation cancel error', error);
  });
});

import { getOmniboxSuggestions, preloadOmniboxSession } from './dispatch.js';
import { serializeError } from '../shared/errors.js';
import {
  cancelForNavigation,
  cancelForTabClose,
  configureUserScriptWorld,
  executeOmniboxInput,
  handleRuntimeControlMessage,
  handleUserScriptMessage,
  handleUserScriptConnect
} from './inject.js';

console.log('[factotum] service worker starting');

chrome.runtime.onInstalled.addListener(() => {
  console.log('[factotum] installed');
  configureUserScriptWorld().catch((error) => {
    console.error('[factotum] configure user script world on install failed', error);
  });
});

configureUserScriptWorld().catch((error) => {
  console.error('[factotum] configure user script world failed', error);
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

chrome.omnibox.onInputEntered.addListener((text, disposition) => {
  executeOmniboxInput(text, { disposition }).catch((error) => {
    console.error('[factotum] invocation error', error);
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleRuntimeControlMessage(message, sender)
    .then((response) => {
      if (response !== undefined) {
        sendResponse(response);
      }
    })
    .catch((error) => {
      console.error('[factotum] runtime control error', error);
      sendResponse({
        ok: false,
        error: serializeError(error)
      });
    });
  return true;
});

chrome.runtime.onUserScriptConnect.addListener((port) => {
  handleUserScriptConnect(port);
});

chrome.runtime.onUserScriptMessage.addListener((message, sender, sendResponse) => {
  handleUserScriptMessage(message, sender)
    .then((response) => {
      if (response !== undefined) {
        sendResponse(response);
      }
    })
    .catch((error) => {
      console.error('[factotum] user script message error', error);
      sendResponse({
        ok: false,
        error: serializeError(error)
      });
    });
  return true;
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

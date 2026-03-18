import { getOmniboxSuggestions, startInvocation } from './dispatch.js';

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

chrome.omnibox.onInputEntered.addListener((text) => {
  startInvocation(text)
    .then((result) => {
      if (!result.ok) {
        console.error('[factotum] invocation failed', result.code, result.message);
        return;
      }

      console.log('[factotum] resolved invocation', {
        command: `${result.command.name}@${result.command.id}`,
        world: result.command.world,
        argvTokens: result.argvTokens,
        parsedOpts: result.parsedOpts,
        resolutionType: result.resolutionType,
        mruAt: result.mruAt
      });
    })
    .catch((error) => {
      console.error('[factotum] invocation error', error);
    });
});

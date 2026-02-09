// Service worker entrypoint (v1 skeleton)
console.log('[factotum] service worker starting');

chrome.runtime.onInstalled.addListener(() => {
  console.log('[factotum] installed');
});

chrome.omnibox.onInputEntered.addListener((text) => {
  console.log('[factotum] omnibox input', text);
  // v1 pipeline wiring comes later; this is just a stub.
});

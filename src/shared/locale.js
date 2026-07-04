export function getPreferredUiLocale() {
  return chrome.i18n.getUILanguage() || 'en-US';
}

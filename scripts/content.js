"use strict";

/**
 * Contains code that should only run via load by the extension.
 */

chrome.runtime.onMessage.addListener(ContentScript.factotumListener);
//XXX: window.addEventListener("message", ContentScript.messageListener, false);

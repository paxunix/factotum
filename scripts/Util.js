"use strict";

let browser = require("../node_modules/webextension-polyfill/dist/browser-polyfill.js");

class Util {


/**
 * Retrieve a text string from a URL.
 * @param {...} - Same parameters as accepted by the fetch API
 * @return {Promise} Resolves to the body text of the retrieval.  Rejects
 * with error about retrieval.
 */
static fetchDocument(...args)
{
    return window.fetch(...args).then(response => {
        // Response will not be ok if the request was made but failed (e.g.
        // 404), so we want to reject the promise in those cases.  Regular
        // rejections (e.g. bad protocol) will have already been rejected.
        if (!response.ok)
        {
            throw new Error(`Failed to fetch '${response.url}': ${response.status} ${response.statusText}`);
        }

        return response.text();
    });
}   // Util.fetchDocument


/**
 * Return a promise that resolves to the current tab.
 * @return {Promise} - Promise resolved with the current Tab (@see
 * chrome.runtime.tabs)
 */
static getCurrentTab()
{
    return browser.tabs.query({ active: true })
        .then(tabs => {
            // query returns an array of tabs.  We presume we only ever want
            // the first one in the list, since it should be the currently
            // active one from which the Fcommand was run.  Since the
            // omnibox API doesn't pass us the current tab, and this is
            // running in the background page, we can't know the tab without
            // looking it up.
            return tabs[0];
        });
}   // Util.getCurrentTab


/**
 * Return a promise that resolves to an existing tab for a URL (making it
 * the current active window+tab), or opens a new tab for it in the current
 * window.
 * @return {Promise} - Promise resolved with Tab (@see chrome.runtime.tabs)
 */
static async openUrlTab(url)
{
    let tabs = await browser.tabs.query({ url: url });
    if (tabs.length === 0)
        return browser.tabs.create({ url: url });

    // Bring active window with first matching tab to foreground
    await browser.windows.update(tabs[0].windowId,
        { focused: true, drawAttention: true });

    return browser.tabs.update(tabs[0].id, { active: true });
}   // Util.openUrlTab


}   // class Util


export default Util;

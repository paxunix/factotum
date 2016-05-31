"use strict";


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
    return new Promise(function (resolve, reject) {
        chrome.tabs.query({ active: true }, function (tabs) {
            resolve(tabs[0]);
        });
    });
}   // Util.getCurrentTab


}   // class Util


export default Util;

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


/**
 * Return a promise that resolves to an existing tab for a URL (making it
 * the current active window+tab), or opens a new tab for it in the current
 * window.
 * @return {Promise} - Promise resolved with Tab (@see chrome.runtime.tabs)
 */
static openUrlTab(url)
{
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ url: url }, tabs => {
            if (chrome.runtime.lastError)
                reject(chrome.runtime.lastError.message);

            if (tabs.length === 0)
            {
                chrome.tabs.create({ url: url }, tab => {
                    if (chrome.runtime.lastError)
                        reject(chrome.runtime.lastError.message);

                    resolve(tab);
                });
            }
            else
            {
                chrome.windows.update(tabs[0].windowId,
                    { focused: true, drawAttention: true },
                    wnd => {
                        if (chrome.runtime.lastError)
                            reject(chrome.runtime.lastError.message);

                        chrome.tabs.update(tabs[0].id,
                            { active: true }, tab => {
                                if (chrome.runtime.lastError)
                                    reject(chrome.runtime.lastError.message);

                                resolve(tab);
                            });
                    });
            }
        });
    });
}   // Util.openUrlTab


}   // class Util


export default Util;

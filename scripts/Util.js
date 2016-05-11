"use strict";


class Util {


/**
 * Returns a string to be used as the id on the link.import element injected
 * into the page.
 * @param {String} guid - The GUID of the Fcommand
 */
static getFcommandImportId(guid)
{
    return `fcommand-${guid}`;
}   // Util.getFcommandImportId


/**
 * Retrieve a text string from a URL.
 * @return {Promise} The results of the retrieval.
 */
static fetchDocument(url)
{
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.responseType = "text";
        xhr.onload = function (evt) {
            if (this.status == 200)
                resolve(evt);
            else
                reject(evt);
        };
        xhr.onerror = function (evt) {
            reject(evt);
        };
        xhr.onabort = function (evt) {
            reject(evt);
        };

        xhr.send();
    });
}   // Util.fetchDocument


/**
 * Create a <link> import element to be inserted in the parentDocument.
 * @param {HTMLDocument} parentDocument - The document the <link> element will be appended to
 * @param {TransferObject} transferObj - Object containing data from the bg.  Modifies TransferObject to no longer have the document string.
 * @return {HTMLLinkElement} - A <link> element.
 */
static createImportLink(parentDocument, transferObj)
{
    var blob = new Blob([transferObj.get("_content.documentString")], { type: "text/html" });
    var link = parentDocument.createElement("link");
    link.rel = "import";
    link.id = Util.getFcommandImportId(transferObj.get("_content.guid"));

    // No need to pass the document string since we already extracted it for
    // our use.
    transferObj.delete("_content.documentString");

    // Content script needs access to all the transferred data
    link.dataset.transferObj = JSON.stringify(transferObj);
    link.href = URL.createObjectURL(blob);

    return link;
}   // Util.createImportLink


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

"use strict";

module.exports = (function() {

var Util = {};

/**
 * Returns a string to be used as the id on the link.import element injected
 * into the page.
 * @param {String} guid - The GUID of the Fcommand
 */
Util.getFcommandImportId = function (guid)
{
    return `fcommand-${guid}`;
}   // Util.getFcommandImportId


/**
 * Retrieve a text string from a URL.
 * @return {Promise} The results of the retrieval.
 */
Util.fetchDocument = function (url)
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
 * @param {TransferObject} transferObj - Object containing data from the bg.  Modifies transferObject to no longer have the document string.
 * @return {HTMLLinkElement} - A <link> element.
 */
Util.createImportLink = function (parentDocument, transferObj)
{
    var blob = new Blob([transferObj.get("_content.documentString")], { type: "text/html" });
    var link = parentDocument.createElement("link");
    link.rel = "import";
    link.id = Util.getFcommandImportId(transferObj.get("_content.guid"));

    // No need to pass the document string since we already extracted it for
    // our use.
    transferObj.delete("_content.documentString");

    // Content script needs access to all the transferred data
    link.dataset.transferObject = JSON.stringify(transferObj);
    link.href = URL.createObjectURL(blob);

    return link;
}   // Util.createImportLink


/*
 * Creates an object containing data from the Fcommand document suitable
 * for storage.
 * @return {Object} Fcommand data ready for storage.
 */
Util.getStorableFcommand = function (document, lang)
{
    // XXX
}   // Util.getStorableFcommand


return Util;

})();   // module.exports

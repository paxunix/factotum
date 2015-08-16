"use strict";

module.exports = (function() {

var TransferObject = require("./TransferObject.js");

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
 * @param {TransferObject} transferObj - Object containing data from the bg.
 * @return {HTMLLinkElement} - A <link> element.
 */
Util.createImportLink = function (parentDocument, transferObj)
{
    var blob = new Blob([transferObj.get("content.documentString")], { type: "text/html" });
    var link = parentDocument.createElement("link");
    link.rel = "import";
    link.id = Util.getFcommandImportId(transferObj.get("content.guid"));
    // XXX: since this is how data is passed to the Fcommand, (probably) the
    // entire transferobject needs to be included, not just args and
    // internaloptions (don't need the document string).  This wil make it
    // easier to pass additional information if needed in the future,
    // without a breaking API change.
    link.dataset.fcommandArgs = JSON.stringify(transferObj.get("content.cmdlineOptions"));
    link.dataset.fcommandInternalOptions = JSON.stringify(transferObj.get("content.internalCmdlineOptions"));
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

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
    return "fcommand-" + guid;
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
 * @param {Object} opts - Specifies data used for the import
 * @property {String} opts.documentString - the text/html string data to import
 * @property {Object} opts.cmdline - the command line options to be made available for this Fcommand invocation
 * @property {Object} opts.internalOptions - internal-only command line options
 * @property {Object} opts.guid - the GUID for the Fcommand being imported
 * @return {HTMLLinkElement} - A <link> element.
 */
Util.createImportLink = function (parentDocument, opts)
{
    var blob = new Blob([opts.documentString], { type: "text/html" });
    var link = parentDocument.createElement("link");
    link.rel = "import";
    link.id = Util.getFcommandImportId(opts.guid);
    // XXX: should include everything in opts???  That way, adding future
    // parameters is easy.
    link.dataset.fcommandArgs = JSON.stringify(opts.cmdline);
    link.dataset.fcommandInternalOptions = JSON.stringify(opts.internalOptions);
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

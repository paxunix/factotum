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
    link.dataset.fcommandArgs = JSON.stringify(opts.cmdline);
    link.dataset.fcommandInternalOptions = JSON.stringify(opts.internalOptions);
    link.href = URL.createObjectURL(blob);

    return link;
}   // Util.createImportLink


/**
 * Convert an array of function object and list of arguments into a string
 * that invokes the function with those arguments.
 * @param {Array} args - [ functionObject, arg1, arg2, ... ].  Note that the
 *      arguments can be any value for which JSON.parse(JSON.stringify(arg))
 *      returns the original argument.  functionObject can use named
 *      arguments.
 *      If args contains only functionObject, the resulting string is
 *      constructed so that all arguments passed into the evaluated function
 *      are preserved.
 *  @param {Object} opts - options controlling the code string generation.
 *      Possible keys:
 *          debug:  Boolean - if true, "debugger" is injected at the start
 *              of the Fcommand, so the Fcommand code can more easily be
 *              debugged.  NOTE:  the user must have devtools open for the
 *              debugger statement to have any effect.
 * @return {String} Evaluatable string invoking func with arguments.
 */
Util.getCodeString = function (arr, opts)
{
    if (typeof(arr) === "undefined" || arr === null)
        return null;

    opts = opts || {};

    var code =
        (opts.debug ? 'debugger;\n' : "") +
        "return (\n" +
        arr.shift().toString() +
        "\n)";

    // append comma-separated list of JSON-ified arguments
    if (arr.length > 0)
        code += "(" + arr.map(function (el) {
                return JSON.stringify(el);
            }).join(",") + ");";
    else
        code += ".apply(this, arguments);"

    return code;
}   // Util.getCodeString


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

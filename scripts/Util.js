"use strict";


var Util = {
    supportedMetaFields: [
        "author",
        "description",
        "guid",
        "keywords",
        "downloadURL",
        "updateURL",
        "version",
        "context",
    ],
    requiredFields: [
        "author",
        "description",
        "guid",
        "keywords",
        "version",
    ],
};


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
 * Returns an object that can be passed to minimist for options parsing.
 * @param {Object} document - HTML document object specifying the Fcommand
 * @param {String} lang - extracts metadata for this BCP47 language string
 * @returns {Object} Option parsing data
 */
Util.extractOptSpec = function (document, lang)
{
    var sel = "template#minimist-opt";
    var template = Util.getFromLangSelector(document, sel, lang);
    if (!template)
        return null;

    return JSON.parse(template.content.textContent);
}   // Util.extractOptSpec


/**
 * Retrieve the Fcommand metadata.
 * @param {Object} document - HTML document object specifying the Fcommand
 * @param {String} lang - extracts metadata for this BCP47 language string
 * @returns {Object} Metadata for the Fcommand.  Fields that don't exist in
 * the document get a value of undefined.
 */
Util.extractMetadata = function (document, lang)
{
    var data = {};

    for (var el of Util.supportedMetaFields)
    {
        data[el] = (Util.getFromLangSelector(document, "head meta[name=" + el + "]", lang) || {}).content
    };

    var el = Util.getFromLangSelector(document, "head link[rel=icon]", lang);
    if (el !== null)
        data.icon = el.getAttribute("href");
    else
        data.icon = undefined;

    // Keywords is a comma- or space-delimited list of words
    if (typeof(data.keywords) !== "undefined")
    {
        data.keywords = data.keywords.
            split(/[,\s]+/).
            filter(function(el) {
                return (el !== "" && el !== " " && el !== ",")
            })
    }

    return data;
}   // Util.extractMetadata


/**
 * Validate the Fcommand metadata.
 * @param {Object} metadata - Object with metadata fields as from extractMetadata().
 * @throws {Error} On validation failure.
 */
Util.validateMetadata = function (metadata)
{
    // Required fields must be defined
    for (var f of Util.requiredFields)
    {
        if (typeof(metadata[f]) === "undefined")
            throw Error("Missing " + f);
    }

    // Verify the version is valid
    if (semver.valid(metadata.version) === null)
        throw Error("Version '" + metadata.version + "' is not semver-valid");

    if (metadata.keywords.length === 0)
        throw Error("Keyword field must have at least one keyword");
}   // Util.validateMetadata


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
 * Return one HTML object for the given selector, preferring elements with
 * the given language attribute and falling back as necessary.
 * @param {HTMLDocument} document - HTML document to search
 * @param {String} selector - document query selector
 * @param {String} lang - BCP47 language string
 */
Util.getFromLangSelector = function (document, selector, lang)
{
    var elements = document.querySelectorAll(selector);

    // List of languages in order of preference:  given language (presumably
    // from the browser), given language with no subtags, no language
    var langList = [ lang.toLowerCase(), lang.toLowerCase().split("-")[0], "" ];

    for (var l of langList)
    {
        //for (var el of elements)      XXX: won't work in Chrome yet: https://code.google.com/p/chromium/issues/detail?id=401699
        for (var i = 0; i < elements.length; ++i)
        {
            if (l === elements[i].lang.toLowerCase())
                return elements[i];
        }
    }

    return null;
}   // Util.getFromLangSelector


/**
 * Create a <link> import element to be inserted in the parentDocument.
 * @param {HTMLDocument} parentDocument - The document the <link> element will be appended to
 * @param {Object} opts - Specifies the import document as a string (options.documentString).
 * @return {HTMLLinkElement} - A <link> element.
 *
 * Reuses a prior import document if it was already specified for the given ID.
 */
Util.createImportLink = function (parentDocument, opts)
{
    var blob = new Blob([opts.documentString], { type: "text/html" });
    var link = parentDocument.createElement("link");
    link.rel = "import";
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


/** Test if thing is an array.
 * @param {anything} arr - Thing to test for array-ness.
 * @return {Boolean} True if arr is an array, otherwise false.
 */
Util.isArray = function (arr)
{
    return Object.prototype.toString.call(arr) === "[object Array]";
}   // Util.isArray


/*
 * Creates an object containing data from the Fcommand document suitable
 * for storage.
 * @return {Object} Fcommand data ready for storage.
 */
Util.getStorableFcommand = function (document, lang)
{
    // XXX
}   // Util.getStorableFcommand

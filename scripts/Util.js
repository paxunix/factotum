var Util = {};


Util.supportedMetaFields = [
    "author",
    "description",
    "guid",
    "keywords",
    "downloadURL",
    "updateURL",
    "version",
    "context"
];

Util.requiredFields = [
    "author",
    "description",
    "guid",
    "keywords",
    "version"
];


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

    // Keywords is a comma-delimited list of words with no whitespace.
    if (typeof(data.keywords) !== "undefined")
    {
        data.keywords = data.keywords.
            replace(/\s+/g, "").
            replace(/,+/g, ",").
            replace(/^,+/, "").
            replace(/,+$/, "").
            split(/,/);
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

    if (metadata.keywords[0] === "")
        throw Error("Keyword field must have at least one keyword");
}   // Util.validateMetadata


/**
 * Retrieve a document from a URL.
 * @return {Promise} The results of the retrieval.
 */
Util.fetchDocument = function (url)
{
    return Promise.resolve(jQuery.get(url));
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
 * @param {String} id - ID unique within the document
 * @param {Object} opts - Specifies the import document as a string, or URL to retrieve for the import document.  options.documentString (preferred) or options.documentURL.
 * @return {HTMLLinkElement} - A <link> element.
 *
 * Reuses a prior import document if it was already specified for the given ID.
 */
Util.createImportLink = function (parentDocument, id, opts)
{
    var link = parentDocument.createElement("link");
    link.rel = "import";
    link.id = id;

    if ("documentString" in opts)
        link.href = blobUrlCache.get(id) ||
            blobUrlCache.set(id, documentString, "text/html");
    else if ("documentURL" in opts)
        link.href = opts.documentURL;
    else
        throw Error("documentString or documentURL is required");

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

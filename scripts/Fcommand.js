"use strict";

var semver = require("node-semver/semver.js");

module.exports = (function() {


/**
 * @class Fcommand Represents a single Fcommand.
 * Note that this constructor is NOT called when Dexie instantiates an
 * Fcommand out of storage.  It is only used when initially creating an
 * Fcommand object.
 * @constructor
 * @param {String} documentString - HTML document defining an Fcommand.
 * @param {String} language - extracts metadata for this BCP47 language string
*/
function Fcommand(documentString, language) {
    this.documentString = documentString;

    this.extractedData = Fcommand._extractData(this.documentString, language);
    Fcommand._validateData(this.extractedData);

    // An Fcommand is enabled by default
    this.enabled = true;

    // And has loweset order by default
    this.order = 0;

    return this;
}   // Fcommand constructor


/**
 * Returns the language-specific string value for a given field in head.meta
 * within the Fcommand document.
 * @param {String} field - Field to retrieve
 * @param {HTMLDocument} document - The Fcommand document.
 * @param {String} lang - BCP47 language string
 * @return String The value for field, or null if it doesn't exist.  Any
 * value has leading and trailing whitespace removed.
 */
Fcommand._getMetadataFieldString = function (field, document, lang)
{
    var value = Fcommand._getSelectorContent("head meta[name='" + field + "']", document, lang);

    if (value !== null)
        value = value.replace(/^\s+/, "").replace(/\s+$/, "");

    return value;
}   // Fcommand._getMetadataFieldString


/**
 * Returns the content for a given field based on the document selector.
 * @param {String} selector - Selector (suitable for document.querySelector)
 * @param {HTMLDocument} document - The Fcommand document.
 * @param {String} lang - BCP47 language string
 * @return String The value for field, or null if it doesn't exist.
 */
Fcommand._getSelectorContent = function (selector, document, lang)
{
    var value = (Fcommand._getFromLangSelector(document, selector, lang) || {}).content;

    return (typeof(value) !== "undefined" ? value : null);
}   // Fcommand._getSelectorContent


/**
 * Build a data extractor object.  Each key knows how to retrieve the value
 * of the key field name from the Fcommand document.
 * @param {HTMLDocument} document - The Fcommand document.
 * @param {String} lang - BCP47 language string
 * @returns Object Maps Fcommand field names to objects with functions that
 * retrieve data for that field.  Each extract function takes an
 * HTMLDocument and a language string.
 */
Fcommand._getDataExtractor = function(document, lang)
{
    function getMetaFieldExtractor(field)
    {
        return function (document, lang) {
            return Fcommand._getMetadataFieldString(field, document, lang);
        };
    }

    return {
        author: getMetaFieldExtractor("author"),
        bgCodeString: Fcommand._extractBgCodeString,
        context: getMetaFieldExtractor("context"),
        description: getMetaFieldExtractor("description"),
        downloadUrl: getMetaFieldExtractor("downloadUrl"),
        guid: getMetaFieldExtractor("guid"),
        helpMarkup: Fcommand._extractHelpMarkup,
        icon: function (document, lang) {
            var icon = Fcommand._getFromLangSelector(document, "head link[rel=icon]", lang);
            if (icon !== null)
                icon = icon.getAttribute("href");

            return icon;
        },
        keywords: function (document, lang) {
            var keywords = Fcommand._getMetadataFieldString("keywords", document, lang);

            // Keywords is a comma- or space-delimited list of words
            if (keywords !== null)
            {
                keywords = keywords.
                    split(/[,\s]+/).
                    filter(function(el) {
                        return (el !== "" && el !== " " && el !== ",")
                    })
            }
            else
                keywords = [];

            return keywords;
        },
        optspec: Fcommand._extractOptSpec,
        title: function (document, lang) {
            var title = Fcommand._getFromLangSelector(document, "head title", lang);
            if (title !== null)
                title = title.textContent;

            return title;
        },
        updateUrl: getMetaFieldExtractor("updateUrl"),
        version: getMetaFieldExtractor("version"),
    };
}   // Fcommand._getDataExtractor


/**
 * Build a data validator object.  Each key knows how to validate the value
 * of the key field name from the Fcommand document.
 * @param {HTMLDocument} document - The Fcommand document.
 * @param {String} lang - BCP47 language string
 * @returns Object Maps Fcommand field names to objects with functions that
 * validate the data for that field.  Validate functions take the value to
 * validate.  Data being validated is expected to have been extracted by the
 * extraction functions.  Fields with no validation function don't get
 * validated (duh).
 */
Fcommand._getDataValidator = function()
{
    function getNullChecker(field)
    {
        return function throwIfNull(value) {
            if (value === null)
                throw Error("Fcommand field '" + field + "' is required.");
        };
    }

    return {
        author: getNullChecker("author"),
        description: getNullChecker("description"),
        guid: getNullChecker("guid"),
        keywords: function (value) {
            if (value.length === 0)
                throw Error("Fcommand field 'keywords' must have at least one keyword");
        },
        title: getNullChecker("title"),
        version: function (value) {
            if (semver.valid(value) === null)
                throw Error("Fcommand field 'version'='" + value + "' is not semver-compliant");
        },
    };
}   // Fcommand._getDataValidator


/**
 * Retrieve Fcommand data from the import document.
 * @param {String} documentString - Fcommand document in string form
 * @param {String} lang - BCP47 language string
 * @returns {Object} Retrieved values for every key (field) specified in
 * _getDataExtractor.
 */
Fcommand._extractData = function (documentString, lang)
{
    var dom = Fcommand._parseDomFromString(documentString);
    var extractor = Fcommand._getDataExtractor(dom, lang);
    var extractData = {};

    for (var field in extractor)
    {
        extractData[field] = extractor[field](dom, lang);
    }

    return extractData;
}   // Fcommand._extractData


/**
 * Return one HTML object for the given selector, preferring elements with
 * the given language attribute and falling back as necessary.
 * @param {HTMLDocument} document - HTML document to search
 * @param {String} selector - document query selector
 * @param {String} lang - BCP47 language string
 */
Fcommand._getFromLangSelector = function (document, selector, lang)
{
    var elements = document.querySelectorAll(selector);

    // List of languages in order of preference:  given language (presumably
    // from the browser), given language with no subtags, no language
    var langList = [ lang.toLowerCase(), lang.toLowerCase().split("-")[0], "" ];

    for (var lidx = 0; lidx < langList.length; ++lidx)
    {
        //for (var el of elements)      XXX: won't work in Chrome yet: https://code.google.com/p/chromium/issues/detail?id=401699
        // XXX: also doesn't work with browserify
        for (var i = 0; i < elements.length; ++i)
        {
            if (langList[lidx] === elements[i].lang.toLowerCase())
                return elements[i];
        }
    }

    return null;
};   // Fcommand._getFromLangSelector


/**
 * Return an HTMLDocument object representing the given document string.
 * @private
 * @param {String} documentString - Input document to be parsed as HTML
 * markup.
 * @return {HTMLDocument} The HTMLDocument object resultfrin from
 * documentString.
 */
Fcommand._parseDomFromString = function (documentString)
{
    return (new DOMParser).parseFromString(documentString, "text/html");
}   // Fcommand._parseDomFromString


/**
 * Validate the Fcommand data.  Accumulate any errors so they can all be
 * shown at once, rather than one at a time.
 * @param {Object} data - Object with fields as from _extractData().
 * @throws {Error} On validation failure.
 */
Fcommand._validateData = function (data)
{
    var validator = Fcommand._getDataValidator();
    var error = "";

    for (var field in validator)
    {
        try {
            validator[field](data[field]);
        }
        catch (e) {
            if (error.length)
                error += "\n";

            error += e;
        }
    }

    if (error.length)
        throw Error(error);
}   // Fcommand._validateData


/**
 * Returns an object that can be passed to GetOpt.getOptions for options
 * parsing.
 * @param {Object} document - HTML document object specifying the Fcommand
 * @param {String} lang - extracts metadata for this BCP47 language string
 * @returns {Object} Option parsing data
 */
Fcommand._extractOptSpec = function (document, lang)
{
    var sel = "template#getopt";
    var template = Fcommand._getFromLangSelector(document, sel, lang);
    if (!template)
        return {};

    try {
        return JSON.parse(template.content.textContent);
    }

    catch (e)
    {
        throw Error("Failed parsing " + sel + ": " + e.stack);
    }
}   // Fcommand._extractOptSpec


/**
 * Retrieve the Fcommand's help markup.
 * @param {Object} document - HTML document object specifying the Fcommand
 * @param {String} lang - extracts help markup for this BCP47 language string
 * @returns {String} Help command markup.
 */
Fcommand._extractHelpMarkup = function (document, lang)
{
    var sel = "template#help";
    var template = Fcommand._getFromLangSelector(document, sel, lang);
    if (!template)
        return null;

    return template.innerHTML;
    // XXX: test me
}   // Fcommand._extractHelpMarkup


/**
 * Returns the Fcommand's background code as a string.
 * @param {HTMLDocument} document - contains the Fcommand
 * @param {String} language - extracts metadata for this BCP47 language string
 * @returns {String} Fcommand background-code string.
 */
Fcommand._extractBgCodeString = function (document, language)
{
    var sel = "template#bgCode";
    var template = Fcommand._getFromLangSelector(document, sel, language);
    if (!template)
        return null;

    return template.content.textContent;
}   // Fcommand._extractBgCodeString


return Fcommand;

})();   // module.exports

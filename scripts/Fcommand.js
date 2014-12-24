"use strict";

var semver = require("node-semver/semver.js");

module.exports = (function() {


/**
 * @class Fcommand Represents a single Fcommand.
 *
 * @constructor
 * @param {String} documentString - HTML document defining an Fcommand.
 * @param {String} language - extracts metadata for this BCP47 language string
*/
function Fcommand(documentString, language) {
    this.documentString = documentString;

    var fcommandDoc = Fcommand._parseDomFromString(this.documentString);
    this.metadata = Fcommand._extractMetadata(fcommandDoc, language);
    Fcommand._validateMetadata(this.metadata);

    this.optspec = Fcommand._extractOptSpec(fcommandDoc, language) || {};
    this.bgCodeString = Fcommand._extractBgCodeString(fcommandDoc, language);

    this.helpMarkup = Fcommand._extractHelpMarkup(fcommandDoc, language);

    return this;

    // XXX: test me
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
    var value = (Fcommand._getFromLangSelector(document,
        "head meta[name='" + field + "']", lang) || {}).content;

    if (typeof(value) !== "undefined")
        value = value.replace(/^\s+/, "").replace(/\s+$/, "");
    else
        value = null;

    return value;
}   // Fcommand._getMetadataFieldString


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
        for (var i = 0; i < elements.length; ++i)
        {
            if (langList[lidx] === elements[i].lang.toLowerCase())
                return elements[i];
        }
    }

    return null;
};   // Fcommand._getFromLangSelector


Fcommand._supportedStringMetaFields = [
    "author",
    "description",
    "guid",
    "keywords",
    "downloadURL",
    "updateURL",
    "version",
    "context",
];


Fcommand._requiredFields = [
    "author",
    "description",
    "guid",
    "keywords",
    "version",
];


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
 * Retrieve the Fcommand metadata.
 * @param {Object} document - HTML document object specifying the Fcommand
 * @param {String} lang - extracts metadata for this BCP47 language string
 * @returns {Object} Metadata for the Fcommand.  Fields that don't exist in
 * the document get a value of undefined.
 */
Fcommand._extractMetadata = function (document, lang)
{
    var data = {};

    Fcommand._supportedStringMetaFields.forEach(function (el) {
        data[el] = (Fcommand._getFromLangSelector(document, "head meta[name=" + el + "]", lang) || {}).content
    });

    var el = Fcommand._getFromLangSelector(document, "head link[rel=icon]", lang);
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
}   // Fcommand._extractMetadata


/**
 * Validate the Fcommand metadata.
 * @param {Object} metadata - Object with metadata fields as from extractMetadata().
 * @throws {Error} On validation failure.
 */
Fcommand._validateMetadata = function (metadata)
{
    // Required fields must be defined
    Fcommand._requiredFields.forEach(function (f) {
        if (typeof(metadata[f]) === "undefined")
            throw Error("Metadata is missing required field " + f);
    });

    // Verify the version is valid
    if (semver.valid(metadata.version) === null)
        throw Error("Metadata version '" + metadata.version + "' is not semver-compliant");

    if (metadata.keywords.length === 0)
        throw Error("Metadata keyword field must have at least one keyword");
}   // Fcommand._validateMetadata


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
        return null;

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

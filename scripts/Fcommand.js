"use strict";

var semver = require("semver");


/**
 * @class Fcommand Represents a single Fcommand.
 *
 * @constructor
 * @param {String} documentString - HTML document defining an Fcommand.
 * @param {String} language - extracts metadata for this BCP47 language string
*/
window.Fcommand = function (documentString, language)
{
    this.documentString = documentString;

    var fcommandDoc = Fcommand._parseDomFromString(this.documentString);
    this.metadata = Fcommand._extractMetadata(fcommandDoc, language);
    Fcommand._validateMetadata(this.metadata);

    this.optspec = Fcommand._extractOptSpec(fcommandDoc, language) || {};

    return this;
}   // Fcommand constructor


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

    for (var el of Fcommand._supportedStringMetaFields)
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
}   // Fcommand._extractMetadata


/**
 * Validate the Fcommand metadata.
 * @param {Object} metadata - Object with metadata fields as from extractMetadata().
 * @throws {Error} On validation failure.
 */
Fcommand._validateMetadata = function (metadata)
{
    // Required fields must be defined
    for (var f of Fcommand._requiredFields)
    {
        if (typeof(metadata[f]) === "undefined")
            throw Error("Metadata is missing required field " + f);
    }

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
    var template = Util.getFromLangSelector(document, sel, lang);
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

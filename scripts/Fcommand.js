"use strict";

var semver = require("node-semver/semver.js");
var Util = require("./Util.js");

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
        data[el] = (Util.getFromLangSelector(document, "head meta[name=" + el + "]", lang) || {}).content
    });

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


/**
 * Retrieve the Fcommand's help markup.
 * @param {Object} document - HTML document object specifying the Fcommand
 * @param {String} lang - extracts help markup for this BCP47 language string
 * @returns {String} Help command markup.
 */
Fcommand._extractHelpMarkup = function (document, lang)
{
    var sel = "template#help";
    var template = Util.getFromLangSelector(document, sel, lang);
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
    var template = Util.getFromLangSelector(document, sel, language);
    if (!template)
        return null;

    return template.content.textContent;
}   // Fcommand._extractBgCodeString


return Fcommand;

})();   // module.exports

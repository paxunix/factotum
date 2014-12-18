"use strict";

var semver = require("semver");


/**
 * @class Fcommand Represents a single Fcommand.
 *
 * @constructor
 * @param {String} documentString - HTML document defining an Fcommand.
*/
window.Fcommand = function (documentString)
{
    this.documentString = documentString;

    var fcommandDoc = Fcommand._parseDomFromString(this.documentString);
    var metadata = Fcommand._extractMetadata(fcommandDoc, navigator.language);
    Fcommand._.validateMetadata(metadata);

    var optspec = Fcommand._extractOptSpec(fcommandDoc, navigator.language) || {};
    // XXX:  save to internal fields
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



Fcommand.prototype = {
    get guid() {
        return this.data.guid;
    },

    get names() {
        return this.data.names;
    },

    get description() {
        return this.data.description;
    },

    get execute() {
        // XXX: could dynamically load this
        return this.data.execute;
    },

    get optSpec() {
        return this.data.optSpec;
    },

    get helpHtml() {
        return this.data.helpHtml;
    },
};


/**
 * Validate the given Fcommand data.
 * @param {Object} data An Fcommand's data to be validated.
 * @throws {String} If the given data is invalid.
 * @see Fcommand For the set of properties that are expected.
 */
Fcommand.validate = function (commandData)
{
    var requiredProperties = [
        "guid",
        "names",
        "execute",
        "description"
    ];

    if (!jQuery.isPlainObject(commandData))
        throw new FcommandError("commandData must be an object");

    var missingProperties = [];
    jQuery.each(requiredProperties, function (i, prop) {
        if (!(prop in commandData))
            missingProperties.push(prop);
    });

    if (missingProperties.length > 0)
        throw new MissingPropertyError("commandData is missing properties: " +
            missingProperties.join(", "));

    if (!jQuery.isArray(commandData.names) || commandData.names.length === 0)
        throw new InvalidData("commandData.names must be a non-empty array.");

    if (typeof(commandData.description) !== 'string' ||
        commandData.description === "" ||
        commandData.description.search(/\S/) == -1)
            throw new InvalidData(
                "commandData.description must be a non-empty string.");

    if (typeof(commandData.execute) !== "string" &&
        !jQuery.isFunction(commandData.execute))
            throw new InvalidData("commandData.execute must be a string or a function.");

    if ('optSpec' in commandData &&
        !jQuery.isPlainObject(commandData.optSpec))
            throw new InvalidData("commandData.optSpec must be an object.");

    if ('helpHtml' in commandData && typeof(commandData.helpHtml) !== "string")
        throw new InvalidData("commandData.helpHtml must be a string.");
}   // Fcommand.validate


/**
 * Save this Fcommand to disk.
 * @param {FileSystem} fileSystem Object that does the save.
 * @param {Function} onSuccessFn Callback function for successful write.
 * @param {Function} onErrorFn Callback function for an error during write.
 * Its parameter is a FileError object.
 */
Fcommand.prototype.save = function(fileSystem, onSuccessFn, onErrorFn)
{
    // Don't save an internal Fcommand (i.e. execute is a function).
    if (jQuery.isFunction(this.execute))
    {
        onSuccessFn();
        return;
    }

    fileSystem.writeFile(this.guid,
        JSON.stringify(this.data), onSuccessFn, onErrorFn);
}   // Fcommand.prototype.save


/**
 * Load an Fcommand from disk by its guid.
 * @param {FileSystem} fileSystem Object that does the load.
 * @param {String} guid guid of the Fcommand to load.
 * @param {Function} onSuccessFn Callback function for successful read.  Its
 * parameter is the new Fcommand object.
 * @param {Function} onErrorFn Callback function on error during read.  Its
 * parameter is a FileError object or an Error (or derived from Error) object.
 */
Fcommand.load = function(guid, fileSystem, onSuccessFn, onErrorFn)
{
    fileSystem.readFile(guid, function (content) {
        var fcmd;
        try {
            // While it may seem odd that reading in a saved Fcommand could
            // throw an exception, we catch them all in case someone has
            // inappropriately diddled the FileSystem data for this Fcommand or
            // if the data used to be valid, but is no longer valid (e.g. an
            // Fcommand upgrade that broke backwards compatibility--which would
            // be very bad).
            fcmd = new Fcommand(JSON.parse(content));
        } catch (e) {
            onErrorFn(e);
            return;
        }

        onSuccessFn(fcmd);
    }, onErrorFn);
}   // Fcommand.load


/**
 * Delete an Fcommand from disk by its guid and make this Fcommand unusable.
 * @param {FileSystem} fileSystem Object that does the load.
 * @param {Function} onSuccessFn Callback function for successful deletion.
 * @param {Function} onErrorFn Callback function on error during delete.  Its
 * parameter is a FileError object or an Error (or derived from Error) object.
 */
Fcommand.prototype.delete = function(fileSystem, onSuccessFn, onErrorFn)
{
    fileSystem.removeFile(this.guid, function() {
        // Since javascript has no destructors, we allow objects to delete
        // themselves by discarding their data.  This doesn't actually destroy
        // the object, but does make it obvious if the caller continues to use a
        // "deleted" object.  Presumably, the caller will dispose of this object
        delete this.data;   // "kill" this Fcommand

        onSuccessFn();
    }.bind(this), onErrorFn);
}   // Fcommand.prototype.delete

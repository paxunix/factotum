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
 * Returns an object that can be passed to minist for options parsing.
 * @returns {Object} Option parsing data
 */
Util.extractOptSpec = function (document)
{
    var sel = "template#minimist-opt";
    var template = document.querySelector(sel);
    if (!template)
        throw Error(sel + " is missing");

    return JSON.parse(template.content.textContent);
}   // Util.extractOptSpec


/**
 * Retrieve the Fcommand metadata.
 * @param {Object} document - HTML document object specifying the Fcommand
 * @returns {Object} Metadata for the Fcommand.
 */
Util.extractMetadata = function (document)
{
    var data = {};
    var metaKeys = [
        "author",
        "description",
        "guid",
        "keywords",
        "downloadURL",
        "updateURL",
        "version",
        "context"
    ];

    metaKeys.forEach(function (el) {
        data[el] = (document.querySelector("head meta[name=" + el + "]") || {}).content
    });

    data.icon = (document.querySelector("head link[rel=icon]") || {}).getAttribute("href");

    return data;
}   // Util.extractMetadata

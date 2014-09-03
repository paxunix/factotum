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

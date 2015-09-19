"use strict";


module.exports = (function() {


/**
 * @class TransferObject Build and contain data for transfer between contexts.
 * @constructor
 * @param {Object} obj - properties to be put into place in this object.
 * If obj is an object, all its direct properties are shallow-copied into
 * this object.  If obj is a TransferObject, it is appropriately
 * shallow-copied.
*/
function TransferObject(obj) {
    this.storage = {};

    var from = obj ? (('storage' in obj) ? obj.storage : obj) : {};
    for (var p in from)
    {
        if (from.hasOwnProperty(p))
        {
            this.set(p, from[p]);
        }
    }

    return this;
}   // TransferObject constructor


var supportedKeys = [
    // Intended for direct use by Fcommands
    "cmdlineOptions",
    "currentTab",
    "tabDisposition",
    "importDocument",
    "bgData",
    "contextClickData", // only present if Fcommand invoked from context menu

    // For passing information from background to content script.  Not
    // expected to be directly accessed by Fcommands.
    "_content.documentString",
    "_content.guid",
    "_content.internalCmdlineOptions",
    "_content.title",

    // For passing information from content script to background.  Not
    // expected to be directly accessed by Fcommands.
    "_bg.errorMessage",
    "_bg.fcommandDocument",
];


/**
 * Set the command line options object.
 * @param {Object} opts - Value to store for command line options.
 * @return {TransferObject} - this object, for chaining.
 */
TransferObject.prototype.setCommandLine = function (opts) {
    this.set("cmdlineOptions", opts);
    return this;
}   // TransferObject.prototype.setCommandLine


/**
 * Get the command line options object.
 * @return {Object} - command line options object, or undefined if none were set.
 */
TransferObject.prototype.getCommandLine = function () {
    return this.get("cmdlineOptions");
}   // TransferObject.prototype.getCommandLine


/**
 * Check for presence of command line object.
 * @return {Boolean} - true if a command line object was set.
 */
TransferObject.prototype.hasCommandLine = function () {
    return this.has("cmdlineOptions");
}   // TransferObject.prototype.hasCommandLine


/**
 * Set the current tab object.
 * @param {Object} opts - Value to store for current tab object.
 * @return {TransferObject} - this object, for chaining.
 */
TransferObject.prototype.setCurrentTab = function (tab) {
    this.set("currentTab", tab);
    return this;
}   // TransferObject.prototype.setCurrentTab


/**
 * Get the current tab object.
 * @return {Object} - current tab object, or undefined if none were set.
 */
TransferObject.prototype.getCurrentTab = function () {
    return this.get("currentTab");
}   // TransferObject.prototype.getCurrentTab


/**
 * Check if current tab object is present.
 * @return {Boolean} - true if a current tab object was set.
 */
TransferObject.prototype.hasCurrentTab = function () {
    return this.has("currentTab");
}   // TransferObject.prototype.hasCurrentTab


/**
 * Set the context menu click data object.  Expected to only have been
 * called if the Fcommand was invoked via the context menu.
 * @param {Object} data - Value to store for context menu click data.
 * @return {TransferObject} - this object, for chaining.
 */
TransferObject.prototype.setContextClickData = function (data) {
    this.set("contextClickData", data);
    return this;
}   // TransferObject.prototype.setContextClickData


/**
 * Get the context menu click data object.  Will only return a value if the
 * Fcommand was invoked via the context menu.
 * @return {Object} - context menu click data, or undefined if none were set.
 */
TransferObject.prototype.getContextClickData = function () {
    return this.get("contextClickData");
}   // TransferObject.prototype.getContextClickData


/**
 * Check if context menu click data is present.
 * @return {Boolean} - true if a context menu click data was set.
 */
TransferObject.prototype.hasContextClickData = function () {
    return this.has("contextClickData");
}   // TransferObject.prototype.hasContextClickData


/**
 * Set the tab disposition.
 * @param {String} value - Value to store for tab disposition.
 * @return {TransferObject} - this object, for chaining.
 */
TransferObject.prototype.setTabDisposition = function (value) {
    this.set("tabDisposition", value);
    return this;
}   // TransferObject.prototype.setTabDisposition


/**
 * Get the tab disposition.
 * @return {String} - tab disposition, or undefined if none were set.
 */
TransferObject.prototype.getTabDisposition = function () {
    return this.get("tabDisposition");
}   // TransferObject.prototype.getTabDisposition


/**
 * Check if tab disposition value is present.
 * @return {Boolean} - true if tab disposition was set.
 */
TransferObject.prototype.hasTabDisposition = function () {
    return this.has("tabDisposition");
}   // TransferObject.prototype.hasTabDisposition


/**
 * Set the import document.
 * @param {Object} value - Value to store for import document.
 * @return {TransferObject} - this object, for chaining.
 */
TransferObject.prototype.setImportDocument = function (value) {
    this.set("importDocument", value);
    return this;
}   // TransferObject.prototype.setImportDocument


/**
 * Get the import document.
 * @return {String} - import document, or undefined if none were set.
 */
TransferObject.prototype.getImportDocument = function () {
    return this.get("importDocument");
}   // TransferObject.prototype.getImportDocument


/**
 * Check if import document is present.
 * @return {Boolean} - true if import document was set.
 */
TransferObject.prototype.hasImportDocument = function () {
    return this.has("importDocument");
}   // TransferObject.prototype.hasImportDocument


/**
 * Set the background data object.
 * @param {Object} value - Value to store for background data.
 * @return {TransferObject} - this object, for chaining.
 */
TransferObject.prototype.setBgData = function (value) {
    this.set("bgData", value);
    return this;
}   // TransferObject.prototype.setBgData


/**
 * Get the background data object.
 * @return {Object} - background data, or undefined if none were set.
 */
TransferObject.prototype.getBgData = function () {
    return this.get("bgData");
}   // TransferObject.prototype.getBgData


/**
 * Check if import document is present.
 * @return {Boolean} - true if import document was set.
 */
TransferObject.prototype.hasBgData = function () {
    return this.has("bgData");
}   // TransferObject.prototype.hasBgData


/**
 * Set the particular key to value.
 * @param {String} key Key to receive value
 * @param {*} value Value to store for key
 * @throws {Error}  If key is unsupported.
 */
TransferObject.prototype.set = function (key, value) {
    this.keyCheck(key);

    this.storage[key] = value;

    return this;
}   // TransferObject.prototype.set


/**
 * Get the value for the given key.
 * @return {*} Key to receive value
 * @throws {Error}  If key is unsupported.
 */
TransferObject.prototype.get = function (key) {
    this.keyCheck(key);

    return this.storage[key];
}   // TransferObject.prototype.get


/**
 * Is key present in the object.
 * @return {*} Key whose presence is retrieved.
 * @throws {Error}  If key is unsupported.
 */
TransferObject.prototype.has = function (key) {
    this.keyCheck(key);

    return this.storage.hasOwnProperty(key);
}   // TransferObject.prototype.has


/**
 * Delete the key.
 * @param {String} key Key to delete.
 * @throws {Error}  If key is unsupported.
 */
TransferObject.prototype.delete = function (key) {
    this.keyCheck(key);

    delete this.storage[key];

    return this;
}   // TransferObject.prototype.delete



/**
 * Return a deep clone of this transfer object.
 * @return {TransferObject} Cloned object.
 */
TransferObject.prototype.clone = function () {
    // XXX:  yes, this doesn't clone functions, nor Date objects, nor
    // probably some other things I don't really have to care about just
    // yet.
    return new TransferObject(JSON.parse(JSON.stringify(this)));
}   // TransferObject.prototype.clone


TransferObject.prototype.keyCheck = function (key) {
    if (supportedKeys.indexOf(key) === -1)
        throw new Error(`Unknown TransferObject key '${key}'`);
}


return TransferObject;


})();   // module.exports

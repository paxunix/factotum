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
    this.storage.cmdlineOptions = opts;
    return this;
}   // TransferObject.prototype.setCommandLine


/**
 * Get the command line options object.
 * @return {Object} - command line options object, or undefined if none were set.
 */
TransferObject.prototype.getCommandLine = function () {
    return this.storage.cmdlineOptions;
}   // TransferObject.prototype.getCommandLine


/**
 * Check for presence of command line object.
 * @return {Boolean} - true if a command line object was set.
 */
TransferObject.prototype.hasCommandLine = function () {
    return this.storage.hasOwnProperty("cmdlineOptions");
}   // TransferObject.prototype.hasCommandLine


/**
 * Set the current tab object.
 * @param {Object} opts - Value to store for current tab object.
 * @return {TransferObject} - this object, for chaining.
 */
TransferObject.prototype.setCurrentTab = function (tab) {
    this.storage.currentTab = tab;
    return this;
}   // TransferObject.prototype.setCurrentTab


/**
 * Get the current tab object.
 * @return {Object} - current tab object, or undefined if none were set.
 */
TransferObject.prototype.getCurrentTab = function () {
    return this.storage.currentTab;
}   // TransferObject.prototype.getCurrentTab


/**
 * Check if current tab object is present.
 * @return {Boolean} - true if a current tab object was set.
 */
TransferObject.prototype.hasCurrentTab = function () {
    return this.storage.hasOwnProperty("currentTab");
}   // TransferObject.prototype.hasCurrentTab


/**
 * Set the particular key to value.
 * @param {String} key Key to receive value
 * @param {*} value Value to store for key
 * @throws {Error}  If key is unsupported.
 */
TransferObject.prototype.set = function (key, value) {
    if (supportedKeys.indexOf(key) === -1)
        throw new Error(`Unknown TransferObject key '${key}'`);

    this.storage[key] = value;

    return this;
}   // TransferObject.prototype.set


/**
 * Get the value for the given key.
 * @return {*} Key to receive value
 * @throws {Error}  If key is unsupported.
 */
TransferObject.prototype.get = function (key) {
    if (supportedKeys.indexOf(key) === -1)
        throw new Error(`Unknown TransferObject key '${key}'`);

    return this.storage[key];
}   // TransferObject.prototype.get


/**
 * Is key present in the object.
 * @return {*} Key whose presence is retrieved.
 * @throws {Error}  If key is unsupported.
 */
TransferObject.prototype.has = function (key) {
    if (supportedKeys.indexOf(key) === -1)
        throw new Error(`Unknown TransferObject key '${key}'`);

    return (key in this.storage);
}   // TransferObject.prototype.has


/**
 * Delete the key.
 * @param {String} key Key to delete.
 * @throws {Error}  If key is unsupported.
 */
TransferObject.prototype.delete = function (key) {
    if (supportedKeys.indexOf(key) === -1)
        throw new Error(`Unknown TransferObject key '${key}'`);

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


return TransferObject;


})();   // module.exports

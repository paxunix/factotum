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

    // For passing information from background to content script
    "_content.documentString",
    "_content.guid",
    "_content.internalCmdlineOptions",
    "_content.title",

    // For passing information from content script to background
    "_bg.errorMessage",
];


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

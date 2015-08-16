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

    var from = obj ? ((obj instanceof TransferObject) ? obj.storage : obj) : {};
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
    "content.tabDisposition",
    "content.documentString",
    "content.cmdlineOptions",
    "content.internalCmdlineOptions",
    "content.title",
    "content.guid",
    "content.currentTab",
    "bg.errorMessage",
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


return TransferObject;


})();   // module.exports

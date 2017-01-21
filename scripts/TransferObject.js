"use strict";

// XXX: this seems like it would be simpler with a Proxy object

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



class TransferObject
{


/**
 * @class TransferObject Build and contain data for transfer between contexts.
 * @constructor
 * @param {Object} obj - properties to be put into place in this object.
 * If obj is an object, all its direct properties are shallow-copied into
 * this object.  If obj is a TransferObject, it is appropriately
 * shallow-copied.
*/
constructor(obj) {
    this.storage = {};

    var from = obj ? (('storage' in obj) ? obj.storage : obj) : {};
    for (let p in from)
    {
        if (from.hasOwnProperty(p))
        {
            this.set(p, from[p]);
        }
    }

    return this;
}   // TransferObject constructor


/**
 * Set the command line options object.
 * @param {Object} opts - Value to store for command line options.
 * @return {TransferObject} - this object, for chaining.
 */
setCommandLine(opts) {
    this.set("cmdlineOptions", opts);
    return this;
}   // TransferObject.setCommandLine


/**
 * Get the command line options object.
 * @return {Object} - command line options object, or undefined if none were set.
 */
getCommandLine() {
    return this.get("cmdlineOptions");
}   // TransferObject.getCommandLine


/**
 * Check for presence of command line object.
 * @return {Boolean} - true if a command line object was set.
 */
hasCommandLine() {
    return this.has("cmdlineOptions");
}   // TransferObject.hasCommandLine


/**
 * Set the current tab object.
 * @param {Object} opts - Value to store for current tab object.
 * @return {TransferObject} - this object, for chaining.
 */
setCurrentTab(tab) {
    this.set("currentTab", tab);
    return this;
}   // TransferObject.setCurrentTab


/**
 * Get the current tab object.
 * @return {Object} - current tab object, or undefined if none were set.
 */
getCurrentTab() {
    return this.get("currentTab");
}   // TransferObject.getCurrentTab


/**
 * Check if current tab object is present.
 * @return {Boolean} - true if a current tab object was set.
 */
hasCurrentTab() {
    return this.has("currentTab");
}   // TransferObject.hasCurrentTab


/**
 * Set the context menu click data object.  Expected to only have been
 * called if the Fcommand was invoked via the context menu.
 * @param {Object} data - Value to store for context menu click data.
 * @return {TransferObject} - this object, for chaining.
 */
setContextClickData(data) {
    this.set("contextClickData", data);
    return this;
}   // TransferObject.setContextClickData


/**
 * Get the context menu click data object.  Will only return a value if the
 * Fcommand was invoked via the context menu.
 * @return {Object} - context menu click data, or undefined if none were set.
 */
getContextClickData() {
    return this.get("contextClickData");
}   // TransferObject.getContextClickData


/**
 * Check if context menu click data is present.
 * @return {Boolean} - true if a context menu click data was set.
 */
hasContextClickData() {
    return this.has("contextClickData");
}   // TransferObject.hasContextClickData


/**
 * Set the tab disposition.
 * @param {String} value - Value to store for tab disposition.
 * @return {TransferObject} - this object, for chaining.
 */
setTabDisposition(value) {
    this.set("tabDisposition", value);
    return this;
}   // TransferObject.setTabDisposition


/**
 * Get the tab disposition.
 * @return {String} - tab disposition, or undefined if none were set.
 */
getTabDisposition() {
    return this.get("tabDisposition");
}   // TransferObject.getTabDisposition


/**
 * Check if tab disposition value is present.
 * @return {Boolean} - true if tab disposition was set.
 */
hasTabDisposition() {
    return this.has("tabDisposition");
}   // TransferObject.hasTabDisposition


/**
 * Set the import document.
 * @param {Object} value - Value to store for import document.
 * @return {TransferObject} - this object, for chaining.
 */
setImportDocument(value) {
    this.set("importDocument", value);
    return this;
}   // TransferObject.setImportDocument


/**
 * Get the import document.
 * @return {String} - import document, or undefined if none were set.
 */
getImportDocument() {
    return this.get("importDocument");
}   // TransferObject.getImportDocument


/**
 * Check if import document is present.
 * @return {Boolean} - true if import document was set.
 */
hasImportDocument() {
    return this.has("importDocument");
}   // TransferObject.hasImportDocument


/**
 * Set the background data object.
 * @param {Object} value - Value to store for background data.
 * @return {TransferObject} - this object, for chaining.
 */
setBgData(value) {
    this.set("bgData", value);
    return this;
}   // TransferObject.setBgData


/**
 * Get the background data object.
 * @return {Object} - background data, or undefined if none were set.
 */
getBgData() {
    return this.get("bgData");
}   // TransferObject.getBgData


/**
 * Check if import document is present.
 * @return {Boolean} - true if import document was set.
 */
hasBgData() {
    return this.has("bgData");
}   // TransferObject.hasBgData


/**
 * Set the particular key to value.
 * @param {String} key Key to receive value
 * @param {*} value Value to store for key
 * @throws {Error}  If key is unsupported.
 */
set(key, value) {
    this.keyCheck(key);

    this.storage[key] = value;

    return this;
}   // TransferObject.set


/**
 * Get the value for the given key.
 * @return {*} Key to receive value
 * @throws {Error}  If key is unsupported.
 */
get(key) {
    this.keyCheck(key);

    return this.storage[key];
}   // TransferObject.get


/**
 * Is key present in the object.
 * @return {*} Key whose presence is retrieved.
 * @throws {Error}  If key is unsupported.
 */
has(key) {
    this.keyCheck(key);

    return this.storage.hasOwnProperty(key);
}   // TransferObject.has


/**
 * Delete the key.
 * @param {String} key Key to delete.
 * @throws {Error}  If key is unsupported.
 */
delete(key) {
    this.keyCheck(key);

    delete this.storage[key];

    return this;
}   // TransferObject.delete



/**
 * Return a deep clone of this transfer object.
 * @return {TransferObject} Cloned object.
 */
clone() {
    // XXX:  yes, this doesn't clone functions, nor Date objects, nor
    // probably some other things I don't really have to care about just
    // yet.
    return new TransferObject(JSON.parse(JSON.stringify(this)));
}   // TransferObject.clone


keyCheck(key) {
    if (supportedKeys.indexOf(key) === -1)
        throw new Error(`Unknown TransferObject key '${key}'`);
}

}   // class TransferObject


export default TransferObject;

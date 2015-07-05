"use strict";


module.exports = (function() {


/**
 * @class TransferObject Build and contain data for transfer between contexts.
 * @constructor
*/
function TransferObject() {
    return this;
}   // TransferObject constructor


/**
 * @param {String} disposition - the string value as passed to the Omnibox's inputEntered event.
 */
TransferObject.prototype.setTabDisposition = function (disposition) {
    this.tabDisposition = disposition;
    return this;
}   // TransferObject.setTabDisposition


/**
 * @return {String} - tab disposition
 */
TransferObject.prototype.getTabDisposition = function () {
    return this.tabDisposition;
}   // TransferObject.getTabDisposition


/**
 * @param {String} docstring - the string value representing the Fcommand document
 */
TransferObject.prototype.setDocumentString = function (documentString) {
    this.documentString = documentString;
    return this;
}   // TransferObject.setDocumentString


/**
 * @return {String} - document string
 */
TransferObject.prototype.getDocumentString = function () {
    return this.documentString;
}   // TransferObject.getDocumentString


/**
 * @param {Object} options - the object containing the Fcommand's command line options
 */
TransferObject.prototype.setCmdlineOptions = function (options) {
    this.cmdlineOpts = options;
    return this;
}   // TransferObject.setCmdlineOptions


/**
 * @return {Object} - command line options object
 */
TransferObject.prototype.getCmdlineOptions = function () {
    return this.cmdlineOpts;
}   // TransferObject.getCmdlineOptions


/**
 * @param {Object} internalOptions - the object containing the Fcommand's internal command line options
 */
TransferObject.prototype.setInternalCmdlineOptions = function (options) {
    this.internalCmdlineOpts = options;
    return this;
}   // TransferObject.setInternalCmdlineOptions


/**
 * @return {Object} - internal command line options object
 */
TransferObject.prototype.getInternalCmdlineOptions = function () {
    return this.internalCmdlineOpts;
}   // TransferObject.getInternalCmdlineOptions


return TransferObject;


})();   // module.exports

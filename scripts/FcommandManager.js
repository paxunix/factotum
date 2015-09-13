"use strict";

// XXX: test all of me

module.exports = (function() {

// XXX: default minified version won't work within browserify, so pull in
// non-minified version
var Dexie = require("../bower_components/dexie/dist/latest/Dexie.js");
var Fcommand = require("./Fcommand.js");


/**
 * @class FcommandManager Manages the set of Fcommands.
 */
function FcommandManager()
{
    this.db = new Dexie("FcommandDb");
    this.db.version(1).stores({
        fcommands: "extractedData.guid,*extractedData.keywords"
    });

    // Instances of Fcommand are stored in the fcommands table
    this.db.fcommands.mapToClass(Fcommand);

    this.db.open();

    return this;
}   // FcommandManager constructor


FcommandManager.MAIN_MENU_ID = "FactotumMain";


/**
 * Save the given Fcommand to storage.
 * @param {Fcommand} fcommand - The Fcommand to save.
 * @returns {Promise} Promise to save the Fcommand.
 */
FcommandManager.prototype.save = function (fcommand)
{
    // XXX: what if overwriting an existing Fcommand?  It's possible to
    // enforce this at the DB level by requiring guid to be unique.  This
    // would complicate saving of modifications to the fcommand, though.
    return this.db.fcommands.put(fcommand).then(function (res) {
        console.log(`Saved Fcommand ${res}`);
        return fcommand;
    });
}   // FcommandManager.prototype.save


/**
 * Return a Promise to retrieve an Fcommand by guid.
 * @param {String} guid - GUID for the Fcommand.
 * @returns {Promise} Promise to retrieve the Fcommand by guid.  Promise
 * will resolve with undefined if no Fcommand for guid exists; otherwise,
 * resolves with an instantiated Fcommand.  Does not care about
 * enabled/disabled state.
 */
FcommandManager.prototype.getByGuid = function (guid)
{
    return this.db.fcommands.get(guid);
}   // FcommandManager.prototype.getByGuid


/**
 * Return a Promise to delete an Fcommand by guid.
 * @param {String} guid - GUID for the Fcommand.
 * @returns {Promise} Promise to delete the Fcommand by guid.
 */
FcommandManager.prototype.deleteByGuid = function (guid)
{
    return this.db.fcommands.delete(guid);
}   // FcommandManager.prototype.deleteByGuid


/**
 * Return a Promise to delete all Fcommands.
 * @param {String} guid - GUID for the Fcommand.
 * @returns {Promise} Promise to delete all Fcommands.
 */
FcommandManager.prototype.deleteAll = function ()
{
    return this.db.fcommands.clear();
}   // FcommandManager.prototype.delete


/**
 * Return a Promise to retrieve all enabled Fcommands with keywords that
 * start with a prefix, ordered by their order properties.
 * @param {String} prefix - Search prefix.
 * @return {Promise} Promise to retrieve array of Fcommands.
 * Comparison is case-insensitive.  Promise will resolve with an array
 * containing enabled Fcommand instances for each matching Fcommand.  If no
 * enabled matches, the array will be empty.
 */
FcommandManager.prototype.getByPrefix = function (prefix)
{
    return this.db.fcommands
        .where("extractedData.keywords")
        .startsWithIgnoreCase(prefix)
        .distinct()
        .and(function (fcommand) {
                return !!fcommand.enabled;
            })
        .toArray()  // XXX: would like to use Dexie's sortBy() instead of
                    // toArray() but it doesn't support a comparator
                    // (https://github.com/dfahlander/Dexie.js/issues/54)
        .then(function (res) {
                return res.sort(function (lhs, rhs) {
                        return lhs.order > rhs.order ?
                            +1 :
                            (lhs.order < rhs.order ?
                                -1 :
                                0);
                    });
            });
}   // FcommandManager.prototype.getByPrefix


/**
 * Return a Promise to retrieve all enabled Fcommands with keywords that
 * exactly match a string, ordered by their order properties.
 * @param {String} str - Search string.
 * @return {Promise} Promise to retrieve array of Fcommands.
 * Comparison is case-insensitive.  Promise will resolve with an array
 * containing enabled Fcommand instances for each matching Fcommand.  If no
 * enabled matches, the array will be empty.
 */
FcommandManager.prototype.getByKeyword = function (str)
{
    return this.db.fcommands
        .where("extractedData.keywords")
        .equalsIgnoreCase(str)
        .distinct()
        .and(function (fcommand) {
                return !!fcommand.enabled;
            })
        .toArray()  // XXX: would like to use Dexie's sortBy() instead of
                    // toArray() but it doesn't support a comparator
                    // (https://github.com/dfahlander/Dexie.js/issues/54)
        .then(function (res) {
                return res.sort(function (lhs, rhs) {
                        return lhs.order > rhs.order ?
                            +1 :
                            (lhs.order < rhs.order ?
                                -1 :
                                0);
                    });
            });
}   // FcommandManager.prototype.getByKeyword


/**
 * Return a Promise to retrieve all Fcommands.
 * @return {Promise} Promise to retrieve array of Fcommands.
 */
FcommandManager.prototype.getAll = function ()
{
    return this.db.fcommands.toArray();
}   // FcommandManager.prototype.getAll


/**
 * Return a promise to set up the main context menu, removing all menus if
 * necessary.
 * @return {Promise}
 */
FcommandManager.prototype.createMainContextMenu = function ()
{
    // When developing, reloading the extension does not seem to be removing
    // any context menus, so remove them all before adding them again.
    // XXX: file a chrome bug
    return new Promise(function (resolve, reject) {
        chrome.contextMenus.removeAll(function() {
            chrome.contextMenus.create({
                type: "normal",
                id: FcommandManager.MAIN_MENU_ID,
                title: "Factotum",
                contexts: [ "all" ],
            }, function () {
                if (chrome.runtime.lastError)
                {
                    reject(`Failed removing all context menus: ${chrome.runtime.lastError}`);
                    return;
                }

                resolve();
            });
        });
    });
}   // FcommandManager.prototype.createMainContextMenu


return FcommandManager;

})();   // module.exports

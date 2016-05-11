"use strict";

import Dexie from "dexie";
import Fcommand from "./Fcommand.js";

// XXX: test all of me

class FcommandManager
{

/**
 * @class FcommandManager Manages the set of Fcommands.
 */
constructor()
{
    this.db = new Dexie("FcommandDb");
    this.db.version(1).stores({
        fcommands: "extractedData.guid,*extractedData.keywords"
    });

    // Instances of Fcommand are stored in the fcommands table
    this.db.fcommands.mapToClass(Fcommand);

    this.db.open();

    this.mainMenuCreated = false;

    return this;
}   // FcommandManager constructor




/**
 * Save the given Fcommand to storage.
 * @param {Fcommand} fcommand - The Fcommand to save.
 * @returns {Promise} Promise to save the Fcommand.
 */
save(fcommand)
{
    // XXX: what if overwriting an existing Fcommand?  It's possible to
    // enforce this at the DB level by requiring guid to be unique.  This
    // would complicate saving of modifications to the fcommand, though.
    return this.db.fcommands.put(fcommand).then(function (res) {
        return fcommand;
    });
}   // save


/**
 * Return a Promise to retrieve an Fcommand by guid.
 * @param {String} guid - GUID for the Fcommand.
 * @returns {Promise} Promise to retrieve the Fcommand by guid.  Promise
 * will resolve with undefined if no Fcommand for guid exists; otherwise,
 * resolves with an instantiated Fcommand.  Does not care about
 * enabled/disabled state.
 */
getByGuid(guid)
{
    return this.db.fcommands.get(guid);
}   // getByGuid


/**
 * Return a Promise to delete an Fcommand by guid.
 * @param {String} guid - GUID for the Fcommand.
 * @returns {Promise} Promise to delete the Fcommand by guid.
 */
deleteByGuid(guid)
{
    return this.db.fcommands.delete(guid);
}   // deleteByGuid


/**
 * Return a Promise to delete all Fcommands.
 * @param {String} guid - GUID for the Fcommand.
 * @returns {Promise} Promise to delete all Fcommands.
 */
deleteAll()
{
    return this.db.fcommands.clear();
}   // deleteAll


/**
 * Return a Promise to retrieve all enabled Fcommands with keywords that
 * start with a prefix, ordered by their order properties.
 * @param {String} prefix - Search prefix.
 * @return {Promise} Promise to retrieve array of Fcommands.
 * Comparison is case-insensitive.  Promise will resolve with an array
 * containing enabled Fcommand instances for each matching Fcommand.  If no
 * enabled matches, the array will be empty.
 */
getByPrefix(prefix)
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
}   // getByPrefix


/**
 * Return a Promise to retrieve all enabled Fcommands with keywords that
 * exactly match a string, ordered by their order properties.
 * @param {String} str - Search string.
 * @return {Promise} Promise to retrieve array of Fcommands.
 * Comparison is case-insensitive.  Promise will resolve with an array
 * containing enabled Fcommand instances for each matching Fcommand.  If no
 * enabled matches, the array will be empty.
 */
getByKeyword(str)
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
}   // getByKeyword


/**
 * Return a Promise to retrieve all Fcommands.
 * @return {Promise} Promise to retrieve array of Fcommands.
 */
getAll()
{
    return this.db.fcommands.toArray();
}   // getAll


/**
 * Return a promise to remove all context menus.
 * @return {Promise}
 */
removeContextMenus()
{
    return new Promise(function (resolve, reject) {
        chrome.contextMenus.removeAll(function() {
            resolve();
        });
    });
}   // removeContextMenus


/**
 * Return a promise to set up the main context menu.  If the menu already
 * exists, does nothing.  Otherwise, ensures it is created if the fcommand
 * has the menu field.
 * @param {Fcommand} fcommand - Fcommand to be propagated along promise chain
 * @return {Promise} - promise that resolves to the fcommand
 */
createMainContextMenu(fcommand)
{
    var self = this;
    return new Promise(function (resolve, reject) {
        if (self.mainMenuCreated)
        {
            resolve(fcommand);
            return;
        }

        if (fcommand.enabled && fcommand.extractedData.menu.length > 0)
        {
            chrome.contextMenus.create({
                type: "normal",
                id: FcommandManager.MAIN_MENU_ID,
                title: "Factotum",
                contexts: [ "all" ],
            }, function () {
                if (chrome.runtime.lastError)
                {
                    reject(new Error(`Failed creating parent context menu item: ${chrome.runtime.lastError}`));
                    return;
                }

                self.mainMenuCreated = true;

                resolve(fcommand);
            });
        }
        else
        {
            resolve(fcommand);
        }
    });
}   // createMainContextMenu


}   // class FcommandManager


FcommandManager.MAIN_MENU_ID = "FactotumMain";


export default FcommandManager;

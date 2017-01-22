"use strict";

import ErrorCache from "./ErrorCache.js";
import WrappErr from "wrapperr";


// XXX: test all of me

/**
 * Wrap an ErrorCache to manage the browser UI changes as the number of
 * cached errors changes.
 *
 * Since the error list exists as a separate view, rather than hook up event
 * listeners and firing events into that view if it exists, we just reload
 * any error pages if they are open.
 */
class FcommandErrors
{


/**
 * @class FcommandManager Manages the set of Fcommands.
 * @param {Function} badgeSetFn - Takes one argument (the badge value; "" removes the badge)
 */
constructor(badgeSetFn)
{
    this.errorCache = new ErrorCache({maxSize: 50});       // XXX: from config somehow?
    this.badgeSetFn = badgeSetFn;
}


/**
 * Update UI elements representing the error list state.
 */
_update()
{
    let numErrors = this.length();

    // XXX: should badge show count of errors or count of known Fcommands or
    // be configurable for either (or none)?
    chrome.browserAction.setBadgeText({
        text: numErrors > 0 ? numErrors.toString() : ""
    });

    // If there are any error page tabs open, reload them (they'll pick up
    // information from this error manager automatically).
    this._reloadErrorPages();
}


/**
 * Open or switch to the errors page.
 */
_openErrorPage()
{
    let errorPageUrl = chrome.runtime.getURL("build/errors.html");

    // If tab already exists, switch to it; otherwise open it
    chrome.tabs.query({ url: errorPageUrl },
        tabs => {
            if (tabs.length === 0)
            {
                chrome.tabs.create({ url: errorPageUrl }, () => { });
            }
            else
            {
                // Focus the window with the tab, then activate the tab
                chrome.windows.update(tabs[0].windowId, { focused: true, drawAttention: true },
                    wnd => {
                        chrome.tabs.update(tabs[0].id,
                            { active: true }, () => {});
                    }
                );
            }
        }
    );
}


/**
 * Reload any open error pages.
 */
_reloadErrorPages()
{
    let errorPageUrl = chrome.runtime.getURL("build/errors.html");

    chrome.tabs.query({ url: errorPageUrl },
        tabs => {
            for (let tab of tabs)
            {
                chrome.tabs.reload(tab.id);
            }
        }
    );
}


/**
 * Saves the given errors and adjusts the extension badge (error count).
 * If a single non-Error object is given, it is convertd into an Error object.
 * If multiple arguments are given, they will be wrapped by subsequent
 * errors.
 */
save(...errors)
{
    let err = errors.shift();
    err = (err instanceof Error) ? err : new Error(err.toString());

    while (errors.length > 0)
    {
        err = new WrappErr(err, errors.shift());
    }

    this.errorCache.push(err);
    this._update();
}


/**
 * Empties the error cache and removes the extension badge.
 */
clear()
{
    this.errorCache.clear();
    this._update();
}


/**
 * Returns the number of errors cached.
 */
length()
{
    return this.errorCache.length();
}


/**
 * Remove elements from the list at the given indices (preserving order).
 */
removeAt(...indices)
{
    this.errorCache.removeAt(...indices);
    this._update();
}


/**
 * Iterate over the current list of errors (from oldest to newest).
 */
[Symbol.iterator]()
{
    return this.errorCache[Symbol.iterator]();
}


}   // class FcommandErrors


export default FcommandErrors;

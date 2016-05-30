"use strict";

import ErrorCache from "./ErrorCache.js";
import WrappErr from "wrapperr";


// XXX: test all of me

/**
 * Wrap an ErrorCache to manage the browser UI changes as the number of
 * cached errors changes.
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
 * Set the extension's badge to show the number of errors currently cached.
 */
_updateBadge()
{
    let numErrors = this.errorCache.length();

    this.badgeSetFn(numErrors > 0 ? numErrors.toString() : "");
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
    this._updateBadge();
}


/**
 * Empties the error cache and removes the extension badge.
 */
clear()
{
    this.errorCache.clear();
    this._updateBadge();
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
    this._updateBadge();
}


/**
 * Return an iterator over the errors (from oldest to newest).
 */
getIterator()
{
    return this.errorCache[Symbol.iterator]();
}


}   // class FcommandErrors


export default FcommandErrors;

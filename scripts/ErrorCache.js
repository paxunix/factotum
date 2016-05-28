"use strict";

/**
 * A cache for containing a maximum of N Error objects.
 *
 * Acts mostly like an array.
 * Supports deleting multiple elements at once by indices.
 */
class ErrorCache
{
    constructor({ maxSize = undefined })
    {
        this.maxSize = parseInt(maxSize, 10);

        if (isNaN(maxSize))
            throw new TypeError("maxSize must be a number");

        if (maxSize < 0)
            throw new RangeError("maxSize must be >= 0");

        this.cache = [];
    }


    /**
     * Saves the given Error at the end of the list of current errors.
     *
     * If adding it would cause the list to exceed maxSize, remove the first
     * (oldest) element.
     *
     * @param {Error} error - Error object to save
     */
    push(obj)
    {
        if (! (obj instanceof Error))
            throw new TypeError("Parameter must be an Error object");

        this.cache.push(obj);

        if (this.cache.length > this.maxSize)
        {
            this.cache.shift();
        }
    }


    /**
     * Return the length of the list.
     *
     * @return {Integer} number of Errors in the list
     */
    length()
    {
        return this.cache.length;
    }


    /**
     * Retrieve an element at the given position.
     *
     * @param {Integer} index - 0-based position of the element to return.
     * If outside the set of elements, return undefined.
     * @return {Error} - the error at the given position
     */
    at(index)
    {
        return this.cache[index];
    }


    /**
     * Remove and return the first (oldest) element in the list.
     * @return {Error} - first Error from list
     */
    shift()
    {
        return this.cache.shift();
    }


    /**
     * Remove elements from the list at the given indices.  Order is
     * preserved.  All indices specify offsets based on the state of the
     * list on entry.
     *
     * @param {Integer} - list of indices
     */
    removeAt(...indices)
    {
        for (const i of indices)
        {
            this.cache[i] = null;
        }

        this.cache = this.cache.filter(el => el !== undefined && el !== null );
    }


    /**
     * Return an iterator over elements of the list.
     * @return {[Symbol.iterator]} - iterator
     */
    [Symbol.iterator]()
    {
        let i = 0;
        return {
            next: () => {
                let value = this.cache[i];
                let done = i >= this.length();
                ++i;
                return { value, done };
            }
        };
    }
}


export default ErrorCache;

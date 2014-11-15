"use strict";


/**
 * @class
 *
 * Manage a cache of Blob URLs by ID.
 *
 * We cache Blob URLs so they can be reused by ID.  A timestamp can be
 * provided per content so that the content can be updated (and a new Blob
 * URL generated) without having to explictly invalidate a cache entry.
 *
 * Cached URLs are not cleaned up until browser exit (or page unload, if
 * this cache is used within a page and not an extension).
 */


/**
 * Construct a BlobUrlCache.
 * @return {BlobUrlCache} Blob URL cache instance.
 *
 * Does not use a singleton cache because we may want more than one
 * instance.
 */
var BlobUrlCache = function ()
{
    if (!(this instanceof BlobUrlCache))
        return new BlobUrlCache();

    this.id2Url = {};
}   // BlobUrlCache


/**
 * Return the Blob URL for the given ID's content.
 * @param {String} id - Unique identifier associated with this content
 * @return {String} URL to Blob.
 *
 * Blob URLs persist until the extension is unloaded (or they are revoked).
 * Blobs for the same ID are reused.
 * No blob URLs are revoked because we can't be sure when we no longer need
 * them.
 */
BlobUrlCache.prototype.get = function (id)
{
    return this.id2Url[id];
}   // BlobUrlCache.prototype.get


/**
 * Cache a blob URL for the content for the given ID.
 * @param {String} id - Unique identifier associated with this content
 * @param {String} content - Content to put in the Blob
 * @param {String} mimeType - mime type of the content
 * @return {String} URL to Blob.
 *
 * Revokes any existing URL if id already has a cached blob URL.
 */
BlobUrlCache.prototype.set = function (id, content, mimeType)
{
    if (id in this.id2Url)
        URL.revokeObjectURL(this.id2Url[id]);

    var blob = new Blob([content], { type: mimeType });
    this.id2Url[id] = URL.createObjectURL(blob);

    return this.id2Url[id];
}   // BlobUrlCache.set

"use strict";


let supportedKeys = [
    // Intended for direct use by Fcommands
    "cmdlineOptions",
    "currentTab",
    "tabDisposition",
    "importDocument",
    "bgData",
    "contextClickData", // only present if Fcommand invoked from context menu
    "config",

    // For passing information from background to content script.  Not
    // expected to be directly accessed by Fcommands.
    "_content_documentString",
    "_content_guid",
    "_content_internalCmdlineOptions",
    "_content_title",

    // For passing information from content script to background.  Not
    // expected to be directly accessed by Fcommands.
    "_bg_errorMessage",
    "_bg_fcommandDocument",
];


let handler = {
    deleteProperty: function(obj, prop)
    {
        if (supportedKeys.indexOf(prop) !== -1)
            if (prop in obj)
            {
                delete obj[prop];
                return true;
            }
            else
                return true;

        throw new ReferenceError(`Unsupported property for 'delete' '${prop}'`);
    },


    get: function(obj, prop)
    {
        // Have to allow serialization into JSON
        if (prop == "toJSON")
            return JSON.stringify(obj);

        if (supportedKeys.indexOf(prop) !== -1)
            return obj[prop];

        throw new ReferenceError(`Unsupported property for 'get' '${prop}'`);
    },


    has: function(obj, prop)
    {
        if (supportedKeys.indexOf(prop) !== -1)
            return prop in obj;

        throw new ReferenceError(`Unsupported property for 'has' '${prop}'`);
    },


    set: function(obj, prop, value)
    {
        if (supportedKeys.indexOf(prop) !== -1)
        {
            obj[prop] = value;
            return true;
        }

        throw new ReferenceError(`Unsupported property for 'set' '${prop}'`);
    },
};


class TransferObject
{
    static build(obj)
    {
        let newobj = new Proxy({}, handler);

        Object.assign(newobj, (obj || {}));

        return newobj;
    }

    /**
     * Return a deep clone of this transfer object.
     * @return {TransferObject} Cloned object.
     */
    static clone(obj)
    {
        // XXX:  yes, this doesn't clone functions, nor Date objects, nor
        // probably some other things I don't really have to care about just
        // yet.
        return TransferObject.deserialize(TransferObject.serialize(obj));
    }   // TransferObject.clone


    static serialize(obj)
    {
        return JSON.stringify(obj);
    }


    static deserialize(str)
    {
        try {
            return TransferObject.build(JSON.parse(str));
        }

        catch (e) { ; }

        return null;
    }
}   // class TransferObject


export default TransferObject;

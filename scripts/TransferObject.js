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


// This is for use only to bridge between the old (get, set, has)
// function-based API and the new property-based proxy API.  DO NOT MODIFY
// THIS STRUCTURE.  IF ADDING KEYS, THEY GO IN supportedKeys.
let oldFunc2Key = {
    CommandLine: "cmdlineOptions",
    CurrentTab: "currentTab",
    ContextClickData: "contextClickData",
    TabDisposition: "tabDisposition",
    ImportDocument: "importDocument",
    BgData: "bgData",

};


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

        throw new ReferenceError(`Unsupported property '${prop}'`);
    },


    get: function(obj, prop)
    {
        // Have to allow serialization into JSON
        if (prop == "toJSON")
            return JSON.stringify(obj);

        // Detect if bridging from old function-based API
        let matched = prop.match(/^(?<prefix>has|get|set|delete)(?<func>.*)/);
        if (matched && matched.groups.prefix)
        {
            switch (matched.groups.prefix)
            {
                case "has":
                    return function (...args) {
                        let ref;

                        if (oldFunc2Key[matched.groups.func])
                        {
                            console.log(`Migrate TransferObject.has${matched.groups.func}()`, (new Error()).stack);
                            ref = oldFunc2Key[matched.groups.func];
                        }
                        else
                        {
                            console.log(`Migrate TransferObject.has(${args[0]})`, (new Error()).stack);
                            ref = args[0];
                        }

                        return ref in this;
                    }

                case "get":
                    return function (...args) {
                        let ref;
                        if (oldFunc2Key[matched.groups.func])
                        {
                            console.log(`Migrate TransferObject.get${matched.groups.func}()`, (new Error()).stack);
                            ref = oldFunc2Key[matched.groups.func];
                        }
                        else
                        {
                            console.log(`Migrate TransferObject.get(${args[0]})`, (new Error()).stack);
                            ref = args[0];
                        }

                        return this[ref];
                    }

                case "set":
                    return function (...args) {
                        let ref;
                        if (oldFunc2Key[matched.groups.func])
                        {
                            console.log(`Migrate TransferObject.set${matched.groups.func}()`, (new Error()).stack);
                            ref = oldFunc2Key[matched.groups.func];
                            this[ref] = args[0];
                        }
                        else
                        {
                            console.log(`Migrate TransferObject.set(${args[0]}, )`, (new Error()).stack);
                            ref = args[0];
                            this[ref] = args[1];
                        }

                        return this;
                    }

                case "delete":
                    return function (...args) {
                        let ref;
                        if (oldFunc2Key[matched.groups.func])
                        {
                            console.log(`Migrate TransferObject.delete{matched.groups.func}()`, (new Error()).stack);
                            ref = oldFunc2Key[matched.groups.func];
                            delete this[ref];

                            return this;
                        }
                        else
                        {
                            console.log(`Migrate TransferObject.delete(${args[0]}, )`, (new Error()).stack);
                            ref = args[0];
                            delete this[ref];

                            return this;
                        }
                    }
            }
        }

        if (supportedKeys.indexOf(prop) !== -1)
            return obj[prop];

        throw new ReferenceError(`Unsupported property '${prop}'`);
    },


    has: function(obj, prop)
    {
        if (supportedKeys.indexOf(prop) !== -1)
            return prop in obj;

        throw new ReferenceError(`Unsupported property '${prop}'`);
    },


    set: function(obj, prop, value)
    {
        if (supportedKeys.indexOf(prop) !== -1)
        {
            obj[prop] = value;
            return true;
        }

        throw new ReferenceError(`Unsupported property '${prop}'`);
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
        return TransferObject.build(JSON.parse(str));
    }
}   // class TransferObject


export default TransferObject;

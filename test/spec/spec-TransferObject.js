"use strict";


import TransferObject from "../../release/scripts/TransferObject.js";


describe("TransferObject", function () {


it("constructs an empty TransferObject", function() {
    expect(function() { TransferObject.build() }).not.toThrow();
});


it("constructs a TransferObject from an existing plain object", function() {
    var o = TransferObject.build({"_content_title": "title", "_content_guid": 2});
    expect(o._content_title).toBe("title");
    expect(o._content_guid).toBe(2);
});


it("constructs a TransferObject from an existing TransferObject", function() {
    var o = TransferObject.build({"_content_title": "title", "_content_guid": 2});
    var o2 = TransferObject.build(o);
    expect(o2._content_title).toBe("title");
    expect(o2._content_guid).toBe(2);
    ///XXX: should test for deep clone?  it should deep clone but don't know
    //if it does
});


for (let sk of [
    "cmdlineOptions",
    "currentTab",
    "tabDisposition",
    "importDocument",
    "bgData",
    "contextClickData",
    "config",
    "_content_documentString",
    "_content_guid",
    "_content_internalCmdlineOptions",
    "_content_title",
    "_bg_errorMessage",
    "_bg_fcommandDocument",
]) {
    it(`set/get/has/delete ${sk}`, function () {
        let t = TransferObject.build();
        t[sk] = {a:1};

        expect(t[sk]).toEqual({a:1});
        expect(sk in t).toBe(true);
        delete t[sk];
        expect(sk in t).toBe(false);

        // key's value on build is undefined
        expect(TransferObject.build()[sk]).toBeUndefined();
        expect(sk in TransferObject.build()).toBe(false);
    });
}


it("throws error on setting unsupported key", function () {
    expect(function () {
        TransferObject.build().unsupported = "blah";
    }).toThrowError(ReferenceError, "Unsupported property for 'set' 'unsupported'");
});


it("throws error on getting unsupported key", function () {
    expect(function () {
        let v = TransferObject.build().unsupported;
    }).toThrowError(ReferenceError, "Unsupported property for 'get' 'unsupported'");
});


it("throws error on checking for unsupported key", function () {
    expect(function () {
        "unsupported" in TransferObject.build();
    }).toThrowError(ReferenceError, "Unsupported property for 'has' 'unsupported'");
});


it("throws error on deleting unsupported key", function () {
    expect(function () {
        delete TransferObject.build().unsupported;
    }).toThrowError(ReferenceError, "Unsupported property for 'delete' 'unsupported'");
});


it("can deep clone itself", function () {
    var o = TransferObject.build({"_content_title": "title", "_content_guid": {k: 1 } });
    var o2 = TransferObject.clone(o);
    expect(TransferObject.serialize(o)).toEqual(TransferObject.serialize(o2));
    // modify o to verify clone was deep
    var v = o._content_guid;
    v.k = "newk";
    expect(o2._content_guid).toEqual({k: 1});
});


it("deep clone throws on unsupported property", function () {
    expect(function () {
        let o = TransferObject.build({"unsupported": "blah"});
    }).toThrowError(ReferenceError, "Unsupported property for 'set' 'unsupported'");
});


}); // TransferObject

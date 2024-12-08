"use strict";


import TransferObject from "../../release/scripts/TransferObject.js";


describe("TransferObject", function () {


it("constructs an empty TransferObject", function() {
    expect(function() { TransferObject.build() }).not.toThrow();
});


it("constructs a TransferObject from an existing plain object", function() {
    var o = TransferObject.build({"_content_title": "title", "_content_guid": 2});
    expect(o.get("_content_title")).toBe("title");
    expect(o.get("_content_guid")).toBe(2);
});


it("constructs a TransferObject from an existing TransferObject", function() {
    var o = TransferObject.build({"_content_title": "title", "_content_guid": 2});
    var o2 = TransferObject.build(o);
    expect(o2.get("_content_title")).toBe("title");
    expect(o2.get("_content_guid")).toBe(2);
});


it("sets/gets/has command line object", function () {
    var t = TransferObject.build();
    var o = t.set("cmdlineOptions", {a:1});

    expect(o === t).toBe(true);
    expect(o.get("cmdlineOptions")).toEqual({a:1});
    expect(o.has("cmdlineOptions")).toBe(true);
    expect(TransferObject.build().get("cmdlineOptions")).toBeUndefined();
    expect(TransferObject.build().has("cmdlineOptions")).toBe(false);
});


it("sets/gets/has current tab", function () {
    var t = TransferObject.build();
    var o = t.set("currentTab" ,{a:1});

    expect(o === t).toBe(true);
    expect(o.get("currentTab")).toEqual({a:1});
    expect(o.has("currentTab")).toBe(true);
    expect(TransferObject.build().get("currentTab")).toBeUndefined();
    expect(TransferObject.build().has("currentTab")).toBe(false);
});


it("sets/gets/has context click data", function () {
    var t = TransferObject.build();
    var o = t.set("contextClickData", {a:1});

    expect(o === t).toBe(true);
    expect(o.get("contextClickData")).toEqual({a:1});
    expect(o.has("contextClickData")).toBe(true);
    expect(TransferObject.build().get("contextClickData")).toBeUndefined();
    expect(TransferObject.build().has("contextClickData")).toBe(false);
});


it("sets/gets/has tab disposition", function () {
    var t = TransferObject.build();
    var o = t.set("tabDisposition", "val");

    expect(o === t).toBe(true);
    expect(o.get("tabDisposition")).toEqual("val");
    expect(o.has("tabDisposition")).toBe(true);
    expect(TransferObject.build().get("tabDisposition")).toBeUndefined();
    expect(TransferObject.build().has("tabDisposition")).toBe(false);
});


it("sets/gets/has import document", function () {
    var t = TransferObject.build();
    var o = t.set("importDocument", {a:1});

    expect(o === t).toBe(true);
    expect(o.get("importDocument")).toEqual({a:1});
    expect(o.has("importDocument")).toBe(true);
    expect(TransferObject.build().get("importDocument")).toBeUndefined();
    expect(TransferObject.build().has("importDocument")).toBe(false);
});


it("sets/gets/has bgData", function () {
    var t = TransferObject.build();
    var o = t.set("bgData", {a:1});

    expect(o === t).toBe(true);
    expect(o.get("bgData")).toEqual({a:1});
    expect(o.has("bgData")).toBe(true);
    expect(TransferObject.build().get("bgData")).toBeUndefined();
    expect(TransferObject.build().has("bgData")).toBe(false);
});


it("throws error on setting unsupported key", function () {
    expect(function () {
        (TransferObject.build()).set("unsupported");
    }).toThrowError(ReferenceError, "Unsupported property for 'set' 'unsupported'");
});


it("throws error on getting unsupported key", function () {
    expect(function () {
        (TransferObject.build()).get("blarg");
    }).toThrowError(ReferenceError, "Unsupported property for 'get' 'blarg'");
});


it("throws error on checking for unsupported key", function () {
    expect(function () {
        (TransferObject.build()).has("blarg");
    }).toThrowError(ReferenceError, "Unsupported property for 'has' 'blarg'");
});


it("throws error on deleting unsupported key", function () {
    expect(function () {
        (TransferObject.build()).delete("blarg");
    }).toThrowError(ReferenceError, "Unsupported property for 'delete' 'blarg'");
});


it("sets/gets value for supported key", function () {
    var o = TransferObject.build();
    o.set("_content_guid", "value");
    expect(o.get("_content_guid")).toBe("value");
});


it("checks for key", function () {
    var o = TransferObject.build();
    o.set("_content_guid", "value");
    expect(o.has("_content_guid")).toBe(true);
    expect(o.has("_content_title")).toBe(false);
});


it("set supports chaining", function () {
    var o = TransferObject.build();
    expect(o.set("_content_guid", "value") === o).toBe(true);
});


it("can deep clone itself", function () {
    var o = TransferObject.build({"_content_title": "title", "_content_guid": {k: 1 } });
    var o2 = TransferObject.clone(o);
    expect(TransferObject.serialize(o)).toEqual(TransferObject.serialize(o2));
    // modify o to verify clone was deep
    var v = o.get("_content_guid");
    v.k = "newk";
    expect(o2.get("_content_guid")).toEqual({k: 1});
});


it("can delete a key", function () {
    var o = TransferObject.build({"_content_title": "title", "_content_guid": {k: 1 } });
    o.delete("_content_guid");
    expect(o.get("_content_guid")).toBe(undefined);
});


it("delete supports chaining", function () {
    var o = TransferObject.build({"_content_title": "title", "_content_guid": {k: 1 } });
    expect(o.delete("_content_guid") === o).toBe(true);
});


}); // TransferObject

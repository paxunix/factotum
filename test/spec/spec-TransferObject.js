"use strict";


import TransferObject from "./scripts/TransferObject.js";


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
    var o = t.setCommandLine({a:1});

    expect(o).toBe(t);
    expect(o.getCommandLine()).toEqual({a:1});
    expect(o.hasCommandLine()).toBe(true);
    expect(TransferObject.build().getCommandLine()).toBeUndefined();
    expect(TransferObject.build().hasCommandLine()).toBe(false);
});


it("sets/gets/has current tab", function () {
    var t = TransferObject.build();
    var o = t.setCurrentTab({a:1});

    expect(o).toBe(t);
    expect(o.getCurrentTab()).toEqual({a:1});
    expect(o.hasCurrentTab()).toBe(true);
    expect(TransferObject.build().getCurrentTab()).toBeUndefined();
    expect(TransferObject.build().hasCurrentTab()).toBe(false);
});


it("sets/gets/has context click data", function () {
    var t = TransferObject.build();
    var o = t.setContextClickData({a:1});

    expect(o).toBe(t);
    expect(o.getContextClickData()).toEqual({a:1});
    expect(o.hasContextClickData()).toBe(true);
    expect(TransferObject.build().getContextClickData()).toBeUndefined();
    expect(TransferObject.build().hasContextClickData()).toBe(false);
});


it("sets/gets/has tab disposition", function () {
    var t = TransferObject.build();
    var o = t.setTabDisposition("val");

    expect(o).toBe(t);
    expect(o.getTabDisposition()).toEqual("val");
    expect(o.hasTabDisposition()).toBe(true);
    expect(TransferObject.build().getTabDisposition()).toBeUndefined();
    expect(TransferObject.build().hasTabDisposition()).toBe(false);
});


it("sets/gets/has import document", function () {
    var t = TransferObject.build();
    var o = t.setImportDocument({a:1});

    expect(o).toBe(t);
    expect(o.getImportDocument()).toEqual({a:1});
    expect(o.hasImportDocument()).toBe(true);
    expect(TransferObject.build().getImportDocument()).toBeUndefined();
    expect(TransferObject.build().hasImportDocument()).toBe(false);
});


it("sets/gets/has bgData", function () {
    var t = TransferObject.build();
    var o = t.setBgData({a:1});

    expect(o).toBe(t);
    expect(o.getBgData()).toEqual({a:1});
    expect(o.hasBgData()).toBe(true);
    expect(TransferObject.build().getBgData()).toBeUndefined();
    expect(TransferObject.build().hasBgData()).toBe(false);
});


it("throws error on setting unsupported key", function () {
    expect(function () {
        (TransferObject.build()).set("unsupported");
    }).toThrowError(ReferenceError, "Unsupported property 'unsupported'");
});


it("throws error on getting unsupported key", function () {
    expect(function () {
        (TransferObject.build()).get("unsupported");
    }).toThrowError(ReferenceError, "Unsupported property 'unsupported'");
});


it("throws error on checking for unsupported key", function () {
    expect(function () {
        (TransferObject.build()).has("unsupported");
    }).toThrowError(ReferenceError, "Unsupported property 'unsupported'");
});


it("throws error on deleting unsupported key", function () {
    expect(function () {
        (TransferObject.build()).delete("unsupported");
    }).toThrowError(ReferenceError, "Unsupported property 'unsupported'");
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
    expect(o.set("_content_guid", "value")).toBe(o);
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
    expect(o.delete("_content_guid")).toBe(o);
});


}); // TransferObject

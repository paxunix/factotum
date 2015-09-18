"use strict";


var TransferObject = require("../../scripts/TransferObject.js");


describe("TransferObject", function () {


it("constructs an empty TransferObject", function() {
    expect((new TransferObject()) instanceof TransferObject).toBe(true);
});


it("constructs a TransferObject from an existing plain object", function() {
    var o = new TransferObject({"_content.title": "title", "_content.guid": 2});
    expect(o.get("_content.title")).toBe("title");
    expect(o.get("_content.guid")).toBe(2);
});


it("constructs a TransferObject from an existing TransferObject", function() {
    var o = new TransferObject({"_content.title": "title", "_content.guid": 2});
    var o2 = new TransferObject(o);
    expect(o2.get("_content.title")).toBe("title");
    expect(o2.get("_content.guid")).toBe(2);
});


it("sets/gets/has command line object", function () {
    var t = new TransferObject();
    var o = t.setCommandLine({a:1});

    expect(o).toBe(t);
    expect(o.getCommandLine()).toEqual({a:1});
    expect(o.hasCommandLine()).toBe(true);
    expect(new TransferObject().getCommandLine()).toBeUndefined();
    expect(new TransferObject().hasCommandLine()).toBe(false);
});


it("sets/gets/has current tab", function () {
    var t = new TransferObject();
    var o = t.setCurrentTab({a:1});

    expect(o).toBe(t);
    expect(o.getCurrentTab()).toEqual({a:1});
    expect(o.hasCurrentTab()).toBe(true);
    expect(new TransferObject().getCurrentTab()).toBeUndefined();
    expect(new TransferObject().hasCurrentTab()).toBe(false);
});


it("sets/gets/has context click data", function () {
    var t = new TransferObject();
    var o = t.setContextClickData({a:1});

    expect(o).toBe(t);
    expect(o.getContextClickData()).toEqual({a:1});
    expect(o.hasContextClickData()).toBe(true);
    expect(new TransferObject().getContextClickData()).toBeUndefined();
    expect(new TransferObject().hasContextClickData()).toBe(false);
});


it("sets/gets/has tab disposition", function () {
    var t = new TransferObject();
    var o = t.setTabDisposition("val");

    expect(o).toBe(t);
    expect(o.getTabDisposition()).toEqual("val");
    expect(o.hasTabDisposition()).toBe(true);
    expect(new TransferObject().getTabDisposition()).toBeUndefined();
    expect(new TransferObject().hasTabDisposition()).toBe(false);
});


it("sets/gets/has import document", function () {
    var t = new TransferObject();
    var o = t.setImportDocument({a:1});

    expect(o).toBe(t);
    expect(o.getImportDocument()).toEqual({a:1});
    expect(o.hasImportDocument()).toBe(true);
    expect(new TransferObject().getImportDocument()).toBeUndefined();
    expect(new TransferObject().hasImportDocument()).toBe(false);
});


it("sets/gets/has bgData", function () {
    var t = new TransferObject();
    var o = t.setBgData({a:1});

    expect(o).toBe(t);
    expect(o.getBgData()).toEqual({a:1});
    expect(o.hasBgData()).toBe(true);
    expect(new TransferObject().getBgData()).toBeUndefined();
    expect(new TransferObject().hasBgData()).toBe(false);
});


it("throws error on setting unsupported key", function () {
    expect(function () {
        (new TransferObject()).set("unsupported");
    }).toThrowError(Error, "Unknown TransferObject key 'unsupported'");
});


it("throws error on getting unsupported key", function () {
    expect(function () {
        (new TransferObject()).get("unsupported");
    }).toThrowError(Error, "Unknown TransferObject key 'unsupported'");
});


it("throws error on checking for unsupported key", function () {
    expect(function () {
        (new TransferObject()).has("unsupported");
    }).toThrowError(Error, "Unknown TransferObject key 'unsupported'");
});


it("throws error on deleting unsupported key", function () {
    expect(function () {
        (new TransferObject()).delete("unsupported");
    }).toThrowError(Error, "Unknown TransferObject key 'unsupported'");
});


it("sets/gets value for supported key", function () {
    var o = new TransferObject();
    o.set("_content.guid", "value");
    expect(o.get("_content.guid")).toBe("value");
});


xit("checks for key", function () {
    var o = new TransferObject();
    o.set("_content.guid", "value");
    expect(o.has("_content.guid")).toBe(true);
    expect(o.has("bgData")).toBe(false);
});


it("set supports chaining", function () {
    var o = new TransferObject();
    expect(o.set("_content.guid", "value")).toBe(o);
});


it("can deep clone itself", function () {
    var o = new TransferObject({"_content.title": "title", "_content.guid": {k: 1 } });
    var o2 = o.clone();
    expect(o).toEqual(o2);
    // modify o to verify clone was deep
    var v = o.get("_content.guid");
    v.k = "newk";
    expect(o2.get("_content.guid")).toEqual({k: 1});
});


it("can delete a key", function () {
    var o = new TransferObject({"_content.title": "title", "_content.guid": {k: 1 } });
    o.delete("_content.guid");
    expect(o.get("_content.guid")).toBe(undefined);
});


it("delete supports chaining", function () {
    var o = new TransferObject({"_content.title": "title", "_content.guid": {k: 1 } });
    expect(o.delete("_content.guid")).toBe(o);
});


}); // TransferObject

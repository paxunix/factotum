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


it("checks for key", function () {
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

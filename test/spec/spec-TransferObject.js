"use strict";


var TransferObject = require("../../scripts/TransferObject.js");


describe("TransferObject", function () {


it("constructs an empty TransferObject", function() {
    expect((new TransferObject()) instanceof TransferObject).toBe(true);
});


it("constructs a TransferObject from an existing plain object", function() {
    var o = new TransferObject({"content.title": "title", "content.guid": 2});
    expect(o.get("content.title")).toBe("title");
    expect(o.get("content.guid")).toBe(2);
});


it("constructs a TransferObject from an existing TransferObject", function() {
    var o = new TransferObject({"content.title": "title", "content.guid": 2});
    var o2 = new TransferObject(o);
    expect(o2.get("content.title")).toBe("title");
    expect(o2.get("content.guid")).toBe(2);
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


it("sets/gets value for supported key", function () {
    var o = new TransferObject();
    o.set("content.guid", "value");
    expect(o.get("content.guid")).toBe("value");
});


it("set supports chaining", function () {
    var o = new TransferObject();
    expect(o.set("content.guid", "value")).toBe(o);
});


}); // TransferObject

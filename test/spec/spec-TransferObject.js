"use strict";


var TransferObject = require("../../scripts/TransferObject.js");


describe("TransferObject", function () {


it("constructs an empty TransferObject", function() {
    expect((new TransferObject()) instanceof TransferObject).toBe(true);
});


it("constructs a TransferObject from an existing object", function() {
    var o = new TransferObject({a: 1, guid: 2});
    expect(o.a).toBe(1);
    expect(o.getGuid()).toBe(2);
    expect(o instanceof TransferObject).toBe(true);
});


it("sets/gets tab disposition, with setter chaining", function() {
    var o = new TransferObject();
    var o2 = o.setTabDisposition("test");
    expect(o.getTabDisposition()).toEqual("test");

    o2.setTabDisposition("test2");
    expect(o2.getTabDisposition()).toEqual("test2");
});


it("sets/gets document string", function() {
    var o = new TransferObject();
    var o2 = o.setDocumentString("the string");
    expect(o.getDocumentString()).toEqual("the string");

    o2.setDocumentString("the string2");
    expect(o2.getDocumentString()).toEqual("the string2");
});


it("sets/gets command line options", function() {
    var o = new TransferObject();
    var o2 = o.setCmdlineOptions({a: [1, 2]});
    expect(o.getCmdlineOptions()).toEqual({a: [1, 2]});

    o2.setCmdlineOptions({b: [3, 4]});
    expect(o2.getCmdlineOptions()).toEqual({b: [3, 4]});
});


it("sets/gets internal command line options", function() {
    var o = new TransferObject();
    var o2 = o.setInternalCmdlineOptions({a: [1, 2]});
    expect(o.getInternalCmdlineOptions()).toEqual({a: [1, 2]});

    o2.setInternalCmdlineOptions({b: [3, 4]});
    expect(o2.getInternalCmdlineOptions()).toEqual({b: [3, 4]});
});


it("sets/gets title", function() {
    var o = new TransferObject();
    var o2 = o.setTitle("test title");
    expect(o.getTitle()).toEqual("test title");

    o2.setTitle("test title2");
    expect(o2.getTitle()).toEqual("test title2");
});


it("sets/gets guid", function() {
    var o = new TransferObject();
    var o2 = o.setGuid("test guid");
    expect(o.getGuid()).toEqual("test guid");

    o2.setGuid("test guid2");
    expect(o2.getGuid()).toEqual("test guid2");
});


it("sets/gets current tab object", function() {
    var o = new TransferObject();
    var o2 = o.setCurrentTab({a:1});
    expect(o.getCurrentTab()).toEqual({a:1});

    o2.setCurrentTab({b:2});
    expect(o2.getCurrentTab()).toEqual({b:2});
});


it("sets/gets error message", function() {
    var o = new TransferObject();
    var o2 = o.setErrorMessage("test error msg");
    expect(o.getErrorMessage()).toEqual("test error msg");

    o2.setErrorMessage("test error 2");
    expect(o2.getErrorMessage()).toEqual("test error 2");
});


}); // TransferObject

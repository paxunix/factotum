"use strict";


var TransferObject = require("../../scripts/TransferObject.js");


describe("TransferObject", function () {


it("constructs an empty TransferObject", function() {
    expect((new TransferObject()) instanceof TransferObject).toBe(true);
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


}); // TransferObject

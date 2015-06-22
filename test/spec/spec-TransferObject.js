"use strict";


var TransferObject = require("../../scripts/TransferObject.js");


describe("TransferObject", function () {


it("constructs an empty TransferObject", function() {
    expect((new TransferObject()) instanceof TransferObject).toBe(true);
});


it("sets/gets tab disposition", function() {
    var o = new TransferObject();
    o.setTabDisposition("test");

    expect(o.getTabDisposition()).toEqual("test");
});


it("sets/gets document string", function() {
    var o = new TransferObject();
    o.setDocumentString("the string");

    expect(o.getDocumentString()).toEqual("the string");
});


it("sets/gets command line options", function() {
    var o = new TransferObject();
    o.setCmdlineOptions({a: [1, 2]});

    expect(o.getCmdlineOptions()).toEqual({a: [1, 2]});
});


it("sets/gets internal command line options", function() {
    var o = new TransferObject();
    o.setInternalCmdlineOptions({a: [1, 2]});

    expect(o.getInternalCmdlineOptions()).toEqual({a: [1, 2]});
});


}); // TransferObject

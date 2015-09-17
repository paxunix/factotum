"use strict";

describe("Util", function() {


var lang = "en-us";
var TransferObject = require("../../scripts/TransferObject.js");
var Util = require("../../scripts/Util.js");


describe("fetchDocument", function() {


    it("rejects when retrieving an Fcommand document via invalid URL", function(done) {
        var p = Util.fetchDocument("this is not a URL");
        expect(p instanceof Promise).toBe(true);
        p.catch(function (err) {
            expect(err.type).toEqual("error");
            done();
        });
    });


    it("retrieves an Fcommand document via URL", function(done) {
        var p = Util.fetchDocument(chrome.runtime.getURL("example/load-jquery.html"));
        expect(p instanceof Promise).toBe(true);
        p.then(function (response) {
            expect(typeof(response.target.responseText)).toBe("string");
            done();
        });
    });


}); // fetchDocument


describe("createImportLink", function() {

    it("creates a link from documentString", function() {
        var t = new TransferObject()
            .setCommandLine({ a: 1, b: [ 2, 3 ], c: { d: "four" } })
            .set("_content.internalCmdlineOptions", { a: 1, b: [ 2, { c: "3" } ] })
            .set("_content.guid", "1234")
            .set("_content.documentString", "docstring");
        var link = Util.createImportLink(document, t);

        expect(link instanceof HTMLLinkElement).toBe(true);
        expect(link.rel).toEqual("import");
        expect(link.id).toEqual(Util.getFcommandImportId(t.get("_content.guid")));
        delete t.storage["_content.documentString"];     // XXX: ugly hack
        expect(link.dataset.transferObj).toEqual(JSON.stringify(t));
        URL.revokeObjectURL(link.href);
    });

}); // createImportLink


}); // Util

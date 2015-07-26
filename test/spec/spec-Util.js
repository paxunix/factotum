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
            .setCmdlineOptions({ a: 1, b: [ 2, 3 ], c: { d: "four" } })
            .setInternalCmdlineOptions({ a: 1, b: [ 2, { c: "3" } ] })
            .setGuid("1234")
            .setDocumentString("docstring");
        var link = Util.createImportLink(document, t);

        expect(link instanceof HTMLLinkElement).toBe(true);
        expect(link.rel).toEqual("import");
        expect(link.id).toEqual(Util.getFcommandImportId(t.getGuid()));
        expect(link.dataset.fcommandArgs).toEqual(JSON.stringify(t.getCmdlineOptions()));
        expect(link.dataset.fcommandInternalOptions).toEqual(JSON.stringify(t.getInternalCmdlineOptions()));
        URL.revokeObjectURL(link.href);
    });

}); // createImportLink


}); // Util

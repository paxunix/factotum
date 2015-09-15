"use strict";

describe("inject", function() {

var TransferObject = require("../../scripts/TransferObject.js");
var Util = require("../../scripts/Util.js");

describe("_getDataAttribute", function() {

    it("retrieves transfer object from an Fcommand's import link data attribute", function(done) {
        var t = new TransferObject()
            .set("cmdlineOptions", { a: 1, b: [ { c: 2 } ] })
            .set("_content.internalCmdlineOptions", { debug: false })
            .set("_content.guid", "guid")
            .set("_content.documentString", "testing");

        var el = Util.createImportLink(document, t);

        el.onload = function onload() {
            URL.revokeObjectURL(el.href);

            delete t.storage["_content.documentString"];     // XXX: ugly hack
            expect(JSON.stringify(Factotum._getDataAttribute(document, t.get("_content.guid"), "transferObj"))).toEqual(JSON.stringify(t));
            el.remove();
            done();
        };

        document.head.appendChild(el);
    });
}); // _getDataAttribute


describe("getFcommandId", function() {

    it("retrieves guid from an Fcommand's import document metadata", function(done) {
        var t = new TransferObject()
            .set("cmdlineOptions", {})
            .set("_content.internalCmdlineOptions", {})
            .set("_content.guid", "guid")
            .set("_content.documentString", '<head><meta name="guid" content="guid">');

        var el = Util.createImportLink(document, t);

        el.onload = function onload() {
            URL.revokeObjectURL(el.href);

            expect(Factotum.getFcommandId(el.import)).toEqual(t.get("_content.guid"));
            el.remove();
            done();
        };

        document.head.appendChild(el);
    });

}); // getFcommandId

// XXX:  more things in inject.js need tests

}); // inject

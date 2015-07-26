"use strict";

describe("inject", function() {

var TransferObject = require("../../scripts/TransferObject.js");
var Util = require("../../scripts/Util.js");

describe("_getDataAttribute", function() {

    it("retrieves object from an Fcommand's import link data attribute", function(done) {
        var t = new TransferObject()
            .setCmdlineOptions({ a: 1, b: [ { c: 2 } ] })
            .setInternalCmdlineOptions({ debug: false })
            .setGuid("guid")
            .setDocumentString("testing");

        var el = Util.createImportLink(document, t);

        el.onload = function onload() {
            URL.revokeObjectURL(el.href);

            expect(Factotum._getDataAttribute(document, t.getGuid(), "fcommandArgs")).toEqual(t.getCmdlineOptions());
            el.remove();
            done();
        };

        document.head.appendChild(el);
    });
}); // _getDataAttribute


describe("getFcommandId", function() {

    it("retrieves guid from an Fcommand's import document metadata", function(done) {
        var t = new TransferObject()
            .setCmdlineOptions({})
            .setInternalCmdlineOptions({})
            .setGuid("guid")
            .setDocumentString('<head><meta name="guid" content="guid">');

        var el = Util.createImportLink(document, t);

        el.onload = function onload() {
            URL.revokeObjectURL(el.href);

            expect(Factotum.getFcommandId(el.import)).toEqual(t.getGuid());
            el.remove();
            done();
        };

        document.head.appendChild(el);
    });

}); // getFcommandId

// XXX:  more things in inject.js need tests

}); // inject

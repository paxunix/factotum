"use strict";

import TransferObject from "../../scripts/TransferObject.js";
import Util from "../../scripts/Util.js";

describe("inject", function() {

describe("_getDataAttribute", function() {

    it("retrieves transfer object from an Fcommand's import link data attribute", function(done) {
        var t = new TransferObject()
            .setCommandLine({ a: 1, b: [ { c: 2 } ] })
            .set("_content.internalCmdlineOptions", { debug: false })
            .set("_content.guid", "guid")
            .set("_content.documentString", "testing");

        var el = Util.createImportLink(document, t);

        el.onload = function onload() {
            URL.revokeObjectURL(el.href);

            t.delete("_content.documentString");
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
            .setCommandLine({})
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

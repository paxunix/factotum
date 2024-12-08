"use strict";

import TransferObject from "../../release/scripts/TransferObject.js";
import ContentScript from "../../release/scripts/ContentScript.js";

describe("inject", function() {

describe("_getDataAttribute", function() {

    it("retrieves transfer object from an Fcommand's import link data attribute", function(done) {
        var t = TransferObject.build()
            .setCommandLine({ a: 1, b: [ { c: 2 } ] })
            .set("_content_internalCmdlineOptions", { debug: false })
            .set("_content_guid", "guid")
            .set("_content_documentString", "testing");

        var el = ContentScript.createImportLink(document, t);

        el.onload = function onload() {
            URL.revokeObjectURL(el.href);

            t.delete("_content_documentString");
            expect(JSON.stringify(Factotum._getDataAttribute(document, t.get("_content_guid"), "transferObj"))).toEqual(JSON.stringify(t));
            el.remove();
            done();
        };

        document.head.appendChild(el);
    });
}); // _getDataAttribute


describe("getFcommandId", function() {

    it("retrieves guid from an Fcommand's import document metadata", function(done) {
        var t = TransferObject.build()
            .setCommandLine({})
            .set("_content_internalCmdlineOptions", {})
            .set("_content_guid", "guid")
            .set("_content_documentString", '<head><meta name="guid" content="guid">');

        var el = ContentScript.createImportLink(document, t);

        el.onload = function onload() {
            URL.revokeObjectURL(el.href);

            expect(Factotum.getFcommandId(el.import)).toEqual(t.get("_content_guid"));
            el.remove();
            done();
        };

        document.head.appendChild(el);
    });

}); // getFcommandId

// XXX:  more things in inject.js need tests

}); // inject

"use strict";

import TransferObject from "../../release/scripts/TransferObject.js";
import ContentScript from "../../release/scripts/ContentScript.js";

describe("inject", function() {

describe("_getDataAttribute", function() {

    it("retrieves transfer object from an Fcommand's import link data attribute", function(done) {
        var t = TransferObject.build();
            t.cmdlineOptions = { a: 1, b: [ { c: 2 } ] };
            t._content_internalCmdlineOptions = { debug: false };
            t._content_guid = "guid";
            t._content_documentString = "testing";

        var el = ContentScript.createImportLink(document, t);

        el.onload = function onload() {
            URL.revokeObjectURL(el.href);

            delete t._content_documentString;
            expect(JSON.stringify(Factotum._getDataAttribute(document, t._content_guid, "transferObj"))).toEqual(JSON.stringify(t));
            el.remove();
            done();
        };

        document.head.appendChild(el);
    });
}); // _getDataAttribute


describe("getFcommandId", function() {

    it("retrieves guid from an Fcommand's import document metadata", function(done) {
        var t = TransferObject.build();
            t.cmdlineOptions = {};
            t._content_internalCmdlineOptions = {};
            t._content_guid = "guid";
            t._content_documentString = '<head><meta name="guid" content="guid">';

        var el = ContentScript.createImportLink(document, t);

        el.onload = function onload() {
            URL.revokeObjectURL(el.href);

            expect(Factotum.getFcommandId(el.import)).toEqual(t._content_guid);
            el.remove();
            done();
        };

        document.head.appendChild(el);
    });

}); // getFcommandId

// XXX:  more things in inject.js need tests

}); // inject

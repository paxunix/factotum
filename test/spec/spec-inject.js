"use strict";

describe("inject", function() {

var Util = require("../../scripts/Util.js");

describe("_getDataAttribute", function() {

    it("retrieves object from an Fcommand's import link data attribute", function(done) {
        var cmdline = { a: 1, b: [ { c: 2 } ] };
        var internalOptions = { debug: false };
        var guid = "guid";
        var documentString = "testing";

        var el = Util.createImportLink(document, { cmdline: cmdline, guid: guid, documentString: documentString, internalOptions: internalOptions });

        el.onload = function onload() {
            URL.revokeObjectURL(el.href);

            expect(Factotum._getDataAttribute(document, guid, "fcommandArgs")).toEqual(cmdline);
            el.remove();
            done();
        };

        document.head.appendChild(el);
    });
}); // _getDataAttribute


describe("getFcommandId", function() {

    it("retrieves guid from an Fcommand's import document metadata", function(done) {
        var cmdline = {};
        var internalOptions = {};
        var guid = "guid";
        var documentString = '<head><meta name="guid" content="' + guid + '">';

        var el = Util.createImportLink(document, { cmdline: cmdline, guid: guid, documentString: documentString, internalOptions: internalOptions });

        el.onload = function onload() {
            URL.revokeObjectURL(el.href);

            expect(Factotum.getFcommandId(el.import)).toEqual(guid);
            el.remove();
            done();
        };

        document.head.appendChild(el);
    });

}); // getFcommandId

// XXX:  more things in inject.js need tests

}); // inject

'use strict';

import ContentScript from "./scripts/ContentScript.js";
import TransferObject from "./scripts/TransferObject.js";

describe("ContentScript", function() {


describe("createImportLink", function() {

    it("creates a link from documentString", function() {
        var t = TransferObject.build()
            .setCommandLine({ a: 1, b: [ 2, 3 ], c: { d: "four" } })
            .set("_content_internalCmdlineOptions", { a: 1, b: [ 2, { c: "3" } ] })
            .set("_content_guid", "1234")
            .set("_content_documentString", "docstring");
        var link = ContentScript.createImportLink(document, t);

        expect(link instanceof HTMLLinkElement).toBe(true);
        expect(link.rel).toEqual("import");
        expect(link.id).toEqual(ContentScript.getFcommandImportId(t.get("_content_guid")));
        delete t._content_documentString;     // XXX: ugly hack to remove internals
        expect(link.dataset.transferObj).toEqual(JSON.stringify(t));
        URL.revokeObjectURL(link.href);
    });

}); // createImportLink


describe("getLoadImportPromise", function() {

    // Remove all Fcommand import documents before each spec (since some
    // tests may actually add one)
    beforeEach(async () => {
        document.head.querySelectorAll('link[rel="import"][id^="fcommand-"]').forEach(el => el.remove());
    });

    it("appends a link import element to the document's head", function(done) {
        // Fake the call to add the link element to the document (this is
        // needed so that the import promise is resolved)
        var addToHead = spyOn(ContentScript, "appendNodeToDocumentHead").
            and.callFake(function (obj) {
                obj.onload("{}");
            });
        var t = TransferObject.build().set("_content_documentString", "test");
        var p = ContentScript.getLoadImportPromise(t);

        expect(p instanceof Promise).toBe(true);

        p.then(function (obj) {
            expect(addToHead).toHaveBeenCalled();
            obj = TransferObject.deserialize(obj);
            expect(obj.get("_content_documentString")).toEqual(t.get("_content_documentString"));
            done();
        }).catch(function (obj) {
            // this is a little funky; if the promise was rejected, the test
            // will complain that expect() wasn't called but the test won't
            // actually fail.  So call expect() to get past that
            // requirement, then tell the runner the async part is done,
            // then throw so the test fails.
            expect(obj).toBe({});
            done(obj);
            throw obj;
        });
    });

    it("rejects with error on failure", function(done) {
        // Fake failing to import the doc
        var err = "error loading import";
        var addToHead = spyOn(ContentScript, "appendNodeToDocumentHead").
            and.callFake(function (obj) {
                obj.onerror({ statusText: err });
            });
        var t = TransferObject.build().set("_content_documentString", "test");
        var p = ContentScript.getLoadImportPromise(t);

        expect(p instanceof Promise).toBe(true);

        p.then(function (obj) {
            // this is a little funky; if the promise was resolved, there
            // was no failure and there should have been.  The bogus
            // expect() call is to satisfy the runner, since otherwise the
            // test doesn't actually fail.
            expect(obj).toBe({});
            done();
            throw obj;
        }).catch(function (obj) {
            obj = TransferObject.deserialize(obj);
            expect(addToHead).toHaveBeenCalled();
            expect(obj.get("_content_documentString")).toEqual(t.get("_content_documentString"));
            expect(obj.get("_bg_errorMessage")).toMatch(new RegExp(err));
            done();
        });
    });

    it("rejects if Fcommand hasn't finished yet", function(done) {
        var t = TransferObject.build().set("_content_documentString", "test");
        var p = ContentScript.getLoadImportPromise(t);

        expect(p instanceof Promise).toBe(true);

        p.then(function (obj) {
            // Fcommand has been loaded, so now try to load it again.
            var p2 = ContentScript.getLoadImportPromise(t);
            p2.then(function (obj2) {
                done();
                throw "Should not get here";
            }).catch(function (obj2) {
                // Second load should fail
                expect(obj2.get("_bg_errorMessage")).toMatch(new RegExp("Fcommand.*is still running in this tab"));
                done();
            });
        }).catch(function (obj) {
            done();
            throw "Should not get here";
        });
    });
}); // getLoadImportPromise


}); // ContentScript

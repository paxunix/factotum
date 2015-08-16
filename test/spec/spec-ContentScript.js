'use strict';

describe("ContentScript", function() {

var ContentScript = require("../../scripts/ContentScript.js");
var TransferObject = require("../../scripts/TransferObject.js");

describe("getLoadImportPromise", function() {

    it("appends a link import element to the document's head", function(done) {
        // Fake the call to add the link element to the document (this is
        // needed so that the import promise is resolved)
        var addToHead = spyOn(ContentScript, "appendNodeToDocumentHead").
            and.callFake(function (obj) {
                obj.onload({});
            });
        var t = new TransferObject().set("content.documentString", "test");
        var p = ContentScript.getLoadImportPromise(t);

        expect(p instanceof Promise).toBe(true);

        p.then(function (obj) {
            expect(addToHead).toHaveBeenCalled();
            expect(obj.get("content.documentString")).toEqual(t.get("content.documentString"));
            done();
        }).catch(function (obj) {
            // this is a little funky; if the promise was rejected, the test
            // will complain that expect() wasn't called but the test won't
            // actually fail.  So call expect() to get past that
            // requirement, then tell the runner the async part is done,
            // then throw so the test fails.
            expect(obj).toBe({});
            done();
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
        var t = new TransferObject().set("content.documentString", "test");
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
            expect(addToHead).toHaveBeenCalled();
            expect(obj.get("content.documentString")).toEqual(t.get("content.documentString"));
            expect(obj.get("bg.errorMessage")).toMatch(new RegExp(err));
            done();
        });
    });

    xit("rejects if Fcommand hasn't finished yet", function(done) {
        // XXX: can't do this wihout the Fcommand actually calling
        // onFailure/onSuccess.
        var t = new TransferObject().set("content.documentString", "test");
        var p = ContentScript.getLoadImportPromise(t);

        expect(p instanceof Promise).toBe(true);

        p.then(function (obj) {
            expect(obj).toBe({});

            // Fcommand has been loaded, so now try to load it again.
            var p2 = ContentScript.getLoadImportPromise(t);
            p2.then(function (obj2) {
                done();
                throw "Should not get here";
                }).catch(function (obj2) {
                    // Second load should fail
                    expect(obj2.get("bg.errorMessage")).toMatch(new RegExp("XXX: error string"));
                    done();
                });
        }).catch(function (obj) {
            done();
            throw "Should not get here";
        });
    });
}); // getLoadImportPromise


}); // ContentScript

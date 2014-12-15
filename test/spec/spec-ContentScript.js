'use strict';

describe("ContentScript", function() {

describe("getLoadImportPromise", function() {

    beforeEach(function () {
        // reset the "fcommand is running" cache
        // XXX:  this cache handling needs to be in an object or function
        ContentScript.fcommandRunningCache = { };
    });


    it("appends a link import element to the document's head", function(done) {
        // Fake the call to add the link element to the document (this is
        // needed so that the import promise is resolved)
        var addToHead = spyOn(ContentScript, "appendNodeToDocumentHead").
            and.callFake(function (obj) {
                obj.onload({});
            });
        var p = ContentScript.getLoadImportPromise({
            request: {
                documentString: "test",
            },
            document: document,
        });

        expect(p instanceof Promise).toBe(true);

        p.then(function (obj) {
            expect(addToHead).toHaveBeenCalled();
            expect(obj.document instanceof HTMLDocument).toBe(true);
            expect(obj.request.documentString).toEqual("test");
            expect(obj.linkElement instanceof HTMLLinkElement).toBe(true);
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
        var p = ContentScript.getLoadImportPromise({
            request: {
                documentString: "test",
            },
            document: document,
        });

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
            expect(obj.document instanceof HTMLDocument).toBe(true);
            expect(obj.request.documentString).toEqual("test");
            expect(obj.linkElement instanceof HTMLLinkElement).toBe(true);
            expect(obj.error instanceof Error);
            expect(obj.error.message).toMatch(new RegExp(err));
            done();
        });
    });
}); // getLoadImportPromise


}); // ContentScript

'use strict';

describe("ContentScript", function() {

describe("getLoadImportPromise", function() {

    it("appends a link import element to the document's head", function(done) {
        // Fake the call to add the link element to the document (this is
        // needed so that the import promise is resolved)
        var addToHead = spyOn(ContentScript, "appendNodeToDocumentHead").
            and.callFake(function (obj) {
                obj.onload({});
            });
        var url = "http://www.example.com/";
        var p = ContentScript.getLoadImportPromise({
            request: {
                documentURL: url,
            },
            document: document,
        });

        expect(p instanceof Promise).toBe(true);

        p.then(function (obj) {
            expect(addToHead).toHaveBeenCalled();
            expect(obj.document instanceof HTMLDocument).toBe(true);
            expect(obj.request.documentURL).toEqual(url);
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
        var url = "http://www.example.com/";
        var p = ContentScript.getLoadImportPromise({
            request: {
                documentURL: url,
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
            expect(obj.request.documentURL).toEqual(url);
            expect(obj.linkElement instanceof HTMLLinkElement).toBe(true);
            expect(obj.error instanceof Error);
            expect(obj.error.message).toMatch(new RegExp(err));
            done();
        });
    });
}); // getLoadImportPromise


describe("getFcommandRunPromise", function() {

    it("resolves with the cumulative object and runs the given code string", function(done) {
        var codeString = "var a=42; arguments[0].responseCallback();";
        var obj = {
            // This needs to be kept in sync with what is passed to the
            // Fcommand code within ContentScript.getFcommandRunPromise
            dummy: 1,       // as proof unneeded properties are preserved
            linkElement: { import: "dummy" },
            request: {
                codeString: codeString,
            },
            cmdline: { a: 1 },
        };
        var p = ContentScript.getFcommandRunPromise(obj);

        expect(p instanceof Promise).toBe(true);

        p.then(function (obj) {
            expect(obj).toEqual({
                dummy: 1,
                linkElement: { import: "dummy" },
                request: {
                    codeString: codeString,
                },
                bgCodeArray: undefined,
                cmdline: { a: 1},
            });
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


    it("handles the background code array passed to the response callback", function(done) {
        var codeString = "function func(a) { return a; }; var a=42; arguments[0].responseCallback([func], 42);";
        var obj = {
            // This needs to be kept in sync with what is passed to the
            // Fcommand code within ContentScript.getFcommandRunPromise
            dummy: 1,       // as proof unneeded properties are preserved
            linkElement: { import: "dummy" },
            request: {
                codeString: codeString,
            },
            cmdline: { a: 1 },
        };
        var p = ContentScript.getFcommandRunPromise(obj);

        expect(p instanceof Promise).toBe(true);

        p.then(function (obj) {
            expect(obj.dummy).toEqual(1);
            expect(obj.linkElement).toEqual({ import: "dummy" });
            expect(obj.request).toEqual({ codeString: codeString });
            expect(obj.bgCodeArray[0] instanceof Function).toBe(true);
            expect(obj.cmdline).toEqual({a: 1});
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
        var obj = {
            dummy: 1,
            linkElement: { import: "dummy" },
            request: {
                codeString: "failToRun",
            }
        };
        var p = ContentScript.getFcommandRunPromise(obj);

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
            expect(obj.dummy).toEqual(1);
            expect(obj.linkElement).toEqual({import: "dummy"});
            expect(obj.request).toEqual({ codeString: "failToRun" });
            expect(obj.error).toMatch(/ReferenceError.*failToRun is not defined/);
            done();
        });
    });
}); // getFcommandRunPromise

}); // ContentScript

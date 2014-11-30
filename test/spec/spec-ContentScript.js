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


describe("getFcommandRunPromise", function() {

    it("resolves with the cumulative object and runs the given code string", function(done) {
        var codeString = "var a=42; arguments[0].responseCallback();";
        var initobj = {
            // This needs to be kept in sync with what is passed to the
            // Fcommand code within ContentScript.getFcommandRunPromise
            dummy: 1,       // as proof unneeded properties are preserved
            linkElement: { import: "dummy" },
            request: {
                codeString: codeString,
                cmdline: { a: 1 },
            },
        };
        var p = ContentScript.getFcommandRunPromise(initobj);

        expect(p instanceof Promise).toBe(true);

        p.then(function (obj) {
            expect(obj).toEqual({
                dummy: 1,
                linkElement: { import: "dummy" },
                request: {
                    codeString: codeString,
                    cmdline: { a: 1},
                },
                bgCodeArray: undefined,
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
        var initobj = {
            // This needs to be kept in sync with what is passed to the
            // Fcommand code within ContentScript.getFcommandRunPromise
            dummy: 1,       // as proof unneeded properties are preserved
            linkElement: { import: "dummy" },
            request: {
                codeString: codeString,
                cmdline: { a: 1 },
            },
        };
        var p = ContentScript.getFcommandRunPromise(initobj);

        expect(p instanceof Promise).toBe(true);

        p.then(function (obj) {
            expect(obj.dummy).toEqual(1);
            expect(obj.linkElement).toEqual({ import: "dummy" });
            expect(obj.request).toEqual({ codeString: codeString, cmdline: {a: 1} });
            expect(obj.bgCodeArray[0] instanceof Function).toBe(true);
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


    it("handles an undefined value passed to the response callback", function(done) {
        var codeString = "function func(a) { return a; }; var a=42; arguments[0].responseCallback();";
        var initobj = {
            // This needs to be kept in sync with what is passed to the
            // Fcommand code within ContentScript.getFcommandRunPromise
            linkElement: { import: "dummy" },
            request: {
                codeString: codeString,
                cmdline: { a: 1 },
            },
        };
        var p = ContentScript.getFcommandRunPromise(initobj);

        expect(p instanceof Promise).toBe(true);

        p.then(function (obj) {
            expect(obj.bgCodeArray).toBeUndefined();
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


    it("rejects if a defined, non-array value is passed to the response callback", function(done) {
        var codeString = "function func(a) { return a; }; var a=42; arguments[0].responseCallback(42);";
        var initobj = {
            // This needs to be kept in sync with what is passed to the
            // Fcommand code within ContentScript.getFcommandRunPromise
            linkElement: { import: "dummy" },
            request: {
                codeString: codeString,
                cmdline: { a: 1 },
            },
        };
        var p = ContentScript.getFcommandRunPromise(initobj);

        expect(p instanceof Promise).toBe(true);

        p.then(function (obj) {
            // this is a little funky; if the promise was rejected, the test
            // will complain that expect() wasn't called but the test won't
            // actually fail.  So call expect() to get past that
            // requirement, then tell the runner the async part is done,
            // then throw so the test fails.
            expect(obj).toBe({});
            done();
            throw obj;
        }).catch(function (obj) {
            expect(obj.error).toMatch(/Error.*responseCallback's first argument must be undefined or an array/);
            done();
        });
    });


    it("rejects with error on failure", function(done) {
        var initobj = {
            dummy: 1,
            linkElement: { import: "dummy" },
            request: {
                codeString: "failToRun",
            }
        };
        var p = ContentScript.getFcommandRunPromise(initobj);

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


    it("rejects with a string error if rejected with an Error object on failure", function(done) {
        var initobj = {
            linkElement: { import: "dummy" },
            request: {
                codeString: "failToRun",
            }
        };
        var p = ContentScript.getFcommandRunPromise(initobj);

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
            expect(typeof(obj.error)).toBe("string");
            done();
        });
    });


    it("passes invocation data to the Fcommand code", function(done) {
        var opts = { a: 1 };
        var code = function (cmdobj) {
            cmdobj.responseCallback([
                typeof(cmdobj.importDocument),
                cmdobj.cmdline,
                cmdobj.responseCallback instanceof Function,
            ]);
        };
        var initobj = {
            // This needs to be kept in sync with what is passed to the
            // Fcommand code within ContentScript.getFcommandRunPromise
            linkElement: { import: "dummy" },
            request: {
                codeString: Util.getCodeString([code]),
                cmdline: opts,
            },
        };
        var p = ContentScript.getFcommandRunPromise(initobj);

        expect(p instanceof Promise).toBe(true);

        p.then(function (resolvedWith) {
            expect(resolvedWith.bgCodeArray).toEqual(["string", opts, true]);
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


}); // getFcommandRunPromise


describe("getResponseFuncCaller", function() {

    it("returns a function that calls the bg page's responseFunc and returns the input data object", function() {
        var req = {
            cmdline: { a: 1 },
            internalOptions: { },
        };
        var bgCodeArray = [ function(arg) { return arg; }, 42 ];
        var spy = jasmine.createSpy("responseFunc");
        var func = ContentScript.getResponseFuncCaller(req, spy);
        var resolvedWith = {
            bgCodeArray: bgCodeArray,
            dummy: 1,
        };

        expect(func(resolvedWith)).toBe(resolvedWith);
        expect(spy.calls.argsFor(0)[0].bgCodeString).toMatch(/return arg[^]*42/);
        expect(spy.calls.argsFor(0)[0].error).toBeUndefined();
    });


    it("returns a code string with debugging enabled if debug flag is \"bg\"", function() {
        var req = {
            internalOptions: { debug: "bg" },
        };
        var bgCodeArray = [ function(arg) { return arg; }, 42 ];
        var spy = jasmine.createSpy("responseFunc");
        var func = ContentScript.getResponseFuncCaller(req, spy);
        var resolvedWith = {
            bgCodeArray: bgCodeArray,
            dummy: 1,
        };

        expect(func(resolvedWith)).toBe(resolvedWith);
        expect(spy.calls.argsFor(0)[0].bgCodeString).toMatch(/debugger;[^]*function[^]*return arg[^]*42/);
        expect(spy.calls.argsFor(0)[0].error).toBeUndefined();
    });


    it("returns a code string with no debugging enabled if debug flag is true", function() {
        var req = {
            internalOptions: { debug: true },
        };
        var bgCodeArray = [ function(arg) { return arg; }, 42 ];
        var spy = jasmine.createSpy("responseFunc");
        var func = ContentScript.getResponseFuncCaller(req, spy);
        var resolvedWith = {
            bgCodeArray: bgCodeArray,
            dummy: 1,
        };

        expect(func(resolvedWith)).toBe(resolvedWith);
        expect(spy.calls.argsFor(0)[0].bgCodeString).not.toMatch(/debugger/);
        expect(spy.calls.argsFor(0)[0].error).toBeUndefined();
    });
}); // callResponseFunc


}); // ContentScript

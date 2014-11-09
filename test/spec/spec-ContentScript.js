'use strict';


describe("ContentScript.getLoadImportPromise", function() {

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
            expect(obj).toBe(undefined);
            done();
            throw obj;
        });
    });


}); // ContentScript.getLoadImportPromise


describe("XXX", function() {

    xit("responds with error if the request has no fcommandId", function() {
        var response = jasmine.createSpy("responseFunc");
        factotumListener({}, "", response);

        expect(response.calls.argsFor(0)[0].exception).toMatch(/Error: 'fcommandId' is required/);
    });


    xit("clones the request object in the response", function() {
        var response = jasmine.createSpy("responseFunc");

        // Easiest way to get a response object is to force an error when
        // validating the request, so leave out the fcommandId.
        var params = { test: "10" };
        factotumListener(params, "", response);

        // Change the value in the request to verify the request had been
        // cloned.
        params.test = "20";

        expect(response.calls.argsFor(0)[0].exception).toMatch(/Error: 'fcommandId' is required/);
        expect(response.calls.argsFor(0)[0].request.test).toEqual("10");
    });


    xit("responds with error if the request has no documentString and no documentURL", function() {
        var response = jasmine.createSpy("responseFunc");
        factotumListener({ fcommandId: "test" }, "", response);

        expect(response.calls.argsFor(0)[0].exception).toMatch(/'documentString' or 'documentURL' is required/);
    });


    xit("appends a URL link import element to the document's head", function() {
        var response = jasmine.createSpy("responseFunc");
        var addToHead = spyOn(window, "appendNodeToDocumentHead").and.stub();
        var createImportLink = spyOn(Util, "createImportLink").and.returnValue({});

        factotumListener({
            fcommandId: "test",
            documentURL: "http://www.example.com/",
        }, "", response);

        expect(addToHead).toHaveBeenCalled();
        expect(response).not.toHaveBeenCalled();
    });


    xit("appends a string import element to the document's head", function() {
        var response = jasmine.createSpy("responseFunc");
        var addToHead = spyOn(window, "appendNodeToDocumentHead").and.stub();
        var createImportLink = spyOn(Util, "createImportLink").and.returnValue({});

        factotumListener({
            fcommandId: "test",
            documentString: "<div>some test html</div>",
        }, "", response);

        expect(addToHead).toHaveBeenCalled();
        expect(response).not.toHaveBeenCalled();
    });


    xit("prefers documentString over documentURL", function() {
        var response = jasmine.createSpy("responseFunc");
        var addToHead = spyOn(window, "appendNodeToDocumentHead");
        var createImportLink = spyOn(Util, "createImportLink").and.returnValue({});

        factotumListener({
            fcommandId: "test",
            documentString: "docstring",
            documentURL: "http://www.example.com/",
        }, "", response);

        expect(createImportLink.calls.argsFor(0)[2].documentString).toEqual("docstring");
        expect(createImportLink.calls.argsFor(0)[2].documentURL).toBe(undefined);
        expect(addToHead).toHaveBeenCalled();
        expect(response).not.toHaveBeenCalled();
    });


    xit("returns true to indicate response may be called async", function() {
        var response = jasmine.createSpy("responseFunc");
        var addToHead = spyOn(window, "appendNodeToDocumentHead");
        var createImportLink = spyOn(Util, "createImportLink").and.returnValue({});

        expect(factotumListener({
                fcommandId: "test",
                documentString: "docstring",
                documentURL: "http://www.example.com/",
            }, "", response)).toBe(true);

        expect(addToHead).toHaveBeenCalled();
        expect(response).not.toHaveBeenCalled();
    });


});

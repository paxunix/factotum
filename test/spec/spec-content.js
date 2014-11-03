describe("content script", function() {


describe("factotumListener", function() {


    it("responds with error if the request has no fcommandId", function() {
        var response = jasmine.createSpy("responseFunc");
        factotumListener({}, "", response);

        expect(response.calls.argsFor(0)[0].exception).toMatch(/Error: 'fcommandId' is required/);
    });


    it("clones the request object in the response", function() {
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


    it("responds with error if the request has no documentString and no documentURL", function() {
        var response = jasmine.createSpy("responseFunc");
        factotumListener({ fcommandId: "test" }, "", response);

        expect(response.calls.argsFor(0)[0].exception).toMatch(/'documentString' or 'documentURL' is required/);
    });


    it("appends a URL link import element to the document's head", function() {
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


    it("appends a string import element to the document's head", function() {
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


    it("prefers documentString over documentURL", function() {
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


    it("returns true to indicate response may be called async", function() {
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


}); // factotumListener


}); // content script

describe("Util", function() {


var lang = navigator.language || "en-us";



describe("fetchDocument", function() {


    it("rejects when retrieving an Fcommand document via invalid URL", function(done) {
        var p = Util.fetchDocument("this is not a URL");
        expect(p instanceof Promise).toBe(true);
        p.catch(function (err) {
            expect(err.type).toEqual("error");
            done();
        });
    });


    it("retrieves an Fcommand document via URL", function(done) {
        var p = Util.fetchDocument(chrome.runtime.getURL("example/load-jquery.html"));
        expect(p instanceof Promise).toBe(true);
        p.then(function (response) {
            expect(typeof(response.target.responseText)).toBe("string");
            done();
        });
    });


}); // fetchDocument


describe("getFromLangSelector", function() {


    it("returns first element with exact case-insensitive lang match", function() {
        var docstr = '<div id="bad1" lang="fr"></div>' +
                     '<div id="bad1.5" lang="en-GB"></div>' +
                     '<div id="good" lang="en-Us"></div>' +
                     '<div id="good2" lang="en-Us"></div>' +
                     '<div id="bad2" lang="en-us"></div>';
        var doc = (new DOMParser).parseFromString(docstr, "text/html");
        expect(Util.getFromLangSelector(doc, "div", "en-us").id).toEqual("good");
    });


    it("returns first element with exact lang subtag match", function() {
        var docstr = '<div id="bad1" lang="fr"></div>' +
                     '<div id="good" lang="EN"></div>' +
                     '<div id="good2" lang="EN"></div>' +
                     '<div id="bad3" lang="en"></div>' +
                     '<div id="bad2" lang="fr-fr"></div>';
        var doc = (new DOMParser).parseFromString(docstr, "text/html");
        expect(Util.getFromLangSelector(doc, "div", "en-us").id).toEqual("good");
    });


    it("returns first element with no lang match", function() {
        var docstr = '<div id="bad1" lang="fr"></div>' +
                     '<div id="bad3" lang="en-us-ny"></div>' +
                     '<div id="good"></div>' +
                     '<div id="good2"></div>' +
                     '<div id="bad2" lang="fr-fr"></div>';
        var doc = (new DOMParser).parseFromString(docstr, "text/html");
        expect(Util.getFromLangSelector(doc, "div", "en-us").id).toEqual("good");
    });


    it("returns first element with empty lang match", function() {
        var docstr = '<div id="bad1" lang="fr"></div>' +
                     '<div id="good" lang=""></div>' +
                     '<div id="good2" lang=""></div>' +
                     '<div id="bad2" lang="fr-fr"></div>';
        var doc = (new DOMParser).parseFromString(docstr, "text/html");
        expect(Util.getFromLangSelector(doc, "div", "en-us").id).toEqual("good");
    });


    it("returns null if no lang match", function() {
        var docstr = '<div id="bad1" lang="fr"></div>' +
                     '<div id="bad2" lang="fr-qc"></div>' +
                     '<div id="bad3" lang="fr-fr"></div>';
        var doc = (new DOMParser).parseFromString(docstr, "text/html");
        expect(Util.getFromLangSelector(doc, "div", "en-us")).toBeNull();
    });


    it("returns null if no selector match", function() {
        var docstr = '<div id="bad1" lang="fr"></div>' +
                     '<div id="bad2" lang="fr-qc"></div>' +
                     '<div id="bad3" lang="fr-fr"></div>';
        var doc = (new DOMParser).parseFromString(docstr, "text/html");
        expect(Util.getFromLangSelector(doc, "span", "fr")).toBeNull();
    });


}); // getFromLangSelector


describe("createImportLink", function() {

    it("creates a link from documentString", function() {
        var cmdline = { a: 1, b: [ 2, 3 ], c: { d: "four" } };
        var internalOpts = { a: 1, b: [ 2, { c: "3" } ] };
        var guid = "1234";
        var link = Util.createImportLink(document, {
            documentString: "docstring",
            guid: guid,
            internalOptions: internalOpts,
            cmdline: cmdline,
        });

        expect(link instanceof HTMLLinkElement).toBe(true);
        expect(link.rel).toEqual("import");
        expect(link.id).toEqual(Util.getFcommandImportId(guid));
        expect(link.dataset.fcommandArgs).toEqual(JSON.stringify(cmdline));
        expect(link.dataset.fcommandInternalOptions).toEqual(JSON.stringify(internalOpts));
        URL.revokeObjectURL(link.href);
    });

}); // createImportLink


describe("getCodeString", function() {

    it("returns an evaluateable code string that calls a function with its arguments", function() {
        var f = function (a, b) { return a+b; };
        expect(Util.getCodeString([f, 1, 2])).toBe("return (\nfunction (a, b) { return a+b; }\n)(1,2);");
    });


    it("stringifies the arguments", function() {
        var f = function () { };
        expect(Util.getCodeString([f, { a: [ 1, 2 ] }])).toBe('return (\nfunction () { }\n)({"a":[1,2]});');
    });


    it("with no given additional arguments allows any arguments", function() {
        var f = function () { };
        expect(Util.getCodeString([f])).toBe("return (\nfunction () { }\n).apply(this, arguments);");
    });


    it("with no arguments returns null", function() {
        expect(Util.getCodeString()).toBeNull();
    });


    it("with a null argument returns null", function() {
        expect(Util.getCodeString(null)).toBeNull();
    });


    it("supports boolean opts.debug to inject debugger directive into returned code string", function() {
        var f = function () { };
        expect(Util.getCodeString([f],{ debug: true })).toBe('debugger;\nreturn (\nfunction () { }\n).apply(this, arguments);');
    });


}); // getCodeString


}); // Util

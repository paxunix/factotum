describe("Util", function() {


var lang = navigator.language || "en-us";


describe("extractOptSpec", function() {


    it("throws if input document is invalid", function() {
        expect(function () {
            Util.extractOptSpec(null, lang);
        }).toThrowError(TypeError,
            "Cannot read property 'querySelectorAll' of null");
    });


    it("returns null if document has no template#minimist-opt", function() {
        var doc = (new DOMParser).parseFromString("<div></div>", "text/html");
        expect(Util.extractOptSpec(doc, lang)).toEqual(null);
    });


    it("throws template#minimist-opt's text is not parseable JSON", function() {
        expect(function () {
            var doc = (new DOMParser).
                parseFromString('<template id="minimist-opt">X</template>', "text/html");
            Util.extractOptSpec(doc, lang);
        }).toThrowError(SyntaxError,
            "Unexpected token X");
    });


    it("returns JSON opt-spec", function() {
        var doc = (new DOMParser).
            parseFromString('<template id="minimist-opt">{"string": [ "version" ]}</template>', "text/html");
        ;
        expect(Util.extractOptSpec(doc, lang)).toEqual({ string: [ "version" ] });
    });


}); // extractOptSpec



describe("extractMetadata", function() {


    it("throws if input document is invalid", function() {
        expect(function () {
            Util.extractMetadata(null, lang);
        }).toThrowError(TypeError,
            "Cannot read property 'querySelectorAll' of null");
    });


    it("returns supported data from head's meta tags", function() {
        var docstr = '<head>';
        for (var f of Util.supportedMetaFields)
        {
            docstr += '<meta name="' + f + '" content="test '+ f + '">';
        }

        docstr += '<link rel="icon" href="test icon url">' +
            '</head>';

        var doc = (new DOMParser).parseFromString(docstr, "text/html");

        expect(Util.extractMetadata(doc, lang)).toEqual( {
            author: "test author",
            description: "test description",
            guid: "test guid",
            keywords: [ "testkeywords" ],
            downloadURL: "test downloadURL",
            updateURL: "test updateURL",
            version: "test version",
            context: "test context",
            icon: "test icon url"
        });
    });


    it("returns missing metadata fields as undefined", function() {
        var doc = (new DOMParser).
            parseFromString('<head></head>', "text/html");

        expect(Util.extractMetadata(doc, lang)).toEqual({
            author: undefined,
            description: undefined,
            guid: undefined,
            keywords: undefined,
            downloadURL: undefined,
            updateURL: undefined,
            version: undefined,
            context: undefined,
            icon: undefined
        });
    });


    it("parses keywords delimited by ',' and disregarding whitespace", function() {
        var docstr = '<head>';
        for (var f of Util.requiredFields)
        {
            if (f === "keywords")
                docstr += '<meta name="' + f + '" content=" , , k1 , ,, k2 , , ">';
            else if (f === "version")
                docstr += '<meta name="' + f + '" content="1.2.3">';
            else
                docstr += '<meta name="' + f + '" content="test '+ f + '">';
        }

        docstr += "</head>";

        var doc = (new DOMParser).parseFromString(docstr, "text/html");

        expect(Util.extractMetadata(doc, lang)).toEqual({
            author: "test author",
            description: "test description",
            guid: "test guid",
            keywords: [ "k1", "k2" ],
            version: "1.2.3",
            downloadURL: undefined,
            updateURL: undefined,
            context: undefined,
            icon: undefined
        });
    });


}); // extractMetadata


describe("validateMetadata", function() {


    it("verifies required fields have a defined value", function() {
        var docstr = '<head>';
        for (var f of Util.requiredFields)
        {
            var doc = (new DOMParser).parseFromString(docstr + "</head>", "text/html");
            var meta = Util.extractMetadata(doc, lang);

            expect(function () {
                Util.validateMetadata(meta);
            }).toThrowError("Missing " + f);

            docstr += '<meta name="' + f + '" content="test '+ f + '">';
        }
    });


    it("throws if version is not semver-format", function() {
        var docstr = '<head>';
        for (var f of Util.requiredFields)
        {
            docstr += '<meta name="' + f + '" content="test '+ f + '">';
        }

        docstr += "</head>";

        var doc = (new DOMParser).parseFromString(docstr, "text/html");
        var meta = Util.extractMetadata(doc, lang);

        expect(function () {
            Util.validateMetadata(meta);
        }).toThrowError("Version 'test version' is not semver-valid");
    });


    it("throws if a keyword string is empty", function() {
        var docstr = '<head>';
        for (var f of Util.requiredFields)
        {
            if (f === "keywords")
                docstr += '<meta name="' + f + '" content="">';
            else if (f === "version")
                docstr += '<meta name="' + f + '" content="1.2.3">';
            else
                docstr += '<meta name="' + f + '" content="test '+ f + '">';
        }

        docstr += "</head>";

        var doc = (new DOMParser).parseFromString(docstr, "text/html");

        var meta = Util.extractMetadata(doc, lang);

        expect(function () {
            Util.validateMetadata(meta);
        }).toThrowError("Keyword field must have at least one keyword");
    });
}); // validateMetadata


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

    it("throws if no documentString is given", function() {
        expect(function () {
            Util.createImportLink(document, "test", {});
        }).toThrowError(Error, "documentString is required")
    });

    it("creates a link from documentString", function() {
        var cacheGet = spyOn(Util.blobUrlCache, "get");
        var cacheSet = spyOn(Util.blobUrlCache, "set");

        var link = Util.createImportLink(document, "testid", {
            documentString: "docstring",
        });

        expect(cacheGet).toHaveBeenCalledWith("testid");
        expect(cacheSet.calls.argsFor(0)[0]).toEqual("testid");
        expect(cacheSet.calls.argsFor(0)[1]).toEqual("docstring");
        expect(link instanceof HTMLLinkElement).toBe(true);
        expect(link.id).toEqual("testid");
        expect(link.rel).toEqual("import");
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

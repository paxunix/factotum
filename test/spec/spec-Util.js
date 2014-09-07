describe("Util.extractOptSpec", function() {


    it("throws if input document is invalid", function() {
        expect(function () {
            Util.extractOptSpec(null);
        }).toThrowError(TypeError,
            "Cannot read property 'querySelector' of null");
    });


    it("throws if document has no #minimist-opt", function() {
        expect(function () {
            var doc = (new DOMParser).parseFromString("<div></div>", "text/html");
            Util.extractOptSpec(doc);
        }).toThrowError(Error,
            "template#minimist-opt is missing");
    });


    it("throws if document's #minimist-opt is not a <template>", function() {
        expect(function () {
            var doc = (new DOMParser).parseFromString('<div id="minimist-opt"></div>', "text/html");
            Util.extractOptSpec(doc);
        }).toThrowError(Error,
            "template#minimist-opt is missing");
    });


    it("throws template#minimist-opt's text is not parseable JSON", function() {
        expect(function () {
            var doc = (new DOMParser).
                parseFromString('<template id="minimist-opt">X</template>', "text/html");
            Util.extractOptSpec(doc);
        }).toThrowError(SyntaxError,
            "Unexpected token X");
    });


    it("returns JSON opt-spec", function() {
        var doc = (new DOMParser).
            parseFromString('<template id="minimist-opt">{"string": [ "version" ]}</template>', "text/html");
        ;
        expect(Util.extractOptSpec(doc)).toEqual({ string: [ "version" ] });
    });


}); // Util.extractOptSpec



describe("Util.extractMetadata", function() {


    it("throws if input document is invalid", function() {
        expect(function () {
            Util.extractMetadata(null);
        }).toThrowError(TypeError,
            "Cannot read property 'querySelector' of null");
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

        expect(Util.extractMetadata(doc)).toEqual( {
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

        expect(Util.extractMetadata(doc)).toEqual({
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

        expect(Util.extractMetadata(doc)).toEqual({
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


}); // Util.extractMetadata


describe("Util.validateMetadata", function() {


    it("verifies required fields have a defined value", function() {
        var docstr = '<head>';
        for (var f of Util.requiredFields)
        {
            var doc = (new DOMParser).parseFromString(docstr + "</head>", "text/html");
            var meta = Util.extractMetadata(doc);

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
        var meta = Util.extractMetadata(doc);

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

        var meta = Util.extractMetadata(doc);

        expect(function () {
            Util.validateMetadata(meta);
        }).toThrowError("Keyword string can't be empty");
    });
}); // Util.validateMetadata

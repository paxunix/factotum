describe("Fcommand", function () {

var lang = navigator.language || "en-us";


describe("_extractMetadata", function() {


    it("throws if input document is invalid", function() {
        expect(function () {
            Fcommand._extractMetadata(null, lang);
        }).toThrowError(TypeError,
            "Cannot read property 'querySelectorAll' of null");
    });


    it("returns supported data from head's meta tags", function() {
        var docstr = '<head>';
        for (var f of Fcommand._supportedStringMetaFields)
        {
            docstr += '<meta name="' + f + '" content="test '+ f + '">';
        }

        docstr += '<link rel="icon" href="test icon url">' +
            '</head>';

        var doc = (new DOMParser).parseFromString(docstr, "text/html");

        expect(Fcommand._extractMetadata(doc, lang)).toEqual( {
            author: "test author",
            description: "test description",
            guid: "test guid",
            keywords: [ "test", "keywords" ],
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

        expect(Fcommand._extractMetadata(doc, lang)).toEqual({
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
        for (var f of Fcommand._requiredFields)
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

        expect(Fcommand._extractMetadata(doc, lang)).toEqual({
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


}); // _extractMetadata


describe("_validateMetadata", function() {


    it("verifies required fields have a defined value", function() {
        var docstr = '<head>';
        for (var f of Fcommand._requiredFields)
        {
            var doc = (new DOMParser).parseFromString(docstr + "</head>", "text/html");
            var meta = Fcommand._extractMetadata(doc, lang);

            expect(function () {
                Fcommand._validateMetadata(meta);
            }).toThrowError("Metadata is missing required field " + f);

            docstr += '<meta name="' + f + '" content="test '+ f + '">';
        }
    });


    it("throws if version is not semver-format", function() {
        var docstr = '<head>';
        for (var f of Fcommand._requiredFields)
        {
            docstr += '<meta name="' + f + '" content="test '+ f + '">';
        }

        docstr += "</head>";

        var doc = (new DOMParser).parseFromString(docstr, "text/html");
        var meta = Fcommand._extractMetadata(doc, lang);

        expect(function () {
            Fcommand._validateMetadata(meta);
        }).toThrowError("Metadata version 'test version' is not semver-compliant");
    });


    it("throws if a keyword string is empty", function() {
        var docstr = '<head>';
        for (var f of Fcommand._requiredFields)
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

        var meta = Fcommand._extractMetadata(doc, lang);

        expect(function () {
            Fcommand._validateMetadata(meta);
        }).toThrowError("Metadata keyword field must have at least one keyword");
    });
}); // _validateMetadata


describe("_extractOptSpec", function() {


    it("throws if input document is invalid", function() {
        expect(function () {
            Fcommand._extractOptSpec(null, lang);
        }).toThrowError(TypeError,
            "Cannot read property 'querySelectorAll' of null");
    });


    it("returns null if document has no template#getopt", function() {
        var doc = (new DOMParser).parseFromString("<div></div>", "text/html");
        expect(Fcommand._extractOptSpec(doc, lang)).toEqual(null);
    });


    it("throws if template#getopt's text is not parseable JSON", function() {
        var doc = (new DOMParser).
            parseFromString('<template id="getopt">X</template>', "text/html");

        try {
            Fcommand._extractOptSpec(doc, lang);
        }

        catch (e)
        {
            expect(e.message).toMatch(/^Failed parsing template#getopt: SyntaxError: Unexpected token X/);
        }
    });


    it("returns JSON opt-spec", function() {
        var doc = (new DOMParser).
            parseFromString('<template id="getopt">{"opt": { "type": "value" }}</template>', "text/html");
        ;
        expect(Fcommand._extractOptSpec(doc, lang)).toEqual({ opt: { type: "value" }});
    });


    it("can handle an opt-spec block with HTML comments and being wrapped in <script>", function() {
        var doc = (new DOMParser).
            parseFromString('<template id="getopt"><!-- a comment --><script>{"opt": { "type": "value" }}</script></template>', "text/html");
        ;
        expect(Fcommand._extractOptSpec(doc, lang)).toEqual({ opt: { type: "value" }});
    });


}); // extractOptSpec


// XXX:  constructor needs tests


}); // Fcommand

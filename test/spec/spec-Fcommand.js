describe("Fcommand", function () {

var lang = navigator.language || "en-us";
var Fcommand = require("../../scripts/Fcommand.js");


describe("_extractMetadata", function() {


    it("throws if input document is invalid", function() {
        expect(function () {
            Fcommand._extractMetadata(null, lang);
        }).toThrowError(TypeError,
            "Cannot read property 'querySelectorAll' of null");
    });


    it("returns supported data from head's meta tags", function() {
        var docstr = '<head>';
        for (var f = 0; f < Fcommand._supportedStringMetaFields.length; ++f)
        {
            var el = Fcommand._supportedStringMetaFields[f];
            docstr += '<meta name="' + el + '" content="test '+ el + '">';
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
        for (var f = 0; f < Fcommand._requiredFields.length; ++f)
        {
            var el = Fcommand._requiredFields[f];
            if (el === "keywords")
                docstr += '<meta name="' + el + '" content=" , , k1 , ,, k2 , , ">';
            else if (el === "version")
                docstr += '<meta name="' + el + '" content="1.2.3">';
            else
                docstr += '<meta name="' + el + '" content="test '+ el + '">';
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
        for (var f = 0; f < Fcommand._requiredFields.length; ++f)
        {
            var el = Fcommand._requiredFields[f];
            var doc = (new DOMParser).parseFromString(docstr + "</head>", "text/html");
            var meta = Fcommand._extractMetadata(doc, lang);

            expect(function () {
                Fcommand._validateMetadata(meta);
            }).toThrowError("Metadata is missing required field " + el);

            docstr += '<meta name="' + el + '" content="test '+ el + '">';
        }
    });


    it("throws if version is not semver-format", function() {
        var docstr = '<head>';
        for (var f = 0; f< Fcommand._requiredFields.length; ++f)
        {
            var el = Fcommand._requiredFields[f];
            docstr += '<meta name="' + el + '" content="test '+ el + '">';
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
        for (var f = 0; f < Fcommand._requiredFields.length; ++f)
        {
            var el = Fcommand._requiredFields[f];
            if (el === "keywords")
                docstr += '<meta name="' + el + '" content="">';
            else if (el === "version")
                docstr += '<meta name="' + el + '" content="1.2.3">';
            else
                docstr += '<meta name="' + el + '" content="test '+ el + '">';
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


}); // _extractOptSpec


describe("_extractBgCodeString", function() {


    it("throws if input document is invalid", function() {
        expect(function () {
            Fcommand._extractBgCodeString(null, lang);
        }).toThrowError(TypeError,
            "Cannot read property 'querySelectorAll' of null");
    });


    it("returns null if document has no template#bgCode", function() {
        var doc = (new DOMParser).parseFromString("<div></div>", "text/html");
        expect(Fcommand._extractBgCodeString(doc, lang)).toEqual(null);
    });


    it("returns string bg code", function() {
        var s = "function () { return 10; }";
        var doc = (new DOMParser).
            parseFromString('<template id="bgCode">' + s + '</template>', "text/html");
        ;
        expect(Fcommand._extractBgCodeString(doc, lang)).toEqual(s);
    });


    it("can handle a bg code block with HTML comments and being wrapped in <script>", function() {
        var s = "function () { return 10; }";
        var doc = (new DOMParser).
            parseFromString('<template id="bgCode"><!-- a comment --><script>' + s + '</script></template>', "text/html");
        ;
        expect(Fcommand._extractBgCodeString(doc, lang).indexOf(s)).not.toEqual(-1);
    });


}); // _extractBgCodeString


describe("_getFromLangSelector", function() {


    it("returns first element with exact case-insensitive lang match", function() {
        var docstr = '<div id="bad1" lang="fr"></div>' +
                     '<div id="bad1.5" lang="en-GB"></div>' +
                     '<div id="good" lang="en-Us"></div>' +
                     '<div id="good2" lang="en-Us"></div>' +
                     '<div id="bad2" lang="en-us"></div>';
        var doc = (new DOMParser).parseFromString(docstr, "text/html");
        expect(Fcommand._getFromLangSelector(doc, "div", "en-us").id).toEqual("good");
    });


    it("returns first element with exact lang subtag match", function() {
        var docstr = '<div id="bad1" lang="fr"></div>' +
                     '<div id="good" lang="EN"></div>' +
                     '<div id="good2" lang="EN"></div>' +
                     '<div id="bad3" lang="en"></div>' +
                     '<div id="bad2" lang="fr-fr"></div>';
        var doc = (new DOMParser).parseFromString(docstr, "text/html");
        expect(Fcommand._getFromLangSelector(doc, "div", "en-us").id).toEqual("good");
    });


    it("returns first element with no lang match", function() {
        var docstr = '<div id="bad1" lang="fr"></div>' +
                     '<div id="bad3" lang="en-us-ny"></div>' +
                     '<div id="good"></div>' +
                     '<div id="good2"></div>' +
                     '<div id="bad2" lang="fr-fr"></div>';
        var doc = (new DOMParser).parseFromString(docstr, "text/html");
        expect(Fcommand._getFromLangSelector(doc, "div", "en-us").id).toEqual("good");
    });


    it("returns first element with empty lang match", function() {
        var docstr = '<div id="bad1" lang="fr"></div>' +
                     '<div id="good" lang=""></div>' +
                     '<div id="good2" lang=""></div>' +
                     '<div id="bad2" lang="fr-fr"></div>';
        var doc = (new DOMParser).parseFromString(docstr, "text/html");
        expect(Fcommand._getFromLangSelector(doc, "div", "en-us").id).toEqual("good");
    });


    it("returns null if no lang match", function() {
        var docstr = '<div id="bad1" lang="fr"></div>' +
                     '<div id="bad2" lang="fr-qc"></div>' +
                     '<div id="bad3" lang="fr-fr"></div>';
        var doc = (new DOMParser).parseFromString(docstr, "text/html");
        expect(Fcommand._getFromLangSelector(doc, "div", "en-us")).toBeNull();
    });


    it("returns null if no selector match", function() {
        var docstr = '<div id="bad1" lang="fr"></div>' +
                     '<div id="bad2" lang="fr-qc"></div>' +
                     '<div id="bad3" lang="fr-fr"></div>';
        var doc = (new DOMParser).parseFromString(docstr, "text/html");
        expect(Fcommand._getFromLangSelector(doc, "span", "fr")).toBeNull();
    });


}); // _getFromLangSelector



// XXX:  constructor needs tests


}); // Fcommand

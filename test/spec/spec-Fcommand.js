"use strict";

describe("Fcommand", function () {

var lang = "en-us";
var Fcommand = require("../../scripts/Fcommand.js");

function buildMetaTag(field, value, lang)
{
    return [
        '<meta name="', field, '" content="', value, '" ',
            (typeof(lang) !== "undefined" ? 'lang="' + lang + '" ' : ""),
        '>'
    ].join('');
}

function buildOneFieldDocString(field, value)
{
    return [
        '<head>',
        '<meta name="', field, '" content="', value, '">',
        '</head>'
    ].join('');
}


describe("_getMetadataFieldString", function() {

    it("returns a language-specific meta field's value trimmed of whitespace", function() {
        var dom = Fcommand._parseDomFromString(buildOneFieldDocString("test", " \n v a l u e \t "));

        // to presume it is doing lang-specific lookup
        spyOn(Fcommand, "_getFromLangSelector").and.callThrough();

        expect(Fcommand._getMetadataFieldString("test", dom, lang)).toEqual("v a l u e");
        expect(Fcommand._getFromLangSelector).toHaveBeenCalled();
    });

    it("returns null if the meta field isn't found", function() {
        var dom = Fcommand._parseDomFromString("no meta document");

        expect(Fcommand._getMetadataFieldString("test", dom, lang)).toBe(null);
    });

    it("returns empty string if the meta field is only whitespace", function() {
        var dom = Fcommand._parseDomFromString(buildOneFieldDocString("test", " \n \t "));

        expect(Fcommand._getMetadataFieldString("test", dom, lang)).toEqual("");
    });

    it("returns empty string if the meta field is empty", function() {
        var dom = Fcommand._parseDomFromString(buildOneFieldDocString("test", ""));

        expect(Fcommand._getMetadataFieldString("test", dom, lang)).toEqual("");
    });
});


describe("_extractData", function() {


    it("returns null or empty objects for any fields not found in Fcommand document", function() {
        expect(Fcommand._extractData("", lang)).toEqual({
            author: null,
            bgCodeString: null,
            context: null,
            description: null,
            downloadUrl: null,
            guid: null,
            helpMarkup: null,
            icon: null,
            keywords: [],
            optspec: {},
            title: null,
            updateUrl: null,
            version: null,
        });
    });


    it("parses keywords delimited by ',' and disregarding whitespace", function() {
        var doc = buildOneFieldDocString("keywords", " , \n , k1 , ,, k2 , \t , ");
        expect(Fcommand._extractData(doc, lang).keywords).toEqual([ "k1", "k2" ]);
    });

    // XXX: tests for other fields

}); // _extractData


describe("_validateData", function() {

    it("validates required fields", function() {
        try {
            Fcommand._validateData({
                author: null,
                bgCodeString: null,
                context: null,
                description: null,
                downloadUrl: null,
                guid: null,
                helpMarkup: null,
                icon: null,
                keywords: [],
                optspec: {},
                title: null,
                updateUrl: null,
                version: null,
            });
        }

        catch (e) {
            expect(e).toMatch(/Fcommand field 'author' is required/);
            expect(e).toMatch(/Fcommand field 'description' is required/);
            expect(e).toMatch(/Fcommand field 'guid' is required/);
            expect(e).toMatch(/Fcommand field 'keywords' must have at least one keyword/);
            expect(e).toMatch(/Fcommand field 'title' is required/);
            expect(e).toMatch(/Fcommand field 'version'='null' is not semver-compliant/);
        }
    });
}); // _validateData


describe("_extractOptSpec", function() {


    it("throws if input document is invalid", function() {
        expect(function () {
            Fcommand._extractOptSpec(null, lang);
        }).toThrowError(TypeError,
            "Cannot read property 'querySelectorAll' of null");
    });


    it("returns empty object if document has no template#getopt", function() {
        var doc = (new DOMParser).parseFromString("<div></div>", "text/html");
        expect(Fcommand._extractOptSpec(doc, lang)).toEqual({});
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

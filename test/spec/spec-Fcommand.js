"use strict";

describe("Fcommand", function () {

var lang = "en-us";
var Fcommand = require("../../scripts/Fcommand.js");
var TransferObject = require("../../scripts/TransferObject.js");

function buildMetaTag(field, value, lang)
{
    return [
        '<meta name="', field, '" content="', value, '" ',
            (lang !== undefined ? 'lang="' + lang + '" ' : ""),
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
            menu: [],
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


    it("parses 'menu' delimited by ',' and disregarding whitespace", function() {
        var doc = buildOneFieldDocString("menu", " , \n , k1 , ,, k2 , \t , ");
        expect(Fcommand._extractData(doc, lang).menu).toEqual([ "k1", "k2" ]);
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


describe("constructor", function() {
    var doc = [
        '<head>',
        '<title>test title</title>',
        '<meta name="author" content="test author">',
        '<meta name="description" content="test description">',
        '<meta name="description" lang="fr" content="french test description">',
        '<meta name="guid" content="test guid">',
        '<meta name="keywords" content="testkey1, testkey2">',
        '<meta name="downloadUrl" content="test download url">',
        '<meta name="updateUrl" content="test update url">',
        '<meta name="version" content="0.0.1">',
        '<meta name="context" content="page">',
        '<meta name="menu" content="all,launcher">',
        '<link rel="icon" type="image/png" href="test icon url">',
        '</head>',
        '<body>',
        '<template id="help" lang="en">',
        'help content <!-- not ignored comment -->',
        '</template>',
        '<template id="getopt">',
        '<!-- ignored comment and script tag-->',
        '<script>',
        '{ "opt": { "type": "value", "default": "def" } }',
        '</script>',
        '</template>',
        '<template id="bgCode">',
        '<!-- ignored comment and script tag--><script>return "in bg";</script>',
        '</template>',
        '</body>',
    ].join("\n");

    it("constructs an fcommand object from a valid Fcommand document", function() {
        var fcommand = new Fcommand(doc, lang);

        // expect() doesn't properly compare a class instance, thus the
        // apparent redundancy of JSON parse and stringify
        expect(JSON.parse(JSON.stringify(fcommand))).toEqual({
            documentString: doc,
            enabled: true,
            order: 0,
            lastUpdateTime: jasmine.any(Number),
            extractedData: {
                author: "test author",
                bgCodeString: "\nreturn \"in bg\";\n",
                context: "page",
                description: "test description",
                downloadUrl: "test download url",
                guid: "test guid",
                helpMarkup: "\nhelp content <!-- not ignored comment -->\n",
                icon: "test icon url",
                keywords: [ "testkey1", "testkey2" ],
                menu: [ "all", "launcher" ],
                optspec: { opt: { type: "value", default: "def" } },
                title: "test title",
                updateUrl: "test update url",
                version: "0.0.1",
            },
        });
        expect(fcommand instanceof Fcommand).toBe(true);
    });

    it("throws if Fcommand document fails validation", function() {
        try {
            var fcommand = new Fcommand("", lang);
            throw "This should not happen";
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

}); // constructor


describe("runBgCode", function() {

    // Minimal test Fcommand with bgCode
    var doc = [
        '<head>',
        '<title>test title</title>',
        '<meta name="author" content="test author">',
        '<meta name="description" content="test description">',
        '<meta name="guid" content="test guid">',
        '<meta name="keywords" content="testkey1, testkey2">',
        '<meta name="version" content="0.0.1">',
        '</head>',
        '<body>',
        '<template id="bgCode">',
        'window.fcommandBgSpy(transferObj);',
        '</template>',
        '</body>',
    ].join("\n");

    var fcommand = new Fcommand(doc, lang);

    beforeEach(function () {
        window.fcommandBgSpy = jasmine.createSpy("fcommandBgSpy");
    });

    it("includes Fcommand DOM in transfer object", function () {
        var obj = new TransferObject({
            cmdlineOptions: {},       // always present on TransferObjects passed to runBgCode()
            "_content.internalCmdlineOptions": {},       // always present on TransferObjects passed to runBgCode()
        });
        fcommand.runBgCode(obj);

        expect(window.fcommandBgSpy).toHaveBeenCalledWith(jasmine.any(TransferObject));
        expect(window.fcommandBgSpy.calls.first().args[0].get("_bg.fcommandDocument") instanceof HTMLDocument).toBe(true);
    });


    it("enables debug mode if requested", function () {
        // This test is imperfect, since it can't catch actually dropping
        // into the debugger.  Instead, it checks for the presence of the
        // 'debugger' statement that was injected by runBgCode().
        var doc = [
            '<head>',
            '<title>test title</title>',
            '<meta name="author" content="test author">',
            '<meta name="description" content="test description">',
            '<meta name="guid" content="test guid">',
            '<meta name="keywords" content="testkey1, testkey2">',
            '<meta name="version" content="0.0.1">',
            '</head>',
            '<body>',
            '<template id="bgCode">',
            'window.fcommandBgSpy(arguments.callee.toString());',
            '</template>',
            '</body>',
        ].join("\n");

        var fcommand = new Fcommand(doc, lang);

        var obj = new TransferObject({
            cmdlineOptions: {},       // always present on TransferObjects passed to runBgCode()
            "_content.internalCmdlineOptions": { bgdebug: true},
        });

        fcommand.runBgCode(obj);

        expect(window.fcommandBgSpy.calls.first().args[0]).toMatch(/d\ebugger;/);
    });
}); // runBgCode


}); // Fcommand

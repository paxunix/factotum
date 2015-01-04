"use strict";

describe("FactotumBg", function () {

var FactotumBg = require("../../scripts/FactotumBg.js");
var Fcommand = require("../../scripts/Fcommand.js");

function getTestFcommand(guid, bgCodeString)
{
    var doc = [
        '<head>',
        '<title>test title</title>',
        '<meta name="author" content="test author">',
        '<meta name="description" content="test description">',
        '<meta name="guid" content="' + guid + '">',
        '<meta name="keywords" content="testkey1">',
        '<meta name="version" content="0.0.1">',
        '</head>',
        '<body>',
        '<template id="bgCode">',
        bgCodeString,
        '</template>',
        '</body>',
    ].join("\n");

    return new Fcommand(doc, "en");
}


describe("checkInternalOptions", function() {
    it("accepts fg and bg debug options anywhere in command line", function () {
        expect(FactotumBg.checkInternalOptions(["--bg-debug", "a"]).bgdebug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "--bg-debug", "a"]).bgdebug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "a", "--bg-debug"]).bgdebug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["--bgdebug", "a"]).bgdebug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "--bgdebug", "a"]).bgdebug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "a", "--bgdebug"]).bgdebug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["--debug", "test", "a"]).debug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "--debug", "a"]).debug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "a", "--debug"]).debug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["--fg-debug", "test", "a"]).debug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "--fg-debug", "a"]).debug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "a", "--fg-debug"]).debug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["--fgdebug", "test", "a"]).debug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "--fgdebug", "a"]).debug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "a", "--fgdebug"]).debug).toBe(true);
    });

    it("accepts --help option anywhere in command line", function () {
        expect(FactotumBg.checkInternalOptions(["--help", "test", "a"]).help).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "--help", "a"]).help).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "a", "--help"]).help).toBe(true);
    });
}); // checkInternalOptions


describe("getOmniboxDescription", function() {
    it("returns a default description if no opts", function () {
        expect(FactotumBg.getOmniboxDescription(null, {}))
            .toEqual("Enter a command and arguments");

        expect(FactotumBg.getOmniboxDescription(null, { _: [] }))
            .toEqual("Enter a command and arguments");

        expect(FactotumBg.getOmniboxDescription(null))
            .toEqual("Enter a command and arguments");
    });

    it("returns markup for title", function () {
        expect(FactotumBg.getOmniboxDescription("title", { _: [ "" ] }))
            .toEqual("<url>title</url>");
    });

    it("returns markup for title, keyword", function () {
        expect(FactotumBg.getOmniboxDescription("title", { _: [ "key" ] }))
            .toEqual("<url>title</url> <match>key</match>");
    });

    it("returns markup for title, keyword, args", function () {
        expect(FactotumBg.getOmniboxDescription("title", { _: [ "key", "arg1", "arg2" ] }))
            .toEqual("<url>title</url> <match>key</match> <dim>arg1 arg2</dim>");
    });

    it("returns markup for no title, keyword", function () {
        expect(FactotumBg.getOmniboxDescription("", { _: [ "key" ] }))
            .toEqual("<match>key</match>");

        expect(FactotumBg.getOmniboxDescription(null, { _: [ "key" ] }))
            .toEqual("<match>key</match>");
    });

    it("returns markup for title, keyword, and internal options", function () {
        expect(FactotumBg.getOmniboxDescription("title", { _: [ "key", "arg1", "arg2" ], debug: true, bgdebug: true, help: true }))
            .toEqual("<url>title</url> <match>key</match> <dim>--bg-debug --debug --help arg1 arg2</dim>");
    });

    it("returns markup if title has characters needing escape", function () {
        expect(FactotumBg.getOmniboxDescription("title<>&'\"end", { _: [ "" ] }))
            .toEqual("<url>title&#60;&#62;&#38;&#39;&#34;end</url>");
    });

    it("returns markup if keyword has characters needing escape", function () {
        expect(FactotumBg.getOmniboxDescription("title", { _: [ "key<>&'\"end" ] }))
            .toEqual("<url>title</url> <match>key&#60;&#62;&#38;&#39;&#34;end</match>");
    });

    it("returns markup if args has characters needing escape", function () {
        expect(FactotumBg.getOmniboxDescription("title", { _: [ "key", "arg<>&'\"end" ] }))
            .toEqual("<url>title</url> <match>key</match> <dim>arg&#60;&#62;&#38;&#39;&#34;end</dim>");
    });
}); // getOmniboxDescription


describe("replaceHtmlEntities", function() {
    it("replaces the necessary characters with HTML entities", function () {
        expect(FactotumBg.replaceHtmlEntities("<>&'\""))
            .toEqual("&#60;&#62;&#38;&#39;&#34;");
    });
}); // replaceHtmlEntities


describe("stringifyInternalOptions", function() {
    it("returns an empty string if no options", function () {
        expect(FactotumBg.stringifyInternalOptions({}))
            .toEqual("");
    });

    it("returns --bg-debug for bgdebug option", function () {
        expect(FactotumBg.stringifyInternalOptions({ bgdebug: true }))
            .toEqual("--bg-debug");
    });

    it("returns --debug for debug option", function () {
        expect(FactotumBg.stringifyInternalOptions({ debug: true }))
            .toEqual("--debug");
    });

    it("returns --help for help option", function () {
        expect(FactotumBg.stringifyInternalOptions({ help: true }))
            .toEqual("--help");
    });

    it("returns all-option string if each option true", function () {
        expect(FactotumBg.stringifyInternalOptions({ help: true, bgdebug: true, debug: true }))
            .toEqual("--bg-debug --debug --help");
    });

}); // stringifyInternalOptions


}); // FactotumBg

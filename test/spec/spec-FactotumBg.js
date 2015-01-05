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


describe("parseInternalOptions", function() {
    it("accepts fg and bg debug options anywhere in command line", function () {
        expect(FactotumBg.parseInternalOptions(["--bg-debug", "a"]).bgdebug).toBe(true);

        expect(FactotumBg.parseInternalOptions(["test", "--bg-debug", "a"]).bgdebug).toBe(true);

        expect(FactotumBg.parseInternalOptions(["test", "a", "--bg-debug"]).bgdebug).toBe(true);

        expect(FactotumBg.parseInternalOptions(["--bgdebug", "a"]).bgdebug).toBe(true);

        expect(FactotumBg.parseInternalOptions(["test", "--bgdebug", "a"]).bgdebug).toBe(true);

        expect(FactotumBg.parseInternalOptions(["test", "a", "--bgdebug"]).bgdebug).toBe(true);

        expect(FactotumBg.parseInternalOptions(["--debug", "test", "a"]).debug).toBe(true);

        expect(FactotumBg.parseInternalOptions(["test", "--debug", "a"]).debug).toBe(true);

        expect(FactotumBg.parseInternalOptions(["test", "a", "--debug"]).debug).toBe(true);

        expect(FactotumBg.parseInternalOptions(["--fg-debug", "test", "a"]).debug).toBe(true);

        expect(FactotumBg.parseInternalOptions(["test", "--fg-debug", "a"]).debug).toBe(true);

        expect(FactotumBg.parseInternalOptions(["test", "a", "--fg-debug"]).debug).toBe(true);

        expect(FactotumBg.parseInternalOptions(["--fgdebug", "test", "a"]).debug).toBe(true);

        expect(FactotumBg.parseInternalOptions(["test", "--fgdebug", "a"]).debug).toBe(true);

        expect(FactotumBg.parseInternalOptions(["test", "a", "--fgdebug"]).debug).toBe(true);
    });

    it("accepts --help option anywhere in command line", function () {
        expect(FactotumBg.parseInternalOptions(["--help", "test", "a"]).help).toBe(true);

        expect(FactotumBg.parseInternalOptions(["test", "--help", "a"]).help).toBe(true);

        expect(FactotumBg.parseInternalOptions(["test", "a", "--help"]).help).toBe(true);
    });
}); // parseInternalOptions


describe("getOmniboxSuggestion", function() {
    it("returns a default description if no opts", function () {
        expect(FactotumBg.getOmniboxSuggestion(null, {}))
            .toEqual({
                description: "Enter a command and arguments",
                content: ""
            });

        expect(FactotumBg.getOmniboxSuggestion(null, { _: [] }))
            .toEqual({
                description: "Enter a command and arguments",
                content: ""
            });

        expect(FactotumBg.getOmniboxSuggestion(null))
            .toEqual({
                description: "Enter a command and arguments",
                content: ""
            });
    });

    it("returns markup for title", function () {
        expect(FactotumBg.getOmniboxSuggestion("title", { _: [ "" ] }))
            .toEqual({
                description: "<url>title</url>",
                content: ""
            });
    });

    it("returns markup for title, keyword", function () {
        expect(FactotumBg.getOmniboxSuggestion("title", { _: [ "key" ] }))
            .toEqual({
                description: "<url>title</url> <match>key</match>",
                content: "key"
            });
    });

    it("returns markup for title, keyword, args", function () {
        expect(FactotumBg.getOmniboxSuggestion("title", { _: [ "key", "arg1", "arg2" ] }))
            .toEqual({
                description: "<url>title</url> <match>key</match> <dim>arg1 arg2</dim>",
                content: "key arg1 arg2"
            });
    });

    it("returns markup for no title, keyword", function () {
        expect(FactotumBg.getOmniboxSuggestion("", { _: [ "key" ] }))
            .toEqual({
                description: "<match>key</match>",
                content: "key"
            });

        expect(FactotumBg.getOmniboxSuggestion(null, { _: [ "key" ] }))
            .toEqual({
                description: "<match>key</match>",
                content: "key"
            });
    });

    it("returns markup for title, keyword, and internal options", function () {
        expect(FactotumBg.getOmniboxSuggestion("title", { _: [ "key", "arg1", "arg2" ], debug: true, bgdebug: true, help: true }))
            .toEqual({
                description: "<url>title</url> <match>key</match> <dim>--bg-debug --debug --help arg1 arg2</dim>",
                content: "key --bg-debug --debug --help arg1 arg2"
            });
    });

    it("returns markup if title has characters needing escape", function () {
        expect(FactotumBg.getOmniboxSuggestion("title<>&'\"end", { _: [ "" ] }))
            .toEqual({
                description: "<url>title&#60;&#62;&#38;&#39;&#34;end</url>",
                content: ""
            });
    });

    it("returns markup if keyword has characters needing escape", function () {
        expect(FactotumBg.getOmniboxSuggestion("title", { _: [ "key<>&'\"end" ] }))
            .toEqual({
                description: "<url>title</url> <match>key&#60;&#62;&#38;&#39;&#34;end</match>",
                content: "key<>&'\"end"
            });
    });

    it("returns markup if args has characters needing escape", function () {
        expect(FactotumBg.getOmniboxSuggestion("title", { _: [ "key", "arg<>&'\"end" ] }))
            .toEqual({
                description: "<url>title</url> <match>key</match> <dim>arg&#60;&#62;&#38;&#39;&#34;end</dim>",
                content: "key arg<>&'\"end"
            });
    });

    it("doesn't modify the input object's _ array", function () {
        var cmdline = "cmd --bg-debug arg1 --debug arg2 --help arg3";
        var opts = FactotumBg.parseCommandLine(cmdline);
        var argClone = opts._.concat([]);
        FactotumBg.getOmniboxSuggestion("title", opts);
        expect(opts._).toEqual(argClone);
    });
}); // getOmniboxSuggestion


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


describe("reconstructCmdline", function() {
    it("returns an object with cmdline strings that can be reparsed equivalent to the original parsed string", function () {
        var cmdline = "cmd --bg-debug arg1 --debug arg2 --help arg3";
        var opts = FactotumBg.parseCommandLine(cmdline);
        expect(FactotumBg.reconstructCmdline(opts))
            .toEqual({
                withKeyword: "cmd --bg-debug --debug --help arg1 arg2 arg3",
                noKeyword: "--bg-debug --debug --help arg1 arg2 arg3"
            });
    });

    it("returns empty cmdlines if nothing in opts", function () {
        expect(FactotumBg.reconstructCmdline({})).toEqual({
            withKeyword: "",
            noKeyword: ""
        });
    });

    it("doesn't modify the input object's _ array", function () {
        var cmdline = "cmd --bg-debug arg1 --debug arg2 --help arg3";
        var opts = FactotumBg.parseCommandLine(cmdline);
        var argClone = opts._.concat([]);
        FactotumBg.reconstructCmdline(opts);
        expect(opts._).toEqual(argClone);
    });
}); // reconstructCmdline

}); // FactotumBg

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


describe("runBgCode", function() {

    beforeEach(function () {
        window.XXXcommandCache = {};
        window.FactotumBgSpy = jasmine.createSpy("FactotumBgTesting");
    });

    afterEach(function () {
        delete window.XXXcommandCache;
        delete window.FactotumBgSpy;
    });

    it("does nothing if guid for Fcommand isn't known", function () {
        var functionCreator = spyOn(window, "Function").and.callThrough();

        FactotumBg.runBgCode({ guid: "123" });
        expect(functionCreator).not.toHaveBeenCalled();
    });

    it("invokes the Fcommand's bg code with passed 'data' as named parameter", function () {
        var functionCreator = spyOn(window, "Function").and.callThrough();
        var passToBg = { value: 42 };
        var guid = "guid";
        var fcommand = getTestFcommand(guid,
            "window.FactotumBgSpy(data)");
        window.XXXcommandCache[guid] = fcommand;

        FactotumBg.runBgCode({
            guid: guid,
            internalOptions: { },
            data: passToBg,
        });

        expect(functionCreator).toHaveBeenCalled();
        expect(window.FactotumBgSpy).toHaveBeenCalledWith(passToBg);
    });

    it("supports passing no data to the bg code function", function () {
        var functionCreator = spyOn(window, "Function").and.callThrough();
        var guid = "guid";
        var fcommand = getTestFcommand(guid,
            "window.FactotumBgSpy(data)");
        window.XXXcommandCache[guid] = fcommand;

        FactotumBg.runBgCode({
            guid: guid,
            internalOptions: { },
            // no 'data' property
        });

        expect(functionCreator).toHaveBeenCalled();
        expect(window.FactotumBgSpy).toHaveBeenCalledWith(undefined);
    });

    it("catches exception from Fcommand's bg code", function () {
        var functionCreator = spyOn(window, "Function").and.callThrough();
        var consoleSpy = spyOn(console, "log").and.callThrough();
        var passToBg = { value: 42 };
        var guid = "guid";
        var error = "the error";
        var fcommand = getTestFcommand(guid,
            "window.FactotumBgSpy(data); throw '" + error + "';");
        window.XXXcommandCache[guid] = fcommand;

        FactotumBg.runBgCode({
            guid: guid,
            internalOptions: { },
            data: passToBg,
        });

        expect(functionCreator).toHaveBeenCalled();
        expect(window.FactotumBgSpy).toHaveBeenCalledWith(passToBg);
        expect(consoleSpy.calls.all()[0].args).toEqual([
            "Fcommand '" + guid + "' error: ",
            error
        ]);
    });

    it("enables debugging if bg-debug option was given", function () {
        // This test is imperfect, since it can't catch actually dropping
        // into the debugger.  Instead, it checks for the presence of the
        // 'debugger' statement that was injected by runBgCode().
        var functionCreator = spyOn(window, "Function").and.callThrough();
        var guid = "guid";
        var fcommand = getTestFcommand(guid,
            "window.FactotumBgSpy(arguments.callee.toString())");   // call the spy with the stringified content of this Function
        window.XXXcommandCache[guid] = fcommand;

        FactotumBg.runBgCode({
            guid: guid,
            internalOptions: { bgdebug: true },
        });

        expect(functionCreator).toHaveBeenCalled();
        expect(window.FactotumBgSpy.calls.all()[0].args).toMatch(/d\ebugger;/);
    });
});


}); // FactotumBg

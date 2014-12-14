"use strict";

describe("FactotumBg", function () {


describe("checkInternalOptions", function() {
    it("accepts --bg- debug and --fg-debug option anywhere in command line", function () {
        expect(FactotumBg.checkInternalOptions(["--bg-debug", "a"]).bgdebug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "--bg-debug", "a"]).bgdebug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "a", "--bg-debug"]).bgdebug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["--fg-debug", "test", "a"]).fgdebug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "--fg-debug", "a"]).fgdebug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "a", "--fg-debug"]).fgdebug).toBe(true);
    });

    it("accepts --help option anywhere in command line", function () {
        expect(FactotumBg.checkInternalOptions(["--help", "test", "a"]).help).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "--help", "a"]).help).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "a", "--help"]).help).toBe(true);
    });
}); // FactotumBg.normalizeInternalOptions


describe("getSuggestion", function() {

    xit("returns a Chrome omnibox suggestion object", function() {
        var name = "test";

        Fcommands.set({
            names: [ name ],
            guid: "testguid",
            execute: function() {},
        });

        var cmd = Fcommands.getCommandsByPrefix(name)[0];

        expect(FactotumBg.getSuggestion(cmd, [])).toEqual({
            content: jasmine.any(String),
            description: jasmine.any(String)
        });
    });


    xit("uses the value of the command's description property for the description", function() {
        var name = "test";
        var desc = "desc123";

        Fcommands.set({
            names: [ name ],
            guid: "testguid",
            description: desc,
            execute: function() {},
        });

        var cmd = Fcommands.getCommandsByPrefix(name)[0];
        var suggestion = FactotumBg.getSuggestion(cmd, []);

        expect(suggestion.description).toMatch(desc);
    });


    xit("sets the suggestion's content to be the command's first name and whitespace-separated omnibox words", function() {
        var name = "test";
        var argv = [ "a", "b", "c" ];

        Fcommands.set({
            names: [ name ],
            guid: "testguid",
            execute: function() {},
        });

        var cmd = Fcommands.getCommandsByPrefix(name)[0];
        var suggestion = FactotumBg.getSuggestion(cmd, argv);

        expect(suggestion.content).toEqual(name + " " + argv.join(" "));
    });


    xit("messages the user that running an Fcommand on an internal Chrome page is not possible");


}); // FactotumBg.getSuggestion


describe("responseHandler", function() {

    // None of these tests will work because of
    // http://code.google.com/p/chromium/issues/detail?id=30756
    // (can't executeScript() into an extension's page, even if
    // it's the same extension)
    xit("Fcommand response contains command name", function() {
        Fcommands.set({
            names: [ "test" ],
            guid: "testguid",
            execute: "return 42;",
        });

        spyOn(FactotumBg, "responseHandler").andCallThrough();

        FactotumBg.dispatch("test 1 2 3");

        expect(FactotumBg.responseHandler).toHaveBeenCalledWith({
            cmdlineObj: {
                _: ["1", "2", "3"]
            }
        });
    });

    xit("receives an error response if Fcommand code fails parsing");

    xit("receives an error response if Fcommand code explicitly throws");

    xit("receives a non-error response if Fcommand did not throw");

    xit("receives a stack dump if Fcommand throws a builtin exception");

    xit("notifies user if an Fcommand throws");

    xit("receives a response even if the Fcommand explicitly returns");

}); // FactotumBg.responseHandler


describe("dispatch", function() {

    xit("does nothing if dispatching to an empty Fcommand name",
        function() {
            spyOn(Fcommands, "getCommandsByPrefix");

            expect(function() {
                FactotumBg.dispatch("");
            }).not.toThrow();

            expect(Fcommands.getCommandsByPrefix).not.toHaveBeenCalled();
        });

    xit("does nothing if dispatching to an unknown Fcommand name",
        function() {
            spyOn(Fcommands, "getCommandsByPrefix").andCallThrough();

            expect(function() {
                FactotumBg.dispatch("bogus");
            }).not.toThrow();

            expect(Fcommands.getCommandsByPrefix).toHaveBeenCalled();
        });

    // XXX:  This test can no longer pass because the action is now
    // (correctly) executed in the context of the current page, not the
    // background page this test code is executed in.
    xit("passes a command line object to the function when dispatching to the given Fcommand",
        function() {
            var action = jasmine.createSpy();

            Fcommands.set({
                names: [ "test" ],
                guid: "testguid",
                execute: action,
            });

            expect(function() {
                FactotumBg.dispatch("test 1 2 3");
            }).not.toThrow();

            expect(action).toHaveBeenCalledWith({
                _: ["1", "2", "3"]
            });
        });

    // XXX:  this test is no longer meaningful because it executes in the
    // context of the current page, not the background page (i.e. the
    // exception is thrown in the current page and therefore isn't available
    // to the extension).
    xit("captures exceptions thrown by an Fcommand's execute function and returns undefined",
        function() {
            Fcommands.set({
                names: [ "test" ],
                guid: "testguid",
                execute: function () { throw 42; },
            });

            var rval = 1;
            expect(function() {
                rval = FactotumBg.dispatch("test 1 2 3");
            }).not.toThrow(42);

            expect(rval).toEqual(undefined);
        });

    // XXX:  This test can no longer pass because the action is now
    // (correctly) executed in the context of the current page, not the
    // background page this test code is executed in.
    xit("passes a command line object to the function when dispatching to the given Fcommand with an optspec",
        function() {
            var action = jasmine.createSpy();

            Fcommands.set({
                names: [ "test" ],
                guid: "testguid",
                optSpec: {
                    opt: {
                        type: "boolean"
                    },
                },
                execute: action,
            });

            expect(function() {
                FactotumBg.dispatch("test -opt -- 1 2 3");
            }).not.toThrow();

            expect(action).toHaveBeenCalledWith({
                opt: true,
                _: ["1", "2", "3"]
            });
        });

}); // FactotumBg.dispatch


describe("sendScriptRequest", function() {

    xit("Fcommand executes whether 'execute' property can be a function or a string.");

    // XXX:  this test is a lame proof-of-concept attempt (that doesn't work) of
    // testing that the response handler is called.
    xit("Fcommand code has 'cmdlineObj' in scope.", function() {
        var _spyOn = spyOn;
        var _expect = expect;
        var _waitsFor = waitsFor;
        var _runs = runs;
        var _waits = waits;

        var done = false;

        _spyOn(FactotumBg, "responseHandler").andCallThrough();
        _spyOn(FactotumBg, "dispatch").andCallThrough();

        chrome.tabs.create({
            url: "http://www.google.com"    // XXX: any non-Chrome URL will do
        }, function(tab) {

            Fcommands.set({
                names: [ "test" ],
                guid: "testguid",
                execute: "throwing",
            });

            _waits(500);

            _runs(function() {
                FactotumBg.dispatch("test 1 2 3");
            });

            _waits(500);

            done = true;
            //chrome.tabs.remove(tab.id);

        });

        waitsFor(function() {
            return done;
        }, "failed", 5000);

        _expect(FactotumBg.responseHandler).toHaveBeenCalled();
        _expect(FactotumBg.dispatch).toHaveBeenCalled();

    });

    xit("Fcommand code's cmdlineObj has command's argv.");

    xit("Fcommand code's cmdlineObj has command's opts.");

    xit("Fcommand code's cmdlineObj.commandName.real is command's first real name.");

    xit("Fcommand code's cmdlineObj.commandName.invoked is command's invoked name.");


}); // FactotumBg.sendScriptRequest


}); // FactotumBg

describe("Factotum.getSuggestion", function() {


    beforeEach(function() {
        // clear any existing F-commands before each test
        Fcommands.deleteAll();
    });


    it("returns a Chrome omnibox suggestion object", function() {
        var name = "test";

        Fcommands.set({
            names: [ name ],
            guid: "testguid",
            execute: function() {},
        });

        var cmd = Fcommands.getCommandsByPrefix(name)[0];

        expect(Factotum.getSuggestion(cmd, [])).toEqual({
            content: jasmine.any(String),
            description: jasmine.any(String)
        });
    });


    it("uses the value of the command's description property for the description", function() {
        var name = "test";
        var desc = "desc123";

        Fcommands.set({
            names: [ name ],
            guid: "testguid",
            description: desc,
            execute: function() {},
        });

        var cmd = Fcommands.getCommandsByPrefix(name)[0];
        var suggestion = Factotum.getSuggestion(cmd, []);

        expect(suggestion.description).toMatch(desc);
    });


    it("sets the suggestion's content to be the command's first name and whitespace-separated omnibox words", function() {
        var name = "test";
        var argv = [ "a", "b", "c" ];

        Fcommands.set({
            names: [ name ],
            guid: "testguid",
            execute: function() {},
        });

        var cmd = Fcommands.getCommandsByPrefix(name)[0];
        var suggestion = Factotum.getSuggestion(cmd, argv);

        expect(suggestion.content).toEqual(name + " " + argv.join(" "));
    });


}); // Factotum.getSuggestion


describe("Factotum.responseHandler", function() {


    beforeEach(function() {
        // clear any existing F-commands before each test
        Fcommands.deleteAll();
    });


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

        spyOn(Factotum, "responseHandler").andCallThrough();

        Factotum.dispatch("test 1 2 3");

        expect(Factotum.responseHandler).toHaveBeenCalledWith({
            cmdlineObj: {
                opts: { },
                argv: ["1", "2", "3"]
            }
        });
    });

    xit("receives an error response if Fcommand code fails parsing");

    xit("receives an error response if Fcommand code explicitly throws");

    xit("receives a non-error response if Fcommand did not throw");

    xit("receives a stack dump if Fcommand throws a builtin exception");

    xit("notifies user if an Fcommand throws");

    xit("receives a response even if the Fcommand explicitly returns");

}); // Factotum.responseHandler


describe("Factotum.dispatch", function() {

    // Clear all Fcommands before and after each test
    beforeEach(function() {
        Fcommands.deleteAll();
    });

    afterEach(function() {
        Fcommands.deleteAll();
    });


    it("does nothing if dispatching to an empty Fcommand name",
        function() {
            spyOn(Fcommands, "getCommandsByPrefix");

            expect(function() {
                Factotum.dispatch("");
            }).not.toThrow();

            expect(Fcommands.getCommandsByPrefix).not.toHaveBeenCalled();
        });

    it("does nothing if dispatching to an unknown Fcommand name",
        function() {
            spyOn(Fcommands, "getCommandsByPrefix").andCallThrough();

            expect(function() {
                Factotum.dispatch("bogus");
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
                Factotum.dispatch("test 1 2 3");
            }).not.toThrow();

            expect(action).toHaveBeenCalledWith({
                opts: {},
                argv: ["1", "2", "3"]
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
                rval = Factotum.dispatch("test 1 2 3");
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
                Factotum.dispatch("test -opt -- 1 2 3");
            }).not.toThrow();

            expect(action).toHaveBeenCalledWith({
                opts: { opt: true },
                argv: ["1", "2", "3"]
            });
        });

}); // Factotum.dispatch


describe("Factotum.sendScriptRequest", function() {


    // Clear all Fcommands before and after each test
    beforeEach(function() {
        Fcommands.deleteAll();
    });

    afterEach(function() {
        Fcommands.deleteAll();
    });

    xit("Fcommand executes whether 'execute' property can be a function or a string.");

    xit("Fcommand code has 'cmdlineObj' in scope.");

    xit("Fcommand code's cmdlineObj has command's argv.");

    xit("Fcommand code's cmdlineObj has command's opts.");

    xit("Fcommand code's cmdlineObj.commandName.real is command's first real name.");

    xit("Fcommand code's cmdlineObj.commandName.invoked is command's invoked name.");


}); // Factotum.sendScriptRequest

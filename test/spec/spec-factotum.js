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


    it("gets the description from the command's description function, if it exists", function() {
        var name = "test";
        var desc = "desc123";
        var descFunc = jasmine.createSpy().andReturn(desc);

        Fcommands.set({
            names: [ name ],
            guid: "testguid",
            description: descFunc,
            execute: function() {},
        });

        var cmd = Fcommands.getCommandsByPrefix(name)[0];
        var suggestion = Factotum.getSuggestion(cmd, []);

        expect(suggestion).toEqual({
            content: jasmine.any(String),
            description: jasmine.any(String)
        });

        expect(suggestion.description).toMatch(desc);

        expect(descFunc).toHaveBeenCalled();
    });


    it("passes omnibox argv to the command's description function", function() {
        var name = "test";
        var desc = "desc123";
        var descFunc = jasmine.createSpy().andReturn(desc);

        Fcommands.set({
            names: [ name ],
            guid: "testguid",
            description: descFunc,
            execute: function() {},
        });

        var cmd = Fcommands.getCommandsByPrefix(name)[0];
        var argv = [ "test", 42 ];
        var suggestion = Factotum.getSuggestion(cmd, argv);

        expect(descFunc).toHaveBeenCalledWith(argv);
    });


    it("uses the value of the command's non-function description property for the description", function() {
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

        Fcommands.dispatch("test 1 2 3");

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


describe("Fcommands.sendScriptRequest", function() {


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

    xit("Fcommand code's cmdlineObj.cmdName is command's first real name.");

    xit("Fcommand code's cmdlineObj.invokedName is command's invoked name.");


}); // Fcommands.sendScriptRequest

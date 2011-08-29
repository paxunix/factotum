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


describe("Factotum", function() {


    beforeEach(function() {
        // clear any existing F-commands before each test
        Fcommands.deleteAll();
    });


    xit("Fcommand response contains command name", function() {
        var name = "test";
        var argv = [ "a", "b", "c" ];

        Fcommands.set({
            names: [ name ],
            guid: "testguid",
            execute: "invalid javascript code",
        });

        var responseHandler = jasmine.createSpy();

        Fcommands.dispatch("test -opt -- 1 2 3", responseHandler);

        expect(responseHandler).toHaveBeenCalledWith({
            XXX: 1,
            opts: { opt: true },
            argv: ["1", "2", "3"]
        });
    });

    xit("receives an error response if Fcommand code fails parsing");

    xit("receives an error response if Fcommand code throws");

    xit("receives an non-error response if Fcommand did not throw");

    xit("notifies user if an Fcommand throws");


}); // Factotum

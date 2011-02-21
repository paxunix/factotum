// HACK:  A bug in Jasmine prevents toEqual() tests from passing if they
// involve objects with Function values.
// https://github.com/pivotal/jasmine/issues/#issue/60
function jasmineFnFilterHack(ar)
{
    return jQuery.map(ar, function (el) {
        for (var p in el)
            if (jQuery.isFunction(el[p]))
                delete el[p];

        return el;
    });
}   // jasmineFnFilterHack


describe("Fcommands.set", function() {

    it("throws if the parameter is not an object",
        function() {
            expect(function() {
                Fcommands.set("");
            }).toThrow("commandData must be an object.");
        });

    it("throws if the parameter has no 'guid' property",
        function() {
            expect(function() {
                Fcommands.set({});
            }).toThrow("commandData.guid is required.");
        });

    it("throws if the 'guid' property is not a string",
        function() {
            expect(function() {
                Fcommands.set({
                    names: { },
                    guid: {}
                });
            }).toThrow("commandData.guid must be a string.");
        });

    it("throws if the parameter has no 'names' property",
        function() {
            expect(function() {
                Fcommands.set({
                    guid: "asdf"
                });
            }).toThrow("commandData.names is required.");
        });

    it("throws if the 'names' property is not an array",
        function() {
            expect(function() {
                Fcommands.set({
                    names: { },
                    guid: "asdf"
                });
            }).toThrow("commandData.names must be an array.");
        });

    it("throws if the parameter has no 'execute' property",
        function() {
            expect(function() {
                Fcommands.set({
                    names: [ "blah" ],
                    guid: "asdf"
                });
            }).toThrow("commandData.execute is required.");
        });

    it("throws if the 'execute' value is not a function",
        function() {
            expect(function() {
                Fcommands.set({
                    names: [ "blah" ],
                    guid: "asdf",
                    execute: "blah"
                });
            }).toThrow("commandData.execute must be a function.");
        });

    it("throws if the parameter's 'description' property is not a string or function",
        function() {
            expect(function() {
                Fcommands.set({
                    names: [ "blah" ],
                    guid: "asdf",
                    execute: function() {},
                    description: {}
                });
            }).toThrow("commandData.description must be a string or a function.");

            expect(function() {
                Fcommands.set({
                    names: [ "blah" ],
                    guid: "asdf",
                    execute: function() {},
                    description: "desc"
                });
            }).not.toThrow();

            expect(function() {
                Fcommands.set({
                    names: [ "blah" ],
                    guid: "asdf",
                    execute: function() {},
                    description: function() {}
                });
            }).not.toThrow();
        });

    it("throws if the 'icon' value is not a string",
        function() {
            expect(function() {
                Fcommands.set({
                    names: [ "blah" ],
                    guid: "asdf",
                    execute: function() {},
                    icon: {}
                });
            }).toThrow("commandData.icon must be a string.");
        });

    it("throws if the 'optSpec' value is not an object",
        function() {
            expect(function() {
                Fcommands.set({
                    names: [ "blah" ],
                    guid: "asdf",
                    execute: function() {},
                    optSpec: 1,
                });
            }).toThrow("commandData.optSpec must be an object.");
        });

}); // Fcommands.set


describe("Fcommands.getCommandsByName", function() {

    it("returns an empty array if the given Fcommand name isn't known",
        function() {
            expect(Fcommands.getCommandsByName("")).
                toEqual([]);
        });

    it("returns an array with one known Fcommand for a given string",
        function() {
            Fcommands.set({
                names: [ "blah" ],
                guid: "asdf",
                execute: function() {},
            });

            expect(jasmineFnFilterHack(Fcommands.getCommandsByName("blah"))).
                toEqual(jasmineFnFilterHack([{
                    names: [ "blah" ],
                    guid: "asdf",
                    execute: function() {},
                    description: "XXX: default description",
                }]));
        });

}); // Fcommands.getCommandsByName

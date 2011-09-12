// Order array of Fcommands by guid.  This is a helper for Jasmine
// comparison functions.
function sortFcommandsByGuid(ar)
{
    ar.sort(function(a, b) {
        if ('guid' in a && 'guid' in b)
            return a.guid < b.guid;
        return -1;      // if neither has guid, we don't care
    });

    return ar;
}   // sortFcommandsByGuid


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

    it("throws if the 'execute' value is not a string or a function",
        function() {
            expect(function() {
                Fcommands.set({
                    names: [ "blah" ],
                    guid: "asdf",
                    execute: {}
                });
            }).toThrow("commandData.execute must be a string or a function.");

            expect(function() {
                Fcommands.set({
                    names: [ "blah2" ],
                    guid: "asdf2",
                    execute: "",
                });
            }).not.toThrow();

            expect(function() {
                Fcommands.set({
                    names: [ "blah3" ],
                    guid: "asdf3",
                    execute: function() { },
                });
            }).not.toThrow();
        });

    it("uses a default description string if the parameter's 'description' property is not specified",
        function() {
            expect(function() {
                Fcommands.set({
                    names: [ "blah1234" ],
                    guid: "asdf",
                    execute: function() {},
                });
            }).not.toThrow();

            expect(Fcommands.getCommandsByPrefix("blah1234")).
                toEqual([{
                    names: [ "blah1234" ],
                    guid: "asdf",
                    execute: jasmine.any(Function),
                    description: jasmine.any(String),
                    scriptUrls: [],
                }]);
        });

    it("throws if the parameter's 'description' property is not a string",
        function() {
            expect(function() {
                Fcommands.set({
                    names: [ "blah" ],
                    guid: "asdf",
                    execute: function() {},
                    description: {}
                });
            }).toThrow("commandData.description must be a string.");

            expect(function() {
                Fcommands.set({
                    names: [ "blah" ],
                    guid: "asdf",
                    execute: function() {},
                    description: "desc"
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

    it("throws if the 'help' value is not a string",
        function() {
            expect(function() {
                Fcommands.set({
                    names: [ "blah" ],
                    guid: "asdf",
                    execute: function() {},
                    help: [],
                });
            }).toThrow("commandData.help must be a string.");
        });

    it("throws if the 'scriptUrls' value is not an array",
        function() {
            expect(function() {
                Fcommands.set({
                    names: [ "blah" ],
                    guid: "asdf",
                    execute: "",
                    scriptUrls: "",
                });
            }).toThrow("commandData.scriptUrls must be an array.");
        });

    it("throws if the 'scriptUrls' value contains a non-string",
        function() {
            expect(function() {
                Fcommands.set({
                    names: [ "blah" ],
                    guid: "asdf",
                    execute: "",
                    scriptUrls: [ "a", 10 ],
                });
            }).toThrow("commandData.scriptUrls[1] is not a string.");
        });

    xit("scriptUrls loads remote content");

    xit("scriptUrls loads the Fcommand last");

    it("saves the fcommand whenever one is set",
        function() {
            spyOn(Fcommands, "saveCommand");

            Fcommands.set({
                names: [ "blah" ],
                guid: "asdf",
                execute: "return 10;",
            });

            expect(Fcommands.saveCommand).toHaveBeenCalled();
        });

}); // Fcommands.set


describe("Fcommands.getCommandsByPrefix", function() {

    it("returns an empty array if the given Fcommand name isn't known",
        function() {
            expect(Fcommands.getCommandsByPrefix("totally unknown cmd name")).
                toEqual([]);
        });

    it("returns an array with one known Fcommand for a given Fcommand name",
        function() {
            var name = "blahlkjaldhas";

            Fcommands.set({
                names: [ name ],
                guid: "asdf",
                execute: function() {},
            });

            expect(Fcommands.getCommandsByPrefix(name)).
                toEqual([{
                    names: [ name ],
                    guid: "asdf",
                    execute: jasmine.any(Function),
                    description: jasmine.any(String),
                    scriptUrls: [],
                }]);
        });

    it("returns an array with all known Fcommands for a given string",
        function() {
            Fcommands.set({
                names: [ "blahabcde" ],
                guid: "guid1",
                execute: function() {},
            });

            Fcommands.set({
                names: [ "blahabcdef" ],
                guid: "guid2",
                execute: function() {},
            });

            expect(sortFcommandsByGuid(Fcommands.getCommandsByPrefix("blahabcde"))).
                toEqual(sortFcommandsByGuid([{
                    names: [ "blahabcdef" ],
                    guid: "guid2",
                    execute: jasmine.any(Function),
                    description: jasmine.any(String),
                    scriptUrls: [],
                },
                {
                    names: [ "blahabcde" ],
                    guid: "guid1",
                    execute: jasmine.any(Function),
                    description: jasmine.any(String),
                    scriptUrls: [],
                },
                ]));
        });

    it("looks up Fcommands case-insensitively, but preserves their case.",
        function() {
            Fcommands.set({
                names: [ "BlAhplplpl" ],
                guid: "guid1",
                execute: function() {},
            });

            Fcommands.set({
                names: [ "blahplplpl" ],
                guid: "guid2",
                execute: function() {},
            });

            expect(sortFcommandsByGuid(Fcommands.getCommandsByPrefix("BLAHPLPL"))).
                toEqual(sortFcommandsByGuid([{
                    names: [ "blahplplpl" ],
                    guid: "guid2",
                    execute: jasmine.any(Function),
                    description: jasmine.any(String),
                    scriptUrls: [],
                },
                {
                    names: [ "BlAhplplpl" ],
                    guid: "guid1",
                    execute: jasmine.any(Function),
                    description: jasmine.any(String),
                    scriptUrls: [],
                },
                ]));
        });

    it("returns an array with all known Fcommands matching a given prefix",
        function() {
            Fcommands.set({
                names: [ "cmdsecond" ],
                guid: "guid2",
                execute: function() {},
            });

            Fcommands.set({
                names: [ "cmdfirst" ],
                guid: "guid1",
                execute: function() {},
            });

            Fcommands.set({
                names: [ "nomatch" ],
                guid: "guid3",
                execute: function() {},
            });

            expect(Fcommands.getCommandsByPrefix("cmd")).
                toEqual([{
                    names: [ "cmdfirst" ],
                    guid: "guid1",
                    execute: jasmine.any(Function),
                    description: jasmine.any(String),
                    scriptUrls: [],
                },
                {
                    names: [ "cmdsecond" ],
                    guid: "guid2",
                    execute: jasmine.any(Function),
                    description: jasmine.any(String),
                    scriptUrls: [],
                },
                ]);
        });

    it("does not fail when an Fcommand input prefix is an invalid Regexp",
        function() {
            Fcommands.set({
                names: [ "c**" ],
                guid: "guid1",
                execute: function() {},
            });

            expect(Fcommands.getCommandsByPrefix("c**")).
                toEqual([{
                    names: [ "c**" ],
                    guid: "guid1",
                    execute: jasmine.any(Function),
                    description: jasmine.any(String),
                    scriptUrls: [],
                }]);
        });

    it("only matches input prefixes at the start of Fcommand names",
        function() {
            Fcommands.set({
                names: [ "cmdtest" ],
                guid: "guid1",
                execute: function() {},
            });

            expect(Fcommands.getCommandsByPrefix("test")).
                toEqual([]);
        });

}); // Fcommands.getCommandsByPrefix


describe("Fcommands.deleteCommand", function() {
    it("deletes an Fcommand by guid", function() {
        Fcommands.set({
            names: [ "_BlAh424242" ],
            guid: "guid1",
            execute: function() {},
        });

        var success = false;
        var obj = {
            onSuccessFn: function () {
                success = true;
            }
        };

        spyOn(obj, "onSuccessFn").andCallThrough();

        Fcommands.deleteCommand("guid1", obj.onSuccessFn);

        waitsFor(function () { return success; }, "delete to succeed", 5000);

        runs(function () {
            expect(success).toBe(true);
            expect(sortFcommandsByGuid(Fcommands.
                getCommandsByPrefix("_BLAH424242"))).toEqual([]);
        });
    });
}); // Fcommands.deleteCommand

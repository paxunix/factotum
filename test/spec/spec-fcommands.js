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

    beforeEach(function() {
        // clear any existing F-commands before each test
        Fcommands.deleteAll();
    });


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


describe("Fcommands.getCommandsByPrefix", function() {

    beforeEach(function() {
        // clear any existing F-commands before each test
        Fcommands.deleteAll();
    });

    it("returns an empty array if the given Fcommand name isn't known",
        function() {
            expect(Fcommands.getCommandsByPrefix("")).
                toEqual([]);
        });

    it("returns an array with one known Fcommand for a given Fcommand name",
        function() {
            Fcommands.set({
                names: [ "blah" ],
                guid: "asdf",
                execute: function() {},
            });

            expect(Fcommands.getCommandsByPrefix("blah")).
                toEqual([{
                    names: [ "blah" ],
                    guid: "asdf",
                    execute: jasmine.any(Function),
                    description: "XXX: default description",
                }]);
        });

    it("returns an array with all known Fcommands for a given string",
        function() {
            Fcommands.set({
                names: [ "blah" ],
                guid: "guid1",
                execute: function() {},
            });

            Fcommands.set({
                names: [ "blah" ],
                guid: "guid2",
                execute: function() {},
            });

            expect(sortFcommandsByGuid(Fcommands.getCommandsByPrefix("blah"))).
                toEqual(sortFcommandsByGuid([{
                    names: [ "blah" ],
                    guid: "guid2",
                    execute: jasmine.any(Function),
                    description: "XXX: default description",
                },
                {
                    names: [ "blah" ],
                    guid: "guid1",
                    execute: jasmine.any(Function),
                    description: "XXX: default description",
                },
                ]));
        });

    it("looks up Fcommands case-insensitively, but preserves their case.",
        function() {
            Fcommands.set({
                names: [ "BlAh" ],
                guid: "guid1",
                execute: function() {},
            });

            Fcommands.set({
                names: [ "blah" ],
                guid: "guid2",
                execute: function() {},
            });

            expect(sortFcommandsByGuid(Fcommands.getCommandsByPrefix("BLAH"))).
                toEqual(sortFcommandsByGuid([{
                    names: [ "blah" ],
                    guid: "guid2",
                    execute: jasmine.any(Function),
                    description: "XXX: default description",
                },
                {
                    names: [ "BlAh" ],
                    guid: "guid1",
                    execute: jasmine.any(Function),
                    description: "XXX: default description",
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

            expect(Fcommands.getCommandsByPrefix("cmd")).
                toEqual([{
                    names: [ "cmdfirst" ],
                    guid: "guid1",
                    execute: jasmine.any(Function),
                    description: "XXX: default description",
                },
                {
                    names: [ "cmdsecond" ],
                    guid: "guid2",
                    execute: jasmine.any(Function),
                    description: "XXX: default description",
                },
                ]);
        });

}); // Fcommands.getCommandsByPrefix


describe("Fcommands.delete", function() {

    beforeEach(function() {
        // clear any existing F-commands before each test
        Fcommands.deleteAll();
    });

    it("delete an Fcommand by guid",
        function() {
            Fcommands.set({
                names: [ "BlAh" ],
                guid: "guid1",
                execute: function() {},
            });

            Fcommands.set({
                names: [ "blah" ],
                guid: "guid2",
                execute: function() {},
            });

            Fcommands.delete("guid1");

            expect(sortFcommandsByGuid(Fcommands.getCommandsByPrefix("BLAH"))).
                toEqual([{
                    names: [ "blah" ],
                    guid: "guid2",
                    execute: jasmine.any(Function),
                    description: "XXX: default description",
                }]);
        });

    it("delete all Fcommands",
        function() {
            Fcommands.set({
                names: [ "BlAh" ],
                guid: "guid1",
                execute: function() {},
            });

            Fcommands.set({
                names: [ "blah" ],
                guid: "guid2",
                execute: function() {},
            });

            Fcommands.deleteAll();

            expect(Fcommands.getCommandsByPrefix("BLAH")).
                toEqual([]);
        });
}); // Fcommands.delete


describe("Fcommands.dispatch", function() {

    beforeEach(function() {
        // clear any existing F-commands before each test
        Fcommands.deleteAll();
    });

    it("does nothing if dispatching to an empty Fcommand name",
        function() {
            spyOn(Fcommands, "getCommandsByPrefix");

            expect(function() {
                Fcommands.dispatch("");
            }).not.toThrow();

            expect(Fcommands.getCommandsByPrefix).not.toHaveBeenCalled();
        });

    it("does nothing if dispatching to an unknown Fcommand name",
        function() {
            //XXX:spyOn(Fcommands, "getCommandsByPrefix").andCallThrough();

            expect(function() {
                Fcommands.dispatch("bogus");
            }).not.toThrow();

            //XXX:expect(Fcommands.getCommandsByPrefix).toHaveBeenCalled();
        });

    it("passes a command line object to the function when dispatching to the given Fcommand",
        function() {
            var action = jasmine.createSpy();

            Fcommands.set({
                names: [ "test" ],
                guid: "testguid",
                execute: action,
            });

            expect(function() {
                Fcommands.dispatch("test 1 2 3");
            }).not.toThrow();

            expect(action).toHaveBeenCalledWith({
                opts: {},
                argv: ["1", "2", "3"]
            });
        });

    it("returns the value returned by the Fcommand's execute function",
        function() {
            var action = jasmine.createSpy().andReturn(42);

            Fcommands.set({
                names: [ "test" ],
                guid: "testguid",
                execute: action,
            });

            expect(Fcommands.dispatch("test 1 2 3")).toEqual(42);
        });

    it("captures exceptions thrown by an Fcommand's execute function and returns undefined",
        function() {
            Fcommands.set({
                names: [ "test" ],
                guid: "testguid",
                execute: function () { throw 42; },
            });

            var rval = 1;
            expect(function() {
                rval = Fcommands.dispatch("test 1 2 3");
            }).not.toThrow(42);

            expect(rval).toEqual(undefined);
        });

    it("passes a command line object to the function when dispatching to the given Fcommand with an optspec",
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
                Fcommands.dispatch("test -opt -- 1 2 3");
            }).not.toThrow();

            expect(action).toHaveBeenCalledWith({
                opts: { opt: true },
                argv: ["1", "2", "3"]
            });
        });


}); // Fcommands.dispatch

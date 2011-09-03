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

    // Clear all Fcommands before and after each test
    beforeEach(function() {
        Fcommands.deleteAll();
    });

    afterEach(function() {
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

    it("persists the fcommands whenever one is set",
        function() {
            spyOn(Fcommands, "persist");

            Fcommands.set({
                names: [ "blah" ],
                guid: "asdf",
                execute: function() {},
            });

            expect(Fcommands.persist).toHaveBeenCalled();
        });

}); // Fcommands.set


describe("Fcommands.getCommandsByPrefix", function() {

    // Clear all Fcommands before and after each test
    beforeEach(function() {
        Fcommands.deleteAll();
    });

    afterEach(function() {
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
                    description: "No description provided.",
                    scriptUrls: [],
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
                    description: "No description provided.",
                    scriptUrls: [],
                },
                {
                    names: [ "blah" ],
                    guid: "guid1",
                    execute: jasmine.any(Function),
                    description: "No description provided.",
                    scriptUrls: [],
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
                    description: "No description provided.",
                    scriptUrls: [],
                },
                {
                    names: [ "BlAh" ],
                    guid: "guid1",
                    execute: jasmine.any(Function),
                    description: "No description provided.",
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
                    description: "No description provided.",
                    scriptUrls: [],
                },
                {
                    names: [ "cmdsecond" ],
                    guid: "guid2",
                    execute: jasmine.any(Function),
                    description: "No description provided.",
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
                    description: "No description provided.",
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


describe("Fcommands.delete", function() {

    // Clear all Fcommands before and after each test
    beforeEach(function() {
        Fcommands.deleteAll();
    });

    afterEach(function() {
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
                    description: "No description provided.",
                    scriptUrls: [],
                }]);
        });

    it("persists the fcommands whenever one is deleted",
        function() {
            spyOn(Fcommands, "persist");

            Fcommands.set({
                names: [ "blah" ],
                guid: "guid2",
                execute: function() {},
            });

            Fcommands.delete("guid2");

            expect(Fcommands.persist).toHaveBeenCalled();
        });
}); // Fcommands.delete


describe("Fcommands.dispatch", function() {

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
                Fcommands.dispatch("");
            }).not.toThrow();

            expect(Fcommands.getCommandsByPrefix).not.toHaveBeenCalled();
        });

    it("does nothing if dispatching to an unknown Fcommand name",
        function() {
            spyOn(Fcommands, "getCommandsByPrefix").andCallThrough();

            expect(function() {
                Fcommands.dispatch("bogus");
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
                Fcommands.dispatch("test 1 2 3");
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
                rval = Fcommands.dispatch("test 1 2 3");
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
                Fcommands.dispatch("test -opt -- 1 2 3");
            }).not.toThrow();

            expect(action).toHaveBeenCalledWith({
                opts: { opt: true },
                argv: ["1", "2", "3"]
            });
        });

    xit("does not re-inject the run wrapper code into pages");

}); // Fcommands.dispatch


describe("Fcommands.deleteAll", function() {

    // Clear all Fcommands before and after each test
    beforeEach(function() {
        Fcommands.deleteAll();
    });

    afterEach(function() {
        Fcommands.deleteAll();
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

    it("persists the empty fcommand set whenever all of them are deleted",
        function() {
            spyOn(Fcommands, "persist");

            Fcommands.set({
                names: [ "blah" ],
                guid: "guid2",
                execute: function() {},
            });

            Fcommands.deleteAll();

            expect(Fcommands.persist).toHaveBeenCalled();
        });
}); // Fcommands.deleteAll


describe("Fcommands.load", function() {

    // Clear all Fcommands before and after each test
    beforeEach(function() {
        Fcommands.deleteAll();
    });

    afterEach(function() {
        Fcommands.deleteAll();
    });


    it("returns the same Fcommand data structure that was persisted",
        function() {
            var cmd = {
                names: [ "blah" ],
                guid: "guid2",
                execute: function() {},
            };

            Fcommands.set(cmd);

            loadedFcommands = Fcommands.load();
            loadedFcommands.guid2.execute = jasmine.any(Function);

            expect(Fcommands.guid2Command).toEqual(loadedFcommands);
        });

}); // Fcommands.persist


describe("Fcommands.execute", function() {


    // Clear all Fcommands before and after each test
    beforeEach(function() {
        Fcommands.deleteAll();
    });

    afterEach(function() {
        Fcommands.deleteAll();
    });


    xit("Fcommand code has 'cmdlineObj' in scope.");

}); // Fcommands.execute

describe("FcommandError", function() {
    it("constructs an FcommandError object with info about the exception", function() {
        var msg = "error info";
        var err = new FcommandError(msg);

        expect(err instanceof Error).toBe(true);
        expect(err instanceof FcommandError).toBe(true);
        expect(err.message).toEqual(msg);
    });
}); // FcommandError


describe("MissingPropertyError", function() {
    it("constructs a MissingPropertyError object with info about the exception", function() {
        var msg = "error info";
        var err = new MissingPropertyError(msg);

        expect(err instanceof Error).toBe(true);
        expect(err instanceof FcommandError).toBe(true);
        expect(err instanceof MissingPropertyError).toBe(true);
        expect(err.message).toEqual(msg);
    });
}); // MissingPropertyError


describe("Fcommand.validate", function() {

    it("throws if the parameter is not an object",
        function() {
            expect(function() {
                // XXX:  the jasmine toThrow matcher extracts the message
                // property from the exception, rather than allowing a match on
                // exception type, so instead: catch, check and rethrow.
                try {
                    new Fcommand({});
                }

                catch (e)
                {
                    if (e instanceof FcommandError)
                        return;
                    else
                        throw e;
                }
            }).not.toThrow();
        }
    );

    it("throws if the parameter is missing required properties",
        function() {
            expect(function() {
                // XXX:  the jasmine toThrow matcher extracts the message
                // property from the exception, rather than allowing a match on
                // exception type, so instead: catch, check and rethrow.
                try {
                    new Fcommand({});
                }

                catch (e)
                {
                    if (e instanceof MissingPropertyError)
                        return;
                    else
                        throw e;
                }
            }).not.toThrow();
        }
    );

    it("throws if the parameter's 'names' property is not an array, or it does not only contain strings or is empty",
        function() {
            expect(function() {
                new Fcommand({
                    guid: "asdf",
                    description: "",
                    execute: "",
                });
            }).toThrow("commandData.names must be an array of strings.");

            expect(function() {
                new Fcommand({
                    guid: "asdf",
                    description: "",
                    execute: "",
                    names: {},
                });
            }).toThrow("commandData.names must be an array of strings.");

            expect(function() {
                new Fcommand({
                    guid: "asdf",
                    description: "",
                    execute: "",
                    names: [],
                });
            }).toThrow("commandData.names must be an array of strings.");

            expect(function() {
                new Fcommand({
                    guid: "asdf",
                    description: "",
                    execute: "",
                    names: [ "one", "two", 3]
                });
            }).toThrow("commandData.names must be an array of strings.");
        }
    );

    it("throws if the 'execute' value or is not a string or a function",
        function() {
            expect(function() {
                new Fcommand({
                    names: [ "blah" ],
                    guid: "asdf",
                });
            }).toThrow("commandData.execute is required and must be a string or a function.");

            expect(function() {
                new Fcommand({
                    names: [ "blah" ],
                    guid: "asdf",
                    execute: {}
                });
            }).toThrow("commandData.execute is required and must be a string or a function.");
        });

    it("throws if the parameter's 'description' property is missing or is not a string",
        function() {
            expect(function() {
                new Fcommand({
                    names: [ "blah" ],
                    guid: "asdf",
                    execute: function() {},
                });
            }).toThrow("commandData.description is required and must be a string.");

            expect(function() {
                new Fcommand({
                    names: [ "blah" ],
                    guid: "asdf",
                    execute: function() {},
                    description: {}
                });
            }).toThrow("commandData.description is required and must be a string.");
        });

    it("throws if the 'iconUrl' value is not a string",
        function() {
            expect(function() {
                new Fcommand({
                    names: [ "blah" ],
                    guid: "asdf",
                    execute: function() {},
                    description: "",
                    iconUrl: {}
                });
            }).toThrow("commandData.iconUrl must be a string.");
        });

    it("throws if the 'optSpec' value is not an object",
        function() {
            expect(function() {
                new Fcommand({
                    names: [ "blah" ],
                    guid: "asdf",
                    execute: function() {},
                    optSpec: 1,
                });
            }).toThrow("commandData.optSpec must be an object.");
        });

    it("throws if the 'helpHtml' value is not a string",
        function() {
            expect(function() {
                new Fcommand({
                    names: [ "blah" ],
                    guid: "asdf",
                    execute: function() {},
                    description: "",
                    helpHtml: [],
                });
            }).toThrow("commandData.helpHtml must be a string.");
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

    it("does not save the fcommand if its execute property is a function; still calls the success fn",
        function() {
            spyOn(Fcommands.fileSystem, "writeFile");
            spyOn(Fcommands, "saveCommand");
            var success = false;
            var onSave = function() {
                success = true;
            };

            Fcommands.set({
                names: [ "blah" ],
                guid: "asdf",
                execute: function () { throw "testing 1 2 3 "; },
            }, onSave);

            waitsFor(function() { return success; }, "save to finish", 2000);

            runs(function() {
                expect(Fcommands.fileSystem.writeFile).not.toHaveBeenCalled();
                expect(Fcommands.saveCommand).not.toHaveBeenCalled();
                expect(success).toBe(true);
            });
        });

}); // Fcommand.validate

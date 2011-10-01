describe("Fcommand.validate", function() {

    beforeEach(function() {
        this.addMatchers({ toThrowInstanceOf: toThrowInstanceOf });
    });

    it("throws if the parameter is not an object",
        function() {
            expect(function() {
                new Fcommand("");
            }).toThrowInstanceOf(FcommandError);
        }
    );

    it("throws if the parameter is missing required properties",
        function() {
            expect(function() {
                new Fcommand({});
            }).toThrowInstanceOf(MissingPropertyError);
        }
    );

    it("throws if the parameter's 'names' property is not an array",
        function() {
            expect(function() {
                new Fcommand({
                    guid: "asdf",
                    description: "",
                    names: "",
                    execute: "",
                });
            }).toThrowInstanceOf(InvalidData);
        }
    );

    it("throws if the parameter's 'names' array is empty",
        function() {
            expect(function() {
                new Fcommand({
                    guid: "asdf",
                    description: "",
                    names: [],
                    execute: "",
                });
            }).toThrowInstanceOf(InvalidData);
        }
    );

    it("throws if the parameter's 'description' property is not a string",
        function() {
            expect(function() {
                new Fcommand({
                    guid: "asdf",
                    description: [],
                    names: [ "blah" ],
                    execute: "",
                });
            }).toThrowInstanceOf(InvalidData);
        }
    );

    it("throws if the Fcommand's description is empty or only whitespace",
        function() {
            expect(function() {
                new Fcommand({
                    guid: "asdf",
                    description: "",
                    names: [ "blah" ],
                    execute: "",
                });
            }).toThrowInstanceOf(InvalidData);

            expect(function() {
                new Fcommand({
                    guid: "asdf",
                    description: "   \t   ",
                    names: [ "blah" ],
                    execute: "",
                });
            }).toThrowInstanceOf(InvalidData);
        }
    );

    xit("throws if the 'execute' value or is not a string or a function",
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

    xit("throws if the parameter's 'description' property is missing or is not a string",
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

    xit("throws if the 'iconUrl' value is not a string",
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

    xit("throws if the 'optSpec' value is not an object",
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

    xit("throws if the 'helpHtml' value is not a string",
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

    xit("throws if the 'scriptUrls' value is not an array",
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

    xit("throws if the 'scriptUrls' value contains a non-string",
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

    xit("saves the fcommand whenever one is set",
        function() {
            spyOn(Fcommands, "saveCommand");

            Fcommands.set({
                names: [ "blah" ],
                guid: "asdf",
                execute: "return 10;",
            });

            expect(Fcommands.saveCommand).toHaveBeenCalled();
        });

    xit("does not save the fcommand if its execute property is a function; still calls the success fn",
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

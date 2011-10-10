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
                    guid: "_asdf",
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
                    guid: "_asdf",
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
                    guid: "_asdf",
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
                    guid: "_asdf",
                    description: "",
                    names: [ "blah" ],
                    execute: "",
                });
            }).toThrowInstanceOf(InvalidData);

            expect(function() {
                new Fcommand({
                    guid: "_asdf",
                    description: "   \t   ",
                    names: [ "blah" ],
                    execute: "",
                });
            }).toThrowInstanceOf(InvalidData);
        }
    );

    it("throws if the Fcommand's execute property is not a string or a function",
        function() {
            expect(function() {
                new Fcommand({
                    guid: "_asdf",
                    description: "desc",
                    names: [ "blah" ],
                    execute: [],
                });
            }).toThrowInstanceOf(InvalidData);

            expect(function() {
                new Fcommand({
                    guid: "_asdf",
                    description: "desc",
                    names: [ "blah" ],
                    execute: "",
                });
            }).not.toThrow();

            expect(function() {
                new Fcommand({
                    guid: "_asdf",
                    description: "desc",
                    names: [ "blah" ],
                    execute: function(){},
                });
            }).not.toThrow();
        }
    );

    it("throws if the Fcommand's optspec is not a plain object",
        function() {
            expect(function() {
                new Fcommand({
                    guid: "_asdf",
                    description: "desc",
                    names: [ "blah" ],
                    execute: "",
                    optSpec: "",
                });
            }).toThrowInstanceOf(InvalidData);

            expect(function() {
                new Fcommand({
                    guid: "_asdf",
                    description: "desc",
                    names: [ "blah" ],
                    execute: function(){},
                    optSpec: { a: 1 },
                });
            }).not.toThrow();
        }
    );

    it("throws if the Fcommand's helpHtml is not a string",
        function() {
            expect(function() {
                new Fcommand({
                    guid: "_asdf",
                    description: "desc",
                    names: [ "blah" ],
                    execute: "",
                    helpHtml: [],
                });
            }).toThrowInstanceOf(InvalidData);

            expect(function() {
                new Fcommand({
                    guid: "_asdf",
                    description: "desc",
                    names: [ "blah" ],
                    execute: function(){},
                    helpHtml: "",
                });
            }).not.toThrow();
        }
    );

    it("returns if the input object is validated successfully",
        function() {
            var fcmd;

            expect(function() {
                fcmd = new Fcommand({
                    guid: "_asdf",
                    description: "desc",
                    names: [ "blah" ],
                    execute: function(){},
                    helpHtml: "",
                    optSpec: {a: { type: "boolean" } },
                });
            }).not.toThrow();

            expect(fcmd).toBeDefined();
        }
    );
}); // Fcommand.validate


describe("Fcommand.save", function() {

    it("calls the error callback if a FS error occurs during save",
        function() {
            var onError = jasmine.createSpy();
            var onSuccess = jasmine.createSpy();
            var fs = new FileSystem(1024);
            var guid = "///////";    // filenames can't have '/' in them

            var fcmd = new Fcommand({
                guid: guid,
                description: "desc",
                names: [ "blah" ],
                execute: "return 42;",
            });

            fcmd.save(fs, onSuccess, onError);

            waitsFor(function() { return onError.wasCalled },
                "save to fail", 2000);

            runs(function() {
                expect(onError.mostRecentCall.args[0].code).toBe(FileError.SECURITY_ERR);
                expect(onSuccess).not.toHaveBeenCalled();
            });
        });

    it("does not save the fcommand if its execute property is a function; still calls the success fn",
        function() {
            var fs = new FileSystem(1024);
            var onSuccess = jasmine.createSpy();
            var onError = jasmine.createSpy();

            spyOn(fs, "writeFile");

            var fcmd = new Fcommand({
                guid: "_asdf",
                description: "desc",
                names: [ "blah" ],
                execute: function(){},
            });

            fcmd.save(fs, onSuccess, onError);

            waitsFor(function() { return onSuccess.wasCalled },
                "save to finish", 2000);

            runs(function() {
                expect(onError).not.toHaveBeenCalled();
                expect(fs.writeFile).not.toHaveBeenCalled();
                expect(onSuccess).toHaveBeenCalled();
            });
        });

    it("saves the stringified Fcommand data to a file named its guid",
        function() {
            var onError = jasmine.createSpy();
            var onSuccess = jasmine.createSpy();
            var fs = new FileSystem(1024);
            var guid = "_asdf";

            var fcmd = new Fcommand({
                guid: guid,
                description: "desc",
                names: [ "blah" ],
                execute: "return 42;",
            });

            fcmd.save(fs, onSuccess, onError);

            waitsFor(function() { return onSuccess.wasCalled },
                "save to finish", 2000);

            runs(function() {
                expect(onError).not.toHaveBeenCalled();
                expect(onSuccess).toHaveBeenCalled();

                onSuccess.reset();
                onError.reset();

                fs.readFile(guid, onSuccess, onError);

                waitsFor(function() { return onSuccess.wasCalled; },
                    "read to finish", 2000);

                runs(function() {
                    expect(onError).not.toHaveBeenCalled();
                    expect(onSuccess).toHaveBeenCalledWith(jasmine.any(String));

                    onSuccess.reset();

                    fs.removeFile(guid, onSuccess);
                    waitsFor(function() { return onSuccess.wasCalled; },
                        "delete to finish", 2000);
                });
            });
        });
}); // Fcommand.save


describe("Fcommand.load", function() {

    it("calls the error callback with an Error if the file's content is not valid JSON", function() {
        var onError = jasmine.createSpy();
        var onSuccess = jasmine.createSpy();
        var fs = new FileSystem(1024);
        var guid = "_asdf2";

        fs.writeFile(guid, "not parseable JSON", function() {
           Fcommand.load(guid, fs, onSuccess, onError);
        }, onError);

        waitsFor(function() { return onError.wasCalled; },
            "failed load", 2000);

        runs(function() {
            expect(onError.mostRecentCall.args[0] instanceof SyntaxError).
                toBe(true);
            expect(onSuccess).not.toHaveBeenCalled();

            onSuccess.reset();

            fs.removeFile(guid, onSuccess);
            waitsFor(function() { return onSuccess.wasCalled; },
                "delete to finish", 2000);
        });
    });

    it("calls the error callback with a FileError if a FS error occurs", function() {
        var onError = jasmine.createSpy();
        var onSuccess = jasmine.createSpy();
        var fs = new FileSystem(1024);
        var guid = "?";     // invalid filename

        Fcommand.load(guid, fs, onSuccess, onError);

        waitsFor(function() { return onError.wasCalled; });

        runs(function() {
            expect(onError.mostRecentCall.args[0].code).
                toBe(FileError.INVALID_MODIFICATION_ERR);
            expect(onSuccess).not.toHaveBeenCalled();
        });
    });

    it("calls the error callback with an FcommandError if constructing the Fcommand from the file's data fails", function() {
        var onError = jasmine.createSpy();
        var onSuccess = jasmine.createSpy();
        var fs = new FileSystem(1024);
        var guid = "_asdf3";

        fs.writeFile(guid, JSON.stringify("valid JSON, invalid Fcommand"), function() {
           Fcommand.load(guid, fs, onSuccess, onError);
        }, onError);

        waitsFor(function() { return onError.wasCalled; },
            "failed loading Fcommand", 2000);

        runs(function() {
            console.log(onError.mostRecentCall.args[0]);
            expect(onError.mostRecentCall.args[0] instanceof FcommandError).
                toBe(true);
            expect(onSuccess).not.toHaveBeenCalled();

            onSuccess.reset();

            fs.removeFile(guid, onSuccess);
            waitsFor(function() { return onSuccess.wasCalled; },
                "delete to finish", 2000);
        });
    });

    it("calls the success callback with an Fcommand object on successful read of a valid Fcommand file", function() {
        var onError = jasmine.createSpy();
        var onSuccess = jasmine.createSpy();
        var fs = new FileSystem(1024);
        var guid = "_asdf5";
        var fcmd = new Fcommand({
            guid: guid,
            description: "desc",
            names: [ "blah" ],
            execute: "return 42;",
        });

        fcmd.save(fs, function() {
            Fcommand.load(guid, fs, onSuccess, onError);
        }, onError);

        waitsFor(function() { return onSuccess.wasCalled;});

        runs(function() {
            expect(onError).not.toHaveBeenCalled();
            expect(onSuccess.mostRecentCall.args[0]).toEqual(fcmd);

            onSuccess.reset();
            onError.reset();

            fs.removeFile(guid, onSuccess);
            waitsFor(function() { return onSuccess.wasCalled; },
                "delete to finish", 2000);
        });
    });
});


describe("Fcommand.prototype.delete", function() {

    it("calls the success callback and deletes the internal Fcommand data once the Fcommand file is deleted", function() {
        var onError = jasmine.createSpy();
        var onSuccess = jasmine.createSpy();
        var fs = new FileSystem(1024);
        var guid = "_asdf6";

        var fcmd = new Fcommand({
            guid: guid,
            description: "desc",
            names: [ "blah" ],
            execute: "return 42;",
        });

        fcmd.save(fs, function() {
            fcmd.delete(fs, onSuccess, onError);
        }, onError);

        waitsFor(function() { return onSuccess.wasCalled; });

        runs(function() {
            expect(onError).not.toHaveBeenCalled();
            expect(onSuccess).toHaveBeenCalled();
            expect(fcmd.data).toBe(undefined);

            var files = [];
            var done = false;
            fs.getFileList(function(list) {
                files = list;
                done = true;
            });

            waitsFor(function() { return done; });

            runs(function() {
                expect(files).not.toContain(guid);
            });
        });
    });
}); // Fcommand.prototype.delete

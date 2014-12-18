describe("Fcommand", function () {

var lang = navigator.language || "en-us";


xdescribe("Fcommand.validate", function() {

    beforeEach(function() {
        this.addMatchers({ toThrowInstanceOf: toThrowInstanceOf });
    });

    xit("throws if the parameter is not an object",
        function() {
            expect(function() {
                new Fcommand("");
            }).toThrowInstanceOf(FcommandError);
        }
    );

    xit("throws if the parameter is missing required properties",
        function() {
            expect(function() {
                new Fcommand({});
            }).toThrowInstanceOf(MissingPropertyError);
        }
    );

    xit("throws if the parameter's 'names' property is not an array",
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

    xit("throws if the parameter's 'names' array is empty",
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

    xit("throws if the parameter's 'description' property is not a string",
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

    xit("throws if the Fcommand's description is empty or only whitespace",
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

    xit("throws if the Fcommand's execute property is not a string or a function",
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

    xit("throws if the Fcommand's optspec is not a plain object",
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

    xit("throws if the Fcommand's helpHtml is not a string",
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

    xit("returns if the input object is validated successfully",
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


xdescribe("Fcommand.save", function() {

    xit("calls the error callback if a FS error occurs during save",
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

    xit("does not save the fcommand if its execute property is a function; still calls the success fn",
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

    xit("saves the stringified Fcommand data to a file named its guid",
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


xdescribe("Fcommand.load", function() {

    xit("calls the error callback with an Error if the file's content is not valid JSON", function() {
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

    xit("calls the error callback with a FileError if a FS error occurs", function() {
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

    xit("calls the error callback with an FcommandError if constructing the Fcommand from the file's data fails", function() {
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
            expect(onError.mostRecentCall.args[0] instanceof FcommandError).
                toBe(true);
            expect(onSuccess).not.toHaveBeenCalled();

            onSuccess.reset();

            fs.removeFile(guid, onSuccess);
            waitsFor(function() { return onSuccess.wasCalled; },
                "delete to finish", 2000);
        });
    });

    xit("calls the success callback with an Fcommand object on successful read of a valid Fcommand file", function() {
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


xdescribe("Fcommand.prototype.delete", function() {

    xit("calls the success callback and deletes the internal Fcommand data once the Fcommand file is deleted", function() {
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


describe("_extractMetadata", function() {


    it("throws if input document is invalid", function() {
        expect(function () {
            Fcommand._extractMetadata(null, lang);
        }).toThrowError(TypeError,
            "Cannot read property 'querySelectorAll' of null");
    });


    it("returns supported data from head's meta tags", function() {
        var docstr = '<head>';
        for (var f of Fcommand._supportedStringMetaFields)
        {
            docstr += '<meta name="' + f + '" content="test '+ f + '">';
        }

        docstr += '<link rel="icon" href="test icon url">' +
            '</head>';

        var doc = (new DOMParser).parseFromString(docstr, "text/html");

        expect(Fcommand._extractMetadata(doc, lang)).toEqual( {
            author: "test author",
            description: "test description",
            guid: "test guid",
            keywords: [ "test", "keywords" ],
            downloadURL: "test downloadURL",
            updateURL: "test updateURL",
            version: "test version",
            context: "test context",
            icon: "test icon url"
        });
    });


    it("returns missing metadata fields as undefined", function() {
        var doc = (new DOMParser).
            parseFromString('<head></head>', "text/html");

        expect(Fcommand._extractMetadata(doc, lang)).toEqual({
            author: undefined,
            description: undefined,
            guid: undefined,
            keywords: undefined,
            downloadURL: undefined,
            updateURL: undefined,
            version: undefined,
            context: undefined,
            icon: undefined
        });
    });


    it("parses keywords delimited by ',' and disregarding whitespace", function() {
        var docstr = '<head>';
        for (var f of Fcommand._requiredFields)
        {
            if (f === "keywords")
                docstr += '<meta name="' + f + '" content=" , , k1 , ,, k2 , , ">';
            else if (f === "version")
                docstr += '<meta name="' + f + '" content="1.2.3">';
            else
                docstr += '<meta name="' + f + '" content="test '+ f + '">';
        }

        docstr += "</head>";

        var doc = (new DOMParser).parseFromString(docstr, "text/html");

        expect(Fcommand._extractMetadata(doc, lang)).toEqual({
            author: "test author",
            description: "test description",
            guid: "test guid",
            keywords: [ "k1", "k2" ],
            version: "1.2.3",
            downloadURL: undefined,
            updateURL: undefined,
            context: undefined,
            icon: undefined
        });
    });


}); // _extractMetadata


describe("_validateMetadata", function() {


    it("verifies required fields have a defined value", function() {
        var docstr = '<head>';
        for (var f of Fcommand._requiredFields)
        {
            var doc = (new DOMParser).parseFromString(docstr + "</head>", "text/html");
            var meta = Fcommand._extractMetadata(doc, lang);

            expect(function () {
                Fcommand._validateMetadata(meta);
            }).toThrowError("Metadata is missing required field " + f);

            docstr += '<meta name="' + f + '" content="test '+ f + '">';
        }
    });


    it("throws if version is not semver-format", function() {
        var docstr = '<head>';
        for (var f of Fcommand._requiredFields)
        {
            docstr += '<meta name="' + f + '" content="test '+ f + '">';
        }

        docstr += "</head>";

        var doc = (new DOMParser).parseFromString(docstr, "text/html");
        var meta = Fcommand._extractMetadata(doc, lang);

        expect(function () {
            Fcommand._validateMetadata(meta);
        }).toThrowError("Metadata version 'test version' is not semver-compliant");
    });


    it("throws if a keyword string is empty", function() {
        var docstr = '<head>';
        for (var f of Fcommand._requiredFields)
        {
            if (f === "keywords")
                docstr += '<meta name="' + f + '" content="">';
            else if (f === "version")
                docstr += '<meta name="' + f + '" content="1.2.3">';
            else
                docstr += '<meta name="' + f + '" content="test '+ f + '">';
        }

        docstr += "</head>";

        var doc = (new DOMParser).parseFromString(docstr, "text/html");

        var meta = Fcommand._extractMetadata(doc, lang);

        expect(function () {
            Fcommand._validateMetadata(meta);
        }).toThrowError("Metadata keyword field must have at least one keyword");
    });
}); // _validateMetadata


describe("_extractOptSpec", function() {


    it("throws if input document is invalid", function() {
        expect(function () {
            Fcommand._extractOptSpec(null, lang);
        }).toThrowError(TypeError,
            "Cannot read property 'querySelectorAll' of null");
    });


    it("returns null if document has no template#getopt", function() {
        var doc = (new DOMParser).parseFromString("<div></div>", "text/html");
        expect(Fcommand._extractOptSpec(doc, lang)).toEqual(null);
    });


    it("throws if template#getopt's text is not parseable JSON", function() {
        var doc = (new DOMParser).
            parseFromString('<template id="getopt">X</template>', "text/html");

        try {
            Fcommand._extractOptSpec(doc, lang);
        }

        catch (e)
        {
            expect(e.message).toMatch(/^Failed parsing template#getopt: SyntaxError: Unexpected token X/);
        }
    });


    it("returns JSON opt-spec", function() {
        var doc = (new DOMParser).
            parseFromString('<template id="getopt">{"opt": { "type": "value" }}</template>', "text/html");
        ;
        expect(Fcommand._extractOptSpec(doc, lang)).toEqual({ opt: { type: "value" }});
    });


    it("can handle an opt-spec block with HTML comments and being wrapped in <script>", function() {
        var doc = (new DOMParser).
            parseFromString('<template id="getopt"><!-- a comment --><script>{"opt": { "type": "value" }}</script></template>', "text/html");
        ;
        expect(Fcommand._extractOptSpec(doc, lang)).toEqual({ opt: { type: "value" }});
    });


}); // extractOptSpec



}); // Fcommand

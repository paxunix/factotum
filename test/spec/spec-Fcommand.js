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

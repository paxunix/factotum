describe("GetOpt", function () {

describe("getOptions", function() {

    it("returns no options and no args for an empty argv", function() {
        expect(
            GetOpt.getOptions({
            }, [
            ])
        ).toEqual({
            opts: {
            },
            argv: [
            ]
        });
    });

    it("returns no options and expected args (even if they look like options) for an empty option spec", function() {
        expect(
            GetOpt.getOptions({
            }, [
                "-a",
                "-b",
                "-c"
            ])
        ).toEqual({
            opts: {
            },
            argv: [
                "-a",
                "-b",
                "-c"
            ]
        });
    });

    it("understands simple boolean-type options", function() {
        expect(
            GetOpt.getOptions({
                "a" : { type: "boolean" }
            }, [
                "-a"
            ])
        ).toEqual({
            opts: {
                "a": true
            },
            argv: [
            ]
        });
    });

    it("considers any number of leading - to indicate an option", function() {
        expect(
            GetOpt.getOptions({
                "help": { type: "boolean" },
                "h": { type: "boolean" },
                "three": { type: "boolean" }
            }, [
                "-h",
                "--help",
                "--h",
                "-help",
                "---three"
            ])
        ).toEqual({
            opts: {
                "help": true,
                "h": true,
                "three": true
            },
            argv: [
            ]
        });
    });

    it("understands 'no'-boolean-type options with hyphen separator", function() {
        expect(
            GetOpt.getOptions({
                "a": { type: "boolean" },
                "b": { type: "boolean" }
            }, [
                "-a",
                "-no-b",
                "--",
                "arg"
            ])
        ).toEqual({
            opts: {
                "a": true,
                "b": false
            },
            argv: [
                "arg"
            ]
        });
    });

    it("delimits options from arguments with --", function() {
        expect(
            GetOpt.getOptions({
                "a": { type: "boolean" },
                "b": { type: "boolean" }
            }, [
                "-a",
                "-b",
                "--",
                "one",
                "-two"
            ])
        ).toEqual({
            opts: {
                "a": true,
                "b": true
            },
            argv: [
                "one",
                "-two"
            ]
        });
    });

    it("accepts no options and consumes -- delimiting args", function() {
        expect(
            GetOpt.getOptions({
            }, [
                "--",
                "one",
                "two"
            ])
        ).toEqual({
            opts: {
            },
            argv: [
                "one",
                "two"
            ]
        });
    });

    it("accepts no options and consumes --, allows following --", function() {
        expect(
            GetOpt.getOptions({
            }, [
                "--",
                "--"
            ])
        ).toEqual({
            opts: {
            },
            argv: [
                "--"
            ]
        });
    });

    it("accepts mixed options and arguments", function() {
        expect(
            GetOpt.getOptions({
                "a": { type: "boolean" },
                "b": { type: "boolean" }
            }, [
                "-a",
                "one",
                "-b",
                "two",
                "--",
                "three"
            ])
        ).toEqual({
            opts: {
                "a": true,
                "b": true
            },
            argv: [
                "one",
                "two",
                "three"
            ]
        });
    });

    it("treats options not in spec as arguments", function() {
        expect(
            GetOpt.getOptions({
            }, [
                "-a",
                "--b",
                "---c",
                "one",
                "two",
                "three"
            ])
        ).toEqual({
            opts: {
            },
            argv: [
                "-a",
                "--b",
                "---c",
                "one",
                "two",
                "three"
            ]
        });
    });

    it("throws an exception on options with unknown types", function() {
        expect(function() {
            GetOpt.getOptions({
                "a": { type: "UnKnOwN" }
            }, [
                "-a",
                "--",
                "arg"
            ])
        }).toThrow("Unknown option type 'UnKnOwN'.");
    });

    it("supports incremental-type options", function() {
        expect(
            GetOpt.getOptions({
                "a": { type: "incremental" }
            }, [
                "-a",
                "-a",
                "-a"
            ])
        ).toEqual({
            opts: {
                "a": 3
            },
            argv: [
            ]
        });
    });

    it("supports string value-type options", function() {
        expect(
            GetOpt.getOptions({
                "opt": { type: "value" }
            }, [
                "--opt", "val"
            ])
        ).toEqual({
            opts: {
                "opt": "val"
            },
            argv: [
            ]
        });
    });

    it("throws exception if no value is given for a value-type option", function() {
        expect(
            GetOpt.getOptions({
                "opt": { type: "value" },
                "b": { type: "boolean" }
            }, [
                "--b",
                "--opt"
            ])
        ).toEqual({
            opts: {
                "opt": null,
                "b": true,
            },
            argv: [
            ]
        });
    });

    it("uses the final value for same-name value options", function() {
        expect(
            GetOpt.getOptions({
                "opt": { type: "value" }
            }, [
                "--opt", "val",
                "--opt", "val2",
                "--a",
                "arg",
                "--opt", "final"
            ])
        ).toEqual({
            opts: {
                "opt": "final"
            },
            argv: [
                "--a",
                "arg"
            ]
        });
    });

    it("throws an exception if the value would be the -- opt/arg separator", function() {
        expect(
            GetOpt.getOptions({
                "opt": { type: "value" }
            }, [
                "--opt",
                "--",
                "arg"
            ])
        ).toEqual({
            opts: {
                "opt": null
            },
            argv: [
                "arg"
            ]
        });
    });

    it("supports a value-option with a value and then no value (and it's not array-enabled", function() {
        expect(
            GetOpt.getOptions({
                "opt": { type: "value" }
            }, [
                "--opt", "val2",
                "--opt",
                "--",
                "blah",
            ])
        ).toEqual({
            opts: {
                "opt": null
            },
            argv: [
                "blah"
            ]
        });
    });

    it("value options do not consume the next word if it's a valid option", function() {
        expect(
            GetOpt.getOptions({
                "opt": { type: "value" },
                "b": { type: "boolean" }
            }, [
                "--opt", "-b",
                "--",
                "arg"
            ])
        ).toEqual({
            opts: {
                "opt": null,
                "b": true
            },
            argv: [
                "arg"
            ]
        });
    });

    it("value options consume the next word if it looks like an option but isn't known", function() {
        expect(
            GetOpt.getOptions({
                "opt": { type: "value" },
            }, [
                "--opt", "--unknown-option",
                "--",
                "arg"
            ])
        ).toEqual({
            opts: {
                "opt": "--unknown-option"
            },
            argv: [
                "arg"
            ]
        });
    });

    it("handles sequence of value-options with values", function() {
        expect(
            GetOpt.getOptions({
                "opt": { type: "value" },
                "b": { type: "value" }
            }, [
                "--opt", "testing 1 2 3",
                "-b", "blah",
                "--",
                "arg"
            ])
        ).toEqual({
            opts: {
                "opt": "testing 1 2 3",
                "b": "blah"
            },
            argv: [
                "arg"
            ]
        });
    });

    it("supports value-type option with a '-' value", function() {
        expect(
            GetOpt.getOptions({
                "opt": { type: "value" }
            }, [
                "--opt", "-",
                "arg"
            ])
        ).toEqual({
            opts: {
                "opt": "-"
            },
            argv: [
                "arg"
            ]
        });
    });

    it("supports value-type option with a '---' value", function() {
        expect(
            GetOpt.getOptions({
                "opt": { type: "value" }
            }, [
                "--opt", "---",
                "arg"
            ])
        ).toEqual({
            opts: {
                "opt": "---"
            },
            argv: [
                "arg"
            ]
        });
    });

    it("supports array-accumulation of value options", function() {
        expect(
            GetOpt.getOptions({
                "opt": { type: "value", array: true }
            }, [
                "--opt", "blah",
                "--opt", "test",
                "--opt", "1 2 3",
                "--",
                "arg"
            ])
        ).toEqual({
            opts: {
                "opt": [
                    "blah",
                    "test",
                    "1 2 3"
                ]
            },
            argv: [
                "arg"
            ]
        });
    });

    it("drops the null value for array-accumulated value options if a middle option has no value", function() {
        expect(
            GetOpt.getOptions({
                "opt": { type: "value", array: true }
            }, [
                "--opt", "blah",
                "--opt",
                "--opt", "1 2 3",
                "--",
                "arg"
            ])
        ).toEqual({
            opts: {
                "opt": [
                    "blah",
                    null,
                    "1 2 3"
                ]
            },
            argv: [
                "arg"
            ]
        });
    });

    it("supports option aliases", function() {
        expect(
            GetOpt.getOptions({
                "opt": { type: "boolean", aliases: [ "o", "option" ] }
            }, [
                "--option",
                "-o",
                "--",
                "arg"
            ])
        ).toEqual({
            opts: {
                "opt": true
            },
            argv: [
                "arg"
            ]
        });
    });

    it("supports boolean option aliases starting with 'no'", function() {
        expect(
            GetOpt.getOptions({
                "o": { type: "boolean", aliases: [ "opt", "option" ] }
            }, [
                "--no-option",
                "--",
                "arg"
            ])
        ).toEqual({
            opts: {
                "o": false
            },
            argv: [
                "arg"
            ]
        });
    });

    it("supports incremental options starting with 'no'", function() {
        expect(
            GetOpt.getOptions({
                "noopt": { type: "incremental" }
            }, [
                "--noopt",
                "-noopt",
                "arg"
            ])
        ).toEqual({
            opts: {
                "noopt": 2
            },
            argv: [
                "arg"
            ]
        });
    });

    it("supports boolean options starting with 'no'", function() {
        expect(
            GetOpt.getOptions({
                "noopt": { type: "boolean" }
            }, [
                "--noopt",
                "arg"
            ])
        ).toEqual({
            opts: {
                "noopt": true
            },
            argv: [
                "arg"
            ]
        });
    });

    it("supports boolean options starting with 'no-'", function() {
        expect(
            GetOpt.getOptions({
                "no-opt": { type: "boolean" }
            }, [
                "--no-opt",
                "arg"
            ])
        ).toEqual({
            opts: {
                "no-opt": true
            },
            argv: [
                "arg"
            ]
        });
    });

    it("supports negated boolean options starting with 'no'", function() {
        expect(
            GetOpt.getOptions({
                "noopt": { type: "boolean" }
            }, [
                "--no-noopt",
                "arg"
            ])
        ).toEqual({
            opts: {
                "noopt": false
            },
            argv: [
                "arg"
            ]
        });
    });

    it("supports negated boolean options starting with 'no-'", function() {
        expect(
            GetOpt.getOptions({
                "no-opt": { type: "boolean" }
            }, [
                "--no-no-opt",
                "arg"
            ])
        ).toEqual({
            opts: {
                "no-opt": false
            },
            argv: [
                "arg"
            ]
        });
    });

    it("handles 'option=value' value-options", function() {
        expect(
            GetOpt.getOptions({
                "a": { type: "value" }
            }, [
                "--a=the value",
                "arg"
            ])
        ).toEqual({
            opts: {
                "a": "the value"
            },
            argv: [
                "arg"
            ]
        });
    });

    it("handles 'option=value' value-options with empty value", function() {
        expect(
            GetOpt.getOptions({
                "a": { type: "value" }
            }, [
                "--a=",
                "arg"
            ])
        ).toEqual({
            opts: {
                "a": ""
            },
            argv: [
                "arg"
            ]
        });
    });

    it("treats non-value options with '=<value>' suffix as args", function() {
        expect(
            GetOpt.getOptions({
                "a": { type: "boolean" }
            }, [
                "--a=the value",
                "arg"
            ])
        ).toEqual({
            opts: {
            },
            argv: [
                "--a=the value",
                "arg"
            ]
        });
    });

    it("supports default values for options", function () {
        expect(
            GetOpt.getOptions({
                "a": { type: "value", default: "test" },
                "b": { type: "boolean", default: true },
                "b2": { type: "boolean", default: false },
                "c": { type: "incremental", default: 42 }
            }, [
                "arg"
            ])
        ).toEqual({
            opts: {
                a: "test",
                b: true,
                b2: false,
                c: 42
            },
            argv: [
                "arg"
            ]
        });
    });

    it("supports default values that don't override given values for options", function () {
        expect(
            GetOpt.getOptions({
                "a": { type: "value", default: "test" },
                "b": { type: "boolean", default: true },
                "b2": { type: "boolean", default: false },
                "c": { type: "incremental", default: 42 }
            }, [
                "-a", "good",
                "-no-b",
                "-b2",
                "-c",
                "arg"
            ])
        ).toEqual({
            opts: {
                a: "good",
                b: false,
                b2: true,
                c: 43
            },
            argv: [
                "arg"
            ]
        });
    });

    it("honours array setting when setting default for value and boolean options", function () {
        expect(
            GetOpt.getOptions({
                "a": { type: "value", default: "test", array: true },
                "b": { type: "boolean", default: true, array: true },
                "c": { type: "incremental", default: 42, array: true }
            }, [
                "arg"
            ])
        ).toEqual({
            opts: {
                a: [ "test" ],
                b: true,
                c: 42,
            },
            argv: [
                "arg"
            ]
        });
    });

    it("handles incremental opt followed by negated boolean opt of same name as incremental", function () {
        expect(
            GetOpt.getOptions({
                "c": { type: "incremental" }
            }, [
                "-c",
                "-no-c",
                "arg",
            ])
        ).toEqual({
            opts: {
                c: 1,
            },
            argv: [
                "-no-c",
                "arg"
            ]
        });
    });

}); // getOptions

}); // GetOpt

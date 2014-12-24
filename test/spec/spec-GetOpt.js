"use strict";

describe("GetOpt", function () {

var GetOpt = require("../../scripts/GetOpt.js");

describe("getOptions", function() {

    it("returns no options and no args for an empty argv", function() {
        expect(
            GetOpt.getOptions({
            }, [
            ])
        ).toEqual({
            _: [
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
            _: [
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
            "a": true,
            _: [
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
            "help": true,
            "h": true,
            "three": true,
            _: [
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
            "a": true,
            "b": false,
            _: [
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
            "a": true,
            "b": true,
            _: [
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
            _: [
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
            _: [
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
            "a": true,
            "b": true,
            _: [
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
            _: [
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
            "a": 3,
            _: [
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
            "opt": "val",
            _: [
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
            "opt": null,
            "b": true,
            _: [
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
            "opt": "final",
            _: [
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
            "opt": null,
            _: [
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
            "opt": null,
            _: [
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
            "opt": null,
            "b": true,
            _: [
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
            "opt": "--unknown-option",
            _: [
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
            "opt": "testing 1 2 3",
            "b": "blah",
            _: [
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
            "opt": "-",
            _: [
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
            "opt": "---",
            _: [
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
            "opt": [
                "blah",
                "test",
                "1 2 3"
            ],
            _: [
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
            "opt": [
                "blah",
                null,
                "1 2 3"
            ],
            _: [
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
            "opt": true,
            _: [
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
            "o": false,
            _: [
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
            "noopt": 2,
            _: [
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
            "noopt": true,
            _: [
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
            "no-opt": true,
            _: [
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
            "noopt": false,
            _: [
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
            "no-opt": false,
            _: [
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
            "a": "the value",
            _: [
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
            "a": "",
            _: [
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
            _: [
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
            a: "test",
            b: true,
            b2: false,
            c: 42,
            _: [
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
            a: "good",
            b: false,
            b2: true,
            c: 43,
            _: [
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
            a: [ "test" ],
            b: true,
            c: 42,
            _: [
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
            c: 1,
            _: [
                "-no-c",
                "arg"
            ]
        });
    });

}); // getOptions

}); // GetOpt

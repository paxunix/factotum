describe("GetOpt.shellWordSplit", function() {

    it("returns no words for an empty string", function() {
        expect(
            GetOpt.shellWordSplit("")
        ).toEqual([])
    });

    it("returns no words for a whitespace string", function() {
        expect(
            GetOpt.shellWordSplit("  \t  \t ")
        ).toEqual([])
    });

    it("returns one word for a one-word string", function() {
        expect(
            GetOpt.shellWordSplit("one")
        ).toEqual(["one"])
    });

    it("returns one word if surrounded by whitespace", function() {
        expect(
            GetOpt.shellWordSplit("  word  ")
        ).toEqual(["word"])
    });

    it("returns two words if delimited by whitespace", function() {
        expect(
            GetOpt.shellWordSplit("  one  two  ")
        ).toEqual(["one", "two"])
    });

    it("considers \\-escaped whitespace part of words", function() {
        expect(
            GetOpt.shellWordSplit("this\\ is\\ all\\ one\\ word")
        ).toEqual(["this is all one word"]);
    });

    it("ignores whitespace following \\-escaped whitespace", function() {
        expect(
            GetOpt.shellWordSplit("word\\ \t ")
        ).toEqual(["word "]);
    });

    it("returns no words for only a \\", function() {
        expect(
            GetOpt.shellWordSplit("\\")
        ).toEqual([]);
    });

    it("returns \\ for \\\\", function() {
        expect(
            GetOpt.shellWordSplit("\\\\")
        ).toEqual(["\\"]);
    });

    it("returns accumulated words even with EOL \\", function() {
        expect(
            GetOpt.shellWordSplit(" one two \\")
        ).toEqual(["one", "two"]);
    });

    it("considers escaped characters as verbatim", function() {
        expect(
            GetOpt.shellWordSplit("\\ \\o\\n\\e\\ \\t\\w\\o\\ ")
        ).toEqual([" one two "]);
    });

    it("preserves whitespace inside double-quoted strings", function() {
        expect(
            GetOpt.shellWordSplit('  "one two  " ')
        ).toEqual(["one two  "]);
    });

    it("preserves whitespace inside single-quoted strings", function() {
        expect(
            GetOpt.shellWordSplit("  'one two  ' ")
        ).toEqual(["one two  "]);
    });

    it("preserves all whitespace inside only-whitespace string", function() {
        expect(
            GetOpt.shellWordSplit("  '  \t  ' ")
        ).toEqual(["  \t  "]);
    });

    it("only balances the outermost double-quotes", function() {
        expect(
            GetOpt.shellWordSplit('  "one \' two " ')
        ).toEqual(['one \' two ']);
    });

    it("only balances the outermost single-quotes", function() {
        expect(
            GetOpt.shellWordSplit('  \'one " two \' ')
        ).toEqual(['one " two ']);
    });

    it("strips double-quotes around words", function() {
        expect(
            GetOpt.shellWordSplit('"one"')
        ).toEqual(["one"]);
    });

    it("strips single-quotes around words", function() {
        expect(
            GetOpt.shellWordSplit("'one'")
        ).toEqual(["one"]);
    });

    it("preserves escaped double-quote as part of word", function() {
        expect(
            GetOpt.shellWordSplit('test\\"ing')
        ).toEqual(['test"ing']);
    });

    it("preserves escaped single-quote as part of word", function() {
        expect(
            GetOpt.shellWordSplit("test\\'ing")
        ).toEqual(["test'ing"]);
    });

    it("does not start a word on escaped double-quote", function() {
        expect(
            GetOpt.shellWordSplit('test\\" one two \\"ing three')
        ).toEqual(['test"', "one", "two", '"ing', "three"]);
    });

    it("does not start a word on escaped single-quote", function() {
        expect(
            GetOpt.shellWordSplit("test\\' one two \\'ing three")
        ).toEqual(["test'", "one", "two", "'ing", "three"]);
    });

    it("continues and starts a word on unescaped single-quote", function() {
        expect(
            GetOpt.shellWordSplit("wo'rd testing 1 2 3' next")
        ).toEqual(["word testing 1 2 3", "next"]);
    });

    it("continues and starts a word on unescaped double-quote", function() {
        expect(
            GetOpt.shellWordSplit('wo"rd testing 1 2 3" next')
        ).toEqual(["word testing 1 2 3", "next"]);
    });

    it("does not start a new word of closing single-quote is not followed by whitespace", function() {
        expect(
            GetOpt.shellWordSplit("All'part of one'word")
        ).toEqual(["Allpart of oneword"]);
    });

    it("continues the word to EOL if single-quote is unmatched", function() {
        expect(
            GetOpt.shellWordSplit("one 'two three  ")
        ).toEqual(["one", "two three  "]);
    });

    it("continues the word to EOL if double-quote is unmatched", function() {
        expect(
            GetOpt.shellWordSplit('one "two three  ')
        ).toEqual(["one", "two three  "]);
    });

    it("parses an arbitrary shell command line into words", function() {
        expect(
            GetOpt.shellWordSplit(" blah \"   \"   arg -b --long-opt -d=1 --opt=\"one two three\" -debug --verbose=yes -- arg3 arg4 --arg5 'arg six \"has multiple\" words' '\"' ")
        ).toEqual(["blah", "   ", "arg", "-b", "--long-opt", "-d=1", "--opt=one two three", "-debug", "--verbose=yes", "--", "arg3", "arg4", "--arg5", 'arg six "has multiple" words', '"'])
   });

}); // shellWordSplit spec


describe("GetOpt.getOptions", function() {

    it("yields no options and no args for an empty arg string", function() {
        expect(
            GetOpt.getOptions({}, "")
        ).toEqual({ opts: {}, argv: []});
    });

    it("yields no options and expected args (even if they look like options) for an empty option spec", function() {
        expect(
            GetOpt.getOptions({}, "-a -b -c")
        ).toEqual({ opts: {}, argv: ["-a", "-b", "-c"]});
    });

    it("understands simple boolean-type options", function() {
        expect(
            GetOpt.getOptions({ "a" : { type: "boolean" } }, "-a")
        ).toEqual({ opts: { "a": true },
                    argv: []});
    });

    it("considers any number of leading - to indicate an option", function() {
        expect(
            GetOpt.getOptions({ "help": { type: "boolean" },
                                "h": { type: "boolean" },
                                "three": { type: "boolean" } },
                                "-h --help --h -help ---three")
        ).toEqual({ opts: { "help": true,
                            "h": true,
                            "three": true },
                    argv: []});
    });

    it("understands 'no'-boolean-type options with hyphen separator", function() {
        expect(
            GetOpt.getOptions({ "a": { type: "boolean" },
                                "b": { type: "boolean" } }, "-a -no-b -- arg")
        ).toEqual({ opts: { "a": true,
                            "b": false},
                    argv: ["arg"]});
    });

    it("understands 'no'-boolean-type options without hyphen separator", function() {
        expect(
            GetOpt.getOptions({ "a": { type: "boolean" },
                                "b": { type: "boolean" } }, "-a -nob -- arg")
        ).toEqual({ opts: { "a": true,
                            "b": false},
                    argv: ["arg"]});
    });

    it("delimits options from arguments with --", function() {
        expect(
            GetOpt.getOptions({ "a": { type: "boolean" },
                                "b": { type: "boolean" } }, "-a -b -- one -two")
        ).toEqual({ opts: { "a": true,
                            "b": true },
                    argv: [ "one", "-two" ]});
    });

    it("accepts no options and -- delimiting args", function() {
        expect(
            GetOpt.getOptions({}, "-- one two")
        ).toEqual({ opts: {},
                    argv: [ "one", "two" ]});
    });

    it("accepts mixed options and arguments", function() {
        expect(
            GetOpt.getOptions({ "a": { type: "boolean" },
                                "b": { type: "boolean" } }, "-a one -b two -- three")
        ).toEqual({ opts: { "a": true,
                            "b": true },
                    argv: [ "one", "two", "three" ]});
    });

    it("treats options not in spec as arguments", function() {
        expect(
            GetOpt.getOptions({}, "-a --b ---c one two three")
        ).toEqual({ opts: {},
                    argv: ["-a", "--b", "---c", "one", "two", "three"]});
    });

    it("throws an exception on options with unknown types", function() {
        expect(function() {
            GetOpt.getOptions({ "a": { type: "UnKnOwN" } }, "-a -- arg")
        }).toThrow("Unknown option type 'UnKnOwN'.");
    });

    it("supports incremental-type options", function() {
        expect(
            GetOpt.getOptions({ "a": { type: "incremental" } },
                              "-a -a -a")
        ).toEqual({ opts: { "a": 3 }, argv: []});
    });

    it("decrements an incremental option's value if the no-opt form is used", function() {
        expect(
            GetOpt.getOptions({ "a": { type: "incremental" } },
                              "-a -noa -a -a")
        ).toEqual({ opts: { "a": 2 }, argv: []});
    });

    it("won't decrement an incremental option's value below 0", function() {
        expect(
            GetOpt.getOptions({ "a": { type: "incremental" } },
                              "-no-a -no-a ---no-a")
        ).toEqual({ opts: { "a": 0 }, argv: []});
    });

    it("supports string value-type options", function() {
        expect(
            GetOpt.getOptions({ "opt": { type: "value" } },
                              "--opt val")
        ).toEqual({ opts: { "opt": "val" }, argv: []});
    });

    it("throws exception if no value is given for a value-type option", function() {
        expect(function() {
            GetOpt.getOptions({ "opt": { type: "value" },
                                "b": { type: "boolean" } },
                              "--b --opt")
        }).toThrow("Option 'opt' requires a value.");
    });

    it("uses the final value for same-name value options", function() {
        expect(
            GetOpt.getOptions({ "opt": { type: "value" } },
                              "--opt val --opt val2 --a arg --opt final")
        ).toEqual({ opts: { "opt": "final" }, argv: [ "--a", "arg" ]});
    });

    it("throws an exception if the value would be the -- opt/arg separator", function() {
        expect(function() {
            GetOpt.getOptions({ "opt": { type: "value" } },
                              "--opt -- arg ")
        }).toThrow("Option 'opt' requires a value.");
    });

    it("if a value-option is given a value and then no value, the final value is used", function() {
        expect(
            GetOpt.getOptions({ "opt": { type: "value" } },
                              "--opt val1 --opt val2 --opt -- blah --a arg --opt final")
        ).toEqual({ opts: { "opt": "val2" },
                    argv: [ "blah", "--a", "arg", "--opt", "final" ]});
    });

    it("throws an exception if value-option with no value is followed by a valid option", function() {
        expect(function() {
            GetOpt.getOptions({ "opt": { type: "value" },
                                "b": { type: "boolean" } },
                              "--opt -b -- arg ")
        }).toThrow("Option 'opt' requires a value.");
    });

    it("handles sequence of value-options with values", function() {
        expect(GetOpt.getOptions({ "opt": { type: "value" },
                                "b": { type: "value" } },
                              "--opt 'testing 1 2 3' -b \"blah\" -- arg ")
        ).toEqual({ opts: { "opt": "testing 1 2 3",
                            "b": "blah" },
                    argv: [ "arg" ]});
    });

    it("supports value-type option with a '-' value", function() {
        expect(
            GetOpt.getOptions({ "opt": { type: "value" } },
                              "--opt - arg")
        ).toEqual({ opts: { "opt": "-" }, argv: [ "arg" ]});
    });

    it("supports value-type option with a '---' value", function() {
        expect(
            GetOpt.getOptions({ "opt": { type: "value" } },
                              "--opt --- arg")
        ).toEqual({ opts: { "opt": "---" }, argv: [ "arg" ]});
    });

}); // GetOpt.getOptions

describe("shellWordSplit", function() {

    it("returns no words for an empty string", function() {
        expect(
            shellWordSplit("")
        ).toEqual([])
    });

    it("returns no words for a whitespace string", function() {
        expect(
            shellWordSplit("  \t  \t ")
        ).toEqual([])
    });

    it("returns one word for a one-word string", function() {
        expect(
            shellWordSplit("one")
        ).toEqual(["one"])
    });

    it("returns one word if surrounded by whitespace", function() {
        expect(
            shellWordSplit("  word  ")
        ).toEqual(["word"])
    });

    it("returns two words if delimited by whitespace", function() {
        expect(
            shellWordSplit("  one  two  ")
        ).toEqual(["one", "two"])
    });

    it("considers \\-escaped whitespace part of words", function() {
        expect(
            shellWordSplit("this\\ is\\ all\\ one\\ word")
        ).toEqual(["this is all one word"]);
    });

    it("ignores whitespace following \\-escaped whitespace", function() {
        expect(
            shellWordSplit("word\\ \t ")
        ).toEqual(["word "]);
    });

    it("returns no words for only a \\", function() {
        expect(
            shellWordSplit("\\")
        ).toEqual([]);
    });

    it("returns \\ for \\\\", function() {
        expect(
            shellWordSplit("\\\\")
        ).toEqual(["\\"]);
    });

    it("returns accumulated words even with EOL \\", function() {
        expect(
            shellWordSplit(" one two \\")
        ).toEqual(["one", "two"]);
    });

    it("considers escaped characters as verbatim", function() {
        expect(
            shellWordSplit("\\ \\o\\n\\e\\ \\t\\w\\o\\ ")
        ).toEqual([" one two "]);
    });

    it("preserves whitespace inside double-quoted strings", function() {
        expect(
            shellWordSplit('  "one two  " ')
        ).toEqual(["one two  "]);
    });

    it("preserves whitespace inside single-quoted strings", function() {
        expect(
            shellWordSplit("  'one two  ' ")
        ).toEqual(["one two  "]);
    });

    it("preserves all whitespace inside only-whitespace string", function() {
        expect(
            shellWordSplit("  '  \t  ' ")
        ).toEqual(["  \t  "]);
    });

    it("only balances the outermost double-quotes", function() {
        expect(
            shellWordSplit('  "one \' two " ')
        ).toEqual(['one \' two ']);
    });

    it("only balances the outermost single-quotes", function() {
        expect(
            shellWordSplit('  \'one " two \' ')
        ).toEqual(['one " two ']);
    });

    it("strips double-quotes around words", function() {
        expect(
            shellWordSplit('"one"')
        ).toEqual(["one"]);
    });

    it("strips single-quotes around words", function() {
        expect(
            shellWordSplit("'one'")
        ).toEqual(["one"]);
    });

    it("preserves escaped double-quote as part of word", function() {
        expect(
            shellWordSplit('test\\"ing')
        ).toEqual(['test"ing']);
    });

    it("preserves escaped single-quote as part of word", function() {
        expect(
            shellWordSplit("test\\'ing")
        ).toEqual(["test'ing"]);
    });

    it("does not start a word on escaped double-quote", function() {
        expect(
            shellWordSplit('test\\" one two \\"ing three')
        ).toEqual(['test"', "one", "two", '"ing', "three"]);
    });

    it("does not start a word on escaped single-quote", function() {
        expect(
            shellWordSplit("test\\' one two \\'ing three")
        ).toEqual(["test'", "one", "two", "'ing", "three"]);
    });

    it("continues and starts a word on unescaped single-quote", function() {
        expect(
            shellWordSplit("wo'rd testing 1 2 3' next")
        ).toEqual(["word testing 1 2 3", "next"]);
    });

    it("continues and starts a word on unescaped double-quote", function() {
        expect(
            shellWordSplit('wo"rd testing 1 2 3" next')
        ).toEqual(["word testing 1 2 3", "next"]);
    });

    it("does not start a new word of closing single-quote is not followed by whitespace", function() {
        expect(
            shellWordSplit("All'part of one'word")
        ).toEqual(["Allpart of oneword"]);
    });

    it("continues the word to EOL if single-quote is unmatched", function() {
        expect(
            shellWordSplit("one 'two three  ")
        ).toEqual(["one", "two three  "]);
    });

    it("continues the word to EOL if double-quote is unmatched", function() {
        expect(
            shellWordSplit('one "two three  ')
        ).toEqual(["one", "two three  "]);
    });

    it("parses an arbitrary shell command line into words", function() {
        expect(
            shellWordSplit(" blah \"   \"   arg -b --long-opt -d=1 --opt=\"one two three\" -debug --verbose=yes -- arg3 arg4 --arg5 'arg six \"has multiple\" words' '\"' ")
        ).toEqual(["blah", "   ", "arg", "-b", "--long-opt", "-d=1", "--opt=one two three", "-debug", "--verbose=yes", "--", "arg3", "arg4", "--arg5", 'arg six "has multiple" words', '"'])
   });

});


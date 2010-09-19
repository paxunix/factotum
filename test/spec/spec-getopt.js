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

});


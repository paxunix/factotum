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

});


describe("shellWordSplit", function() {
    it("should return no words for an empty string", function() {
        expect(
            shellWordSplit("")
        ).toEqual([])
    });

    it("should return no words for a whitespace string", function() {
        expect(
            shellWordSplit("  \t  \t ")
        ).toEqual([])
    });

    it("should return one word for a one-word string", function() {
        expect(
            shellWordSplit("one")
        ).toEqual(["one"])
    });

    it("should return one word if surrounded by whitespace", function() {
        expect(
            shellWordSplit("  word  ")
        ).toEqual(["word"])
    });

    it("should return two words if delimited by whitespace", function() {
        expect(
            shellWordSplit("  one  two  ")
        ).toEqual(["one", "two"])
    });

});


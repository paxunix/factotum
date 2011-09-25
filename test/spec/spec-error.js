describe("FcommandError", function() {
    it("constructs an FcommandError object with info about the exception", function() {
        var msg = "error info";
        var err = new FcommandError(msg);

        expect(err instanceof Error).toBe(true);
        expect(err instanceof FcommandError).toBe(true);
        expect(err.message).toEqual(msg);
    });
}); // FcommandError


describe("MissingPropertyError", function() {
    it("constructs a MissingPropertyError object with info about the exception", function() {
        var msg = "error info";
        var err = new MissingPropertyError(msg);

        expect(err instanceof Error).toBe(true);
        expect(err instanceof FcommandError).toBe(true);
        expect(err instanceof MissingPropertyError).toBe(true);
        expect(err.message).toEqual(msg);
    });
}); // MissingPropertyError

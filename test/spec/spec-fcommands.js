describe("Fcommands.set", function() {

    it("throws if the parameter is not an object",
        function() {
            expect(function() {
                Fcommands.set("")
            }).toThrow("commandData must be an object.");

            expect(function() {
                Fcommands.set({})
            }).not.toThrow();
        });

}); // Fcommands

describe("Fcommands.set", function() {

    it("throws if the parameter is not an object",
        function() {
            expect(function() {
                Fcommands.set("");
            }).toThrow("commandData must be an object.");
        });

    it("throws if the parameter has no 'name' property",
        function() {
            expect(function() {
                Fcommands.set({});
            }).toThrow("commandData.name is required.");
        });

}); // Fcommands.set

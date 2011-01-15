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

    it("throws if the parameter has no 'description' property",
        function() {
            expect(function() {
                Fcommands.set({name: "blah"});
            }).toThrow("commandData.description is required.");
        });

    it("throws if the parameter has no 'execute' property",
        function() {
            expect(function() {
                Fcommands.set({name: "blah", description: "blah" });
            }).toThrow("commandData.execute is required.");
        });

}); // Fcommands.set

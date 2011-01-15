describe("Fcommands.set", function() {

    it("throws if the parameter is not an object",
        function() {
            expect(function() {
                Fcommands.set("");
            }).toThrow("commandData must be an object.");
        });

    it("throws if the parameter has no 'names' property",
        function() {
            expect(function() {
                Fcommands.set({});
            }).toThrow("commandData.names is required.");
        });

    it("throws if the 'names' property is not an array",
        function() {
            expect(function() {
                Fcommands.set({ names: {} });
            }).toThrow("commandData.names must be an array.");
        });

    it("throws if the parameter has no 'execute' property",
        function() {
            expect(function() {
                Fcommands.set({names: ["blah"]});
            }).toThrow("commandData.execute is required.");
        });

    it("throws if the parameter's 'description' property is not a string or function",
        function() {
            expect(function() {
                Fcommands.set({names: ["blah"],
                               execute: function() {},
                               description: {} });
            }).toThrow("commandData.description must be a string or a function.");

            expect(function() {
                Fcommands.set({names: ["blah"],
                               execute: function() {},
                               description: "desc" });
            }).not.toThrow();

            expect(function() {
                Fcommands.set({names: ["blah"],
                               execute: function() {},
                               description: function() {} });
            }).not.toThrow();
        });

}); // Fcommands.set

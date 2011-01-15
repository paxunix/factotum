describe("Fcommands", function() {

    it("has a get() method that throws null if the name has no value",
        function() {
            expect(
                Fcommands.get("")
            ).toEqual(null)
        });

}); // Fcommands

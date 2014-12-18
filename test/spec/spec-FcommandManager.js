describe("FcommandManager", function() {


    it("constructs an FcommandManager object",
        function() {
            var mgr;

            expect(function() {
                mgr = new FcommandManager();
            }).not.toThrow();

            expect(mgr instanceof FcommandManager).toBe(true);
        }
    );


}); // FcommandManager

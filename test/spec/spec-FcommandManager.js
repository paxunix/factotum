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


describe("FcommandManager.loadCommands", function() {

    beforeEach(function() {
        this.addMatchers({ toThrowInstanceOf: toThrowInstanceOf });
    });

    it("calls success callback when all Fcommands have been loaded.", function() {
        var mgr = new FcommandManager();
        var onSuccess = jasmine.createSpy();
        var onError = jasmine.createSpy();

        expect(function() {
            mgr.loadCommands(onSuccess, onError);
        }).not.toThrow();

        waitsFor(function() { return onSuccess.wasCalled },
            "load to succeed", 2000);

        expect(onError).not.toHaveBeenCalled();
    });


}); // FcommandManager.loadCommands

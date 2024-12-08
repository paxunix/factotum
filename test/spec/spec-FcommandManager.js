"use strict";

import FcommandManager from "../../release/scripts/FcommandManager.js";

describe("FcommandManager", function() {

    xit("constructs an FcommandManager object",
        // XXX: need to handle creation of the DB
        function() {
            var mgr;

            expect(function() {
                mgr = new FcommandManager();
            }).not.toThrow();

            expect(mgr instanceof FcommandManager).toBe(true);
        }
    );


}); // FcommandManager

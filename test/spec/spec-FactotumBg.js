"use strict";

describe("FactotumBg", function () {

var FactotumBg = require("../../scripts/FactotumBg.js");

describe("checkInternalOptions", function() {
    it("accepts --bg-debug and --debug option anywhere in command line", function () {
        expect(FactotumBg.checkInternalOptions(["--bg-debug", "a"]).bgdebug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "--bg-debug", "a"]).bgdebug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "a", "--bg-debug"]).bgdebug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["--debug", "test", "a"]).debug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "--debug", "a"]).debug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "a", "--debug"]).debug).toBe(true);
    });

    it("accepts --help option anywhere in command line", function () {
        expect(FactotumBg.checkInternalOptions(["--help", "test", "a"]).help).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "--help", "a"]).help).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "a", "--help"]).help).toBe(true);
    });
}); // checkInternalOptions


}); // FactotumBg

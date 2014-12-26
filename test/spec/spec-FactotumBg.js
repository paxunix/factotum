"use strict";

describe("FactotumBg", function () {

var FactotumBg = require("../../scripts/FactotumBg.js");

describe("checkInternalOptions", function() {
    it("accepts fg and bg debug options anywhere in command line", function () {
        expect(FactotumBg.checkInternalOptions(["--bg-debug", "a"]).bgdebug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "--bg-debug", "a"]).bgdebug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "a", "--bg-debug"]).bgdebug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["--bgdebug", "a"]).bgdebug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "--bgdebug", "a"]).bgdebug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "a", "--bgdebug"]).bgdebug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["--debug", "test", "a"]).debug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "--debug", "a"]).debug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "a", "--debug"]).debug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["--fg-debug", "test", "a"]).debug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "--fg-debug", "a"]).debug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "a", "--fg-debug"]).debug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["--fgdebug", "test", "a"]).debug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "--fgdebug", "a"]).debug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "a", "--fgdebug"]).debug).toBe(true);
    });

    it("accepts --help option anywhere in command line", function () {
        expect(FactotumBg.checkInternalOptions(["--help", "test", "a"]).help).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "--help", "a"]).help).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "a", "--help"]).help).toBe(true);
    });
}); // checkInternalOptions


}); // FactotumBg

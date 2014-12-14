"use strict";

describe("FactotumBg", function () {


describe("checkInternalOptions", function() {
    it("accepts --bg- debug and --fg-debug option anywhere in command line", function () {
        expect(FactotumBg.checkInternalOptions(["--bg-debug", "a"]).bgdebug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "--bg-debug", "a"]).bgdebug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "a", "--bg-debug"]).bgdebug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["--fg-debug", "test", "a"]).fgdebug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "--fg-debug", "a"]).fgdebug).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "a", "--fg-debug"]).fgdebug).toBe(true);
    });

    it("accepts --help option anywhere in command line", function () {
        expect(FactotumBg.checkInternalOptions(["--help", "test", "a"]).help).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "--help", "a"]).help).toBe(true);

        expect(FactotumBg.checkInternalOptions(["test", "a", "--help"]).help).toBe(true);
    });
}); // checkInternalOptions


}); // FactotumBg

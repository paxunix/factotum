"use strict";

// XXX: why is this import needed here since TransferObject isn't used in
// this module?
import TransferObject from "../../release/scripts/TransferObject.js";
import Util from "../../release/scripts/Util.js";

describe("Util", function() {


let lang = "en-us";


describe("fetchDocument", function() {


    it("rejects when retrieving an Fcommand document via invalid URL", function(done) {
        let p = Util.fetchDocument("this is not a URL");
        expect(p instanceof Promise).toBe(true);
        p.then(done).catch(function (err) {
            expect(err instanceof Error).toBe(true);
            done();
        });
    });


    it("retrieves an Fcommand document at non-existent URL", function(done) {
        let p = Util.fetchDocument("http://localhost:8000/404");
        expect(p instanceof Promise).toBe(true);
        p.then(done).catch(function (err) {
            expect(err instanceof Error).toBe(true);
            expect(err.message).toMatch(/Failed to fetch/i);
            done();
        });
    });


}); // fetchDocument


}); // Util

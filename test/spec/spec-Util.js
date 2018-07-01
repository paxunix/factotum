"use strict";

import TransferObject from "./scripts/TransferObject.js";
import Util from "./scripts/Util.js";

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


    it("retrieves an Fcommand document via URL", function(done) {
        let p = Util.fetchDocument("http://localhost:8000/example/load-jquery.html");
        expect(p instanceof Promise).toBe(true);
        p.then(function (body) {
            expect(typeof(body)).toBe("string");
            done();
        }).catch(done);
    });


}); // fetchDocument


}); // Util

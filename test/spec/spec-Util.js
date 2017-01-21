"use strict";

import TransferObject from "../../scripts/TransferObject.js";
import Util from "../../scripts/Util.js";

describe("Util", function() {


let lang = "en-us";


describe("fetchDocument", function() {


    it("rejects when retrieving an Fcommand document via invalid URL", function(done) {
        let p = Util.fetchDocument("this is not a URL");
        expect(p instanceof Promise).toBe(true);
        p.catch(function (err) {
            expect(err instanceof Error).toBe(true);
            done();
        });
    });


    it("retrieves an Fcommand document at non-existent URL", function(done) {
        let p = Util.fetchDocument("https://www.amazon.com/404");
        expect(p instanceof Promise).toBe(true);
        p.catch(function (err) {
            expect(err instanceof Error).toBe(true);
            expect(err.message).toMatch(/Failed to fetch 'https:\/\/www.amazon.com\/404'.*404.*Not Found/i);
            done();
        });
    });


    it("retrieves an Fcommand document via URL", function(done) {
        let p = Util.fetchDocument(chrome.runtime.getURL("example/load-jquery.html"));
        expect(p instanceof Promise).toBe(true);
        p.then(function (body) {
            expect(typeof(body)).toBe("string");
            done();
        });
    });


}); // fetchDocument


}); // Util

"use strict";

import ErrorCache from "../../scripts/ErrorCache.js";


describe("ErrorCache", function () {


describe("constructor", function() {


    it("throws on invalid max size", function() {
        expect(function() { new ErrorCache({maxSize: "NaN"}) })
            .toThrowError(TypeError, "maxSize must be a number");
    });


    it("throws on too-small max size", function() {
        expect(function() { new ErrorCache({maxSize: -1}) })
            .toThrowError(RangeError, "maxSize must be >= 0");
    });


    it("doesn't throw on numeric max size of 0", function() {
        expect(function() { new ErrorCache({maxSize: 0}) })
            .not.toThrow();
    });


    it("doesn't throw on numeric max size > 0", function() {
        expect(function() { new ErrorCache({maxSize: 42}) })
            .not.toThrow();
    });


}); // constructor


describe("push", function() {

    it("does not save given message if max size 0", function() {
        let cache = new ErrorCache({maxSize: 0});
        cache.push("test1");

        expect(cache.length()).toBe(0);
    });


    it("saves messages in order", function() {
        let cache = new ErrorCache({maxSize: 2});
        cache.push("test0");
        cache.push("test1");

        expect(cache.length()).toBe(2);
        expect(cache.at(0)).toBe("test0");
        expect(cache.at(1)).toBe("test1");
    });


    it("drops first message if saving over max-size messages", function() {
        let cache = new ErrorCache({maxSize: 2});
        cache.push("test0");
        cache.push("test1");
        cache.push("test2");

        expect(cache.length()).toBe(2);
        expect(cache.at(0)).toBe("test1");
        expect(cache.at(1)).toBe("test2");
    });

}); // push


describe("length", function() {

    it("handles no messages", function() {
        let cache = new ErrorCache({maxSize: 0});
        expect(cache.length()).toBe(0);
    });


    it("handles messages", function() {
        let cache = new ErrorCache({maxSize: 2});
        cache.push("test0");
        cache.push("test1");

        expect(cache.length()).toBe(2);
    });

}); // length


describe("at", function() {

    it("handles no messages", function() {
        let cache = new ErrorCache({maxSize: 0});
        expect(cache.at(0)).toBeUndefined();
    });


    it("handles messages", function() {
        let cache = new ErrorCache({maxSize: 2});
        cache.push("test0");
        cache.push("test1");

        expect(cache.at(0)).toBe("test0");
    });


    it("handles indexing past number of messages", function() {
        let cache = new ErrorCache({maxSize: 2});
        cache.push("test0");
        cache.push("test1");

        expect(cache.at(2)).toBeUndefined();
    });

}); // at


describe("shift", function() {

    it("handles no messages", function() {
        let cache = new ErrorCache({maxSize: 0});
        expect(cache.shift()).toBeUndefined();
    });


    it("handles messages", function() {
        let cache = new ErrorCache({maxSize: 2});
        cache.push("test0");
        cache.push("test1");
        expect(cache.shift()).toBe("test0");
        expect(cache.shift()).toBe("test1");
        expect(cache.length()).toBe(0);
    });

}); // shift


describe("removeAt", function() {

    it("handles no messages", function() {
        let cache = new ErrorCache({maxSize: 0});
        cache.removeAt(0);
        expect(cache.length()).toBe(0);
    });


    it("handles removal past end", function() {
        let cache = new ErrorCache({maxSize: 0});
        cache.removeAt(10);
        expect(cache.length()).toBe(0);
    });


    it("handles messages", function() {
        let cache = new ErrorCache({maxSize: 2});
        cache.push("test0");
        cache.push("test1");
        cache.removeAt(0);
        expect(cache.length()).toBe(1);
        expect(cache.at(0)).toBe("test1");
    });


    it("handles removal at end", function() {
        let cache = new ErrorCache({maxSize: 2});
        cache.push("test0");
        cache.removeAt(0);
        expect(cache.length()).toBe(0);
    });


    it("handles multiple removals", function() {
        let cache = new ErrorCache({maxSize: 3});
        cache.push("test0");
        cache.push("test1");
        cache.push("test2");
        cache.removeAt(0, 1, 2);
        expect(cache.length()).toBe(0);
    });


    it("handles multiple disjoint removals", function() {
        let cache = new ErrorCache({maxSize: 4});
        cache.push("test0");
        cache.push("test1");
        cache.push("test2");
        cache.push("test3");
        cache.removeAt(1, 3);
        expect(cache.length()).toBe(2);
        expect(cache.at(0)).toBe("test0");
        expect(cache.at(1)).toBe("test2");
    });


}); // removeAt


describe("[Symbol.iterator]", function() {

    it("does nothing if cache is empty", function() {
        let cache = new ErrorCache({maxSize: 4});
        expect(Array.from(cache)).toEqual([]);
    });


    it("iterates over all elements in cache", function() {
        let cache = new ErrorCache({maxSize: 3});
        cache.push("test0");
        cache.push("test1");
        cache.push("test2");
        expect(Array.from(cache)).toEqual(["test0", "test1", "test2"]);
        // verify iteration restarts
        expect(Array.from(cache)).toEqual(["test0", "test1", "test2"]);
    });

}); // [Symbol.iterator]


}); // ErrorCache
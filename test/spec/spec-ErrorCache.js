"use strict";

import ErrorCache from "../../release/scripts/ErrorCache.js";
import WrappErr from "../../release/scripts/wrapperr-esm.js";


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

    it("throws if object is not an Error", function() {
        let cache = new ErrorCache({maxSize: 2});
        expect(() => cache.push("test0"))
            .toThrowError(Error, "Parameter must be an Error object")

        expect(cache.length()).toBe(0);
    });


    it("does not save given message if max size 0", function() {
        let cache = new ErrorCache({maxSize: 0});
        cache.push(new Error("test1"));

        expect(cache.length()).toBe(0);
    });


    it("saves messages in order", function() {
        let cache = new ErrorCache({maxSize: 2});
        cache.push(new Error("test0"));
        cache.push(new Error("test1"));

        expect(cache.length()).toBe(2);
        expect(cache.at(0).message).toBe("test0");
        expect(cache.at(1).message).toBe("test1");
    });


    it("saves objects that inherit from Error", function() {
        let cache = new ErrorCache({maxSize: 1});
        cache.push(new TypeError("test0"));

        expect(cache.length()).toBe(1);
        expect(cache.at(0).message).toBe("test0");
    });


    it("saves WrappErr objects", function() {
        let cache = new ErrorCache({maxSize: 1});
        cache.push(new WrappErr(new Error("test0"), "other stuff"));

        expect(cache.length()).toBe(1);
        expect(cache.at(0).message).toMatch(/test0/);
    });


    it("drops first message if saving over max-size messages", function() {
        let cache = new ErrorCache({maxSize: 2});
        cache.push(new Error("test0"));
        cache.push(new Error("test1"));
        cache.push(new Error("test2"));

        expect(cache.length()).toBe(2);
        expect(cache.at(0).message).toBe("test1");
        expect(cache.at(1).message).toBe("test2");
    });


}); // push


describe("length", function() {

    it("handles no messages", function() {
        let cache = new ErrorCache({maxSize: 0});
        expect(cache.length()).toBe(0);
    });


    it("handles messages", function() {
        let cache = new ErrorCache({maxSize: 2});
        cache.push(new Error("test0"));
        cache.push(new Error("test1"));

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
        cache.push(new Error("test0"));
        cache.push(new Error("test1"));

        expect(cache.at(0).message).toBe("test0");
    });


    it("handles indexing past number of messages", function() {
        let cache = new ErrorCache({maxSize: 2});
        cache.push(new Error("test0"));
        cache.push(new Error("test1"));

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
        cache.push(new Error("test0"));
        cache.push(new Error("test1"));
        expect(cache.shift().message).toBe("test0");
        expect(cache.shift().message).toBe("test1");
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
        cache.push(new Error("test0"));
        cache.push(new Error("test1"));
        cache.removeAt(0);
        expect(cache.length()).toBe(1);
        expect(cache.at(0).message).toBe("test1");
    });


    it("handles removal at end", function() {
        let cache = new ErrorCache({maxSize: 2});
        cache.push(new Error("test0"));
        cache.removeAt(0);
        expect(cache.length()).toBe(0);
    });


    it("handles multiple removals", function() {
        let cache = new ErrorCache({maxSize: 3});
        cache.push(new Error("test0"));
        cache.push(new Error("test1"));
        cache.push(new Error("test2"));
        cache.removeAt(0, 1, 2);
        expect(cache.length()).toBe(0);
    });


    it("handles multiple disjoint removals", function() {
        let cache = new ErrorCache({maxSize: 4});
        cache.push(new Error("test0"));
        cache.push(new Error("test1"));
        cache.push(new Error("test2"));
        cache.push(new Error("test3"));
        cache.removeAt(1, 3);
        expect(cache.length()).toBe(2);
        expect(cache.at(0).message).toBe("test0");
        expect(cache.at(1).message).toBe("test2");
    });


}); // removeAt



describe("clear", function() {

    it("works with no messages", function() {
        let cache = new ErrorCache({maxSize: 0});
        cache.clear();
        expect(cache.length()).toBe(0);
    });


    it("works with messages", function() {
        let cache = new ErrorCache({maxSize: 2});
        cache.push(new Error("test0"));
        cache.push(new Error("test1"));
        cache.clear();
        expect(cache.length()).toBe(0);
    });

}); // clear


describe("[Symbol.iterator]", function() {

    it("does nothing if cache is empty", function() {
        let cache = new ErrorCache({maxSize: 4});
        expect(Array.from(cache)).toEqual([]);
    });


    it("iterates over all elements in cache", function() {
        let cache = new ErrorCache({maxSize: 3});
        cache.push(new Error("test0"));
        cache.push(new Error("test1"));
        cache.push(new Error("test2"));
        expect(Array.from(cache).map(el => el.message)).toEqual(["test0", "test1", "test2"]);
    });


    it("gives a new iterator after prior iterator's completion", function() {
        let cache = new ErrorCache({maxSize: 2});
        cache.push(new Error("test0"));
        cache.push(new Error("test1"));
        let els1 = Array.from(cache).map(el => el.message);
        let els2 = Array.from(cache).map(el => el.message);
        expect(els1).toEqual(els2);
    });


    it("instance cannot restart iteration", function() {
        let cache = new ErrorCache({maxSize: 2});
        cache.push(new Error("test0"));
        let iter = cache[Symbol.iterator]();
        let el1 = iter.next();
        let el2 = iter.next();
        let el3 = iter.next();
        expect(el1).toEqual({value: jasmine.any(Object), done: false });
        expect(el2).toEqual({value: undefined, done: true });
        expect(el3).toEqual({value: undefined, done: true });
    });

}); // [Symbol.iterator]


}); // ErrorCache

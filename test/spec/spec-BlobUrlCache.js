describe("BlobUrlCache", function() {


describe("constructor", function() {

    it("constructs an instance via new", function() {
        var cache = new BlobUrlCache();
        expect(cache instanceof BlobUrlCache).toBe(true);
    });


    it("constructs an instance via function call", function() {
        var cache = BlobUrlCache();
        expect(cache instanceof BlobUrlCache).toBe(true);
    });

}); // constructor


describe("set", function() {

    it("stores content and returns a URL for it", function() {
        var cache = new BlobUrlCache();
        var url = cache.set("id1", "testing", "text/plain");
        expect(url).toMatch(/^blob:/);
    });

    it("overwrites the content if using the same id", function() {
        var cache = new BlobUrlCache();
        var url = cache.set("id1", "testing", "text/plain");
        var url2 = cache.set("id1", "testing2", "text/plain");
        expect(url).not.toEqual(url2);
    });

}); // set


describe("get", function() {

    it("returns undefined if no cached content for ID", function() {
        var cache = new BlobUrlCache();
        expect(cache.get("id1")).toBe(undefined);
    });


    it("retrieves cached content URL by id", function() {
        var cache = new BlobUrlCache();
        var url = cache.set("id1", "testing", "text/plain");
        expect(cache.get("id1")).toEqual(cache.get("id1"));
    });

}); // get


}); // BlobUrlCache

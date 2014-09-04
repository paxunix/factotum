describe("Util.extractOptSpec", function() {


    it("throws if input document is invalid", function() {
        expect(function () {
            Util.extractOptSpec(null);
        }).toThrowError(TypeError,
            "Cannot read property 'querySelector' of null");
    });


    it("throws if document has no #minimist-opt", function() {
        expect(function () {
            var doc = (new DOMParser).parseFromString("<div></div>", "text/html");
            Util.extractOptSpec(doc);
        }).toThrowError(Error,
            "template#minimist-opt is missing");
    });


    it("throws if document's #minimist-opt is not a <template>", function() {
        expect(function () {
            var doc = (new DOMParser).parseFromString('<div id="minimist-opt"></div>', "text/html");
            Util.extractOptSpec(doc);
        }).toThrowError(Error,
            "template#minimist-opt is missing");
    });


    it("throws template#minimist-opt's text is not parseable JSON", function() {
        expect(function () {
            var doc = (new DOMParser).
                parseFromString('<template id="minimist-opt">X</template>', "text/html");
            Util.extractOptSpec(doc);
        }).toThrowError(SyntaxError,
            "Unexpected token X");
    });


    it("returns JSON opt-spec", function() {
        var doc = (new DOMParser).
            parseFromString('<template id="minimist-opt">{"string": [ "version" ]}</template>', "text/html");
        ;
        expect(Util.extractOptSpec(doc)).toEqual({ string: [ "version" ] });
    });


}); // Util.extractOptSpec



describe("Util.extractMetadata", function() {


    it("throws if input document is invalid", function() {
        expect(function () {
            Util.extractMetadata(null);
        }).toThrowError(TypeError,
            "Cannot read property 'querySelector' of null");
    });


    it("extracts supported data from head's meta tags", function() {
        var doc = (new DOMParser).
            parseFromString('<head>' +
                '<meta name="author" content="test author">' +
                '<meta name="description" content="test desc">' +
                '<meta name="guid" content="test guid">' +
                '<meta name="keywords" content="test keywords">' +
                '<meta name="downloadURL" content="test download url">' +
                '<meta name="updateURL" content="test update url">' +
                '<meta name="version" content="test version">' +
                '<meta name="context" content="test context">' +
                '<link rel="icon" href="test icon url">' +
                '</head>', "text/html");

        expect(Util.extractMetadata(doc)).toEqual({
            author: "test author",
            description: "test desc",
            guid: "test guid",
            keywords: "test keywords",
            downloadURL: "test download url",
            updateURL: "test update url",
            version: "test version",
            context: "test context",
            icon: "test icon url"
        });
    });


}); // Util.extractMetadata

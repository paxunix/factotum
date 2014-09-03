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



}); // Util.extractOptSpec

var extensionId = chrome.extension.getURL().match(/:\/\/([^\/]+)/)[1];

describe("Factotum", function() {

    it("returns an error response if an unknown request is received", function() {
        var response = { };

        chrome.extension.sendRequest( { hello: "world" }, function(r) {
            response = r;
        });

        waitsFor(function() {
            return typeof(response.success) !== "undefined"
        }, "Unrecognized request error.", 2000);

        runs(function() {
            expect(response).toEqual({
                success: false,
                error: "Unrecognized request."
            })
        });
    });

    it("returns an error response if request.register.factotumCommands is not an array", function() {
        var response = { };

        chrome.extension.sendRequest( { register: "bogus" }, function(r) {
            response = r;
        });

        waitsFor(function() {
            return typeof(response.success) !== "undefined"
        }, "Unrecognized request error.", 2000);

        runs(function() {
            expect(response).toEqual({
                success: false,
                error: "request.register.factotumCommands must be an array."
            })
        });
    });

    it("returns an error response if request.register.optionSpec is not an object", function() {
        var response = { };

        chrome.extension.sendRequest({
            register: {
                factotumCommands: [],
                optionSpec: [] },
            },
            function(r) {
                response = r;
            }
        );

        waitsFor(function() {
            return typeof(response.success) !== "undefined"
        }, "Unrecognized request error.", 2000);

        runs(function() {
            expect(response).toEqual({
                success: false,
                error: "request.register.optionSpec must be an Object."
            })
        });
    });

    it("saves each registered command name and optspec", function() {
        var response = { };

        chrome.extension.sendRequest({
            register: {
                factotumCommands: [ "test", "testing" ]
                }
            },
            function(r) {
                response = r;
            }
        );

        waitsFor(function() {
            return typeof(response.success) !== "undefined"
        }, "Unrecognized request error.", 2000);

        runs(function() {
            expect(response).toEqual({
                success: true
            });
            expect(chrome.extension.getBackgroundPage().
                Factotum.commands.test).
                    toEqual({ optspec: {}, extensionId: extensionId });
            expect(chrome.extension.getBackgroundPage().
                Factotum.commands.testing).
                    toEqual({ optspec: {}, extensionId: extensionId });
        });
    });
    // XXX:request.register.optionSpec can be missing and an empty optspec will
    // be used

});    // Factotum

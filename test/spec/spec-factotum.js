var extensionId = chrome.extension.getURL().match(/:\/\/([^\/]+)/)[1];

describe("Factotum", function() {

    beforeEach(function() {
        // clear any existing F-commands before each test
        chrome.extension.getBackgroundPage().Factotum.clear();
    });


    it("returns an error response if an unknown request is received", function() {
        var response = { };

        chrome.extension.sendRequest( { hello: "world" }, function(r) {
            response = r;
        });

        waitsFor(function() {
            return typeof(response.success) !== "undefined"
        }, "request to finish.", 2000);

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
        }, "request to finish.", 2000);

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
                shortDesc: ""
            },
            function(r) {
                response = r;
            }
        );

        waitsFor(function() {
            return typeof(response.success) !== "undefined"
        }, "request to finish.", 2000);

        runs(function() {
            expect(response).toEqual({
                success: false,
                error: "request.register.optionSpec must be an Object."
            })
        });
    });


    it("saves each registered command", function() {
        var response = { };
        var optspec = { "a": { type: "boolean" } };

        chrome.extension.sendRequest({
            register: {
                factotumCommands: [ "test", "testing" ],
                optionSpec: optspec,
                shortDesc: "test short desc"
                }
            },
            function(r) {
                response = r;
            }
        );

        waitsFor(function() {
            return typeof(response.success) !== "undefined"
        }, "request to finish.", 2000);

        runs(function() {
            expect(response).toEqual({
                success: true
            });
            expect(chrome.extension.getBackgroundPage().
                Factotum.commands.test).
                    toEqual([{
                        optspec: optspec,
                        extensionId: extensionId,
                        shortDesc: "test short desc"}]);
            expect(chrome.extension.getBackgroundPage().
                Factotum.commands.testing).
                    toEqual([{
                        optspec: optspec,
                        extensionId: extensionId,
                        shortDesc: "test short desc"}]);
        });
    });


    it("uses an empty optspec if request.register.optionSpec is missing", function() {
        var response = { };

        chrome.extension.sendRequest({
            register: {
                factotumCommands: [ "test2" ],
                shortDesc: ""
                }
            },
            function(r) {
                response = r;
            }
        );

        waitsFor(function() {
            return typeof(response.success) !== "undefined"
        }, "request to finish.", 2000);

        runs(function() {
            expect(response).toEqual({
                success: true
            });
            expect(chrome.extension.getBackgroundPage().
                Factotum.commands.test2).
                    toEqual([{
                        optspec: {},
                        extensionId: extensionId,
                        shortDesc: "" }]);
        });
    });


    it("responds with error if an extension tries to register the same command more than once", function() {
        var response = { };
        var cmdName = "test";

        chrome.extension.sendRequest({
            register: {
                factotumCommands: [ cmdName ],
                shortDesc: ""
                }
            },
            function(r) {
                response = r;
            }
        );

        waitsFor(function() {
            return typeof(response.success) !== "undefined"
        }, "request to finish.", 2000);

        chrome.extension.sendRequest({
            register: {
                factotumCommands: [ cmdName ],
                shortDesc: "anything"
                }
            },
            function(r) {
                response = r;
            }
        );

        waitsFor(function() {
            return typeof(response.success) !== "undefined"
        }, "request to finish.", 2000);

        runs(function() {
            expect(response).toEqual({
                success: false,
                error: "Extension " + extensionId + " has already registered command '" + cmdName + "'."
            })
        });
    });


    it("requires request.register.shortDesc is required and must be a string", function() {
        var response = { };

        chrome.extension.sendRequest({
            register: {
                factotumCommands: [ "test2" ]
                }
            },
            function(r) {
                response = r;
            }
        );

        waitsFor(function() {
            return typeof(response.success) !== "undefined"
        }, "request to finish.", 2000);

        runs(function() {
            expect(response).toEqual({
                success: false,
                error: "request.register.shortDesc must be a string."
            });
            expect(chrome.extension.getBackgroundPage().
                Factotum.commands).toEqual([]);
        });
    });


    it("stores F-command names in lowercase", function() {
        var response = { };

        chrome.extension.sendRequest({
            register: {
                factotumCommands: [ "TEST2" ],
                shortDesc: "Testing 1 2 3"
                }
            },
            function(r) {
                response = r;
            }
        );

        waitsFor(function() {
            return typeof(response.success) !== "undefined"
        }, "request to finish.", 2000);

        runs(function() {
            expect(response).toEqual({
                success: true,
            });
            expect(chrome.extension.getBackgroundPage().
                Factotum.commands.test2).
                    toEqual([{
                        optspec: {},
                        extensionId: extensionId,
                        shortDesc: "Testing 1 2 3" }]);
        });
    });


    it("accepts an empty omnibox input string", function() {
        expect(function() {
            chrome.extension.getBackgroundPage().
                Factotum.omniboxOnInputEntered("");
        }).not.toThrow();
        // XXX: more effective if it tested that no F-command was  run
    });


    it("accepts an undefined omnibox input string", function() {
        expect(function() {
            chrome.extension.getBackgroundPage().
                Factotum.omniboxOnInputEntered();
        }).not.toThrow();
        // XXX: more effective if it tested that no F-command was  run
    });


    it("accepts an all whitespace omnibox input string", function() {
        expect(function() {
            chrome.extension.getBackgroundPage().
                Factotum.omniboxOnInputEntered("  \t \t \n \r    ");
        }).not.toThrow();
        // XXX: more effective if it tested that no F-command was  run
    });


    // unknown F-command omnibox input is harmless
    it("does nothing with unknown F-commands", function() {
        expect(function() {
            chrome.extension.getBackgroundPage().
                Factotum.omniboxOnInputEntered("testcommand");
        }).not.toThrow();
        // XXX: more effective if it tested that no F-command was  run
    });


});    // Factotum

describe("FileSystem.write", function() {


    it("calls the error function if a problem occurs during a filesystem operation", function() {
        var msg = "";
        var onError = function(e) {
            msg = e;
        };
        var onSuccess = jasmine.createSpy();
        
        var fs = new FileSystem(1024, onError);
        fs.writeFile(undefined, "bogusdata", onSuccess);

        waitsFor(function() { return msg !== ""; }, "writeFile", 2000);

        runs(function() {
            expect(msg).toNotEqual("");
            expect(onSuccess).not.toHaveBeenCalled();
        });
    });


    it("calls the success function after successfully writing data to a file", function() {
        var onError = jasmine.createSpy();
        var success = false;
        var obj = {
            onSuccess: function() {
                success = true;
            }
        };

        spyOn(obj, "onSuccess").andCallThrough();
        
        var fs = new FileSystem(1024, onError);
        fs.writeFile("testfile", "testdata", obj.onSuccess);

        waitsFor(function() { return success; }, "writeFile", 2000);

        runs(function() {
            expect(success).toBe(true);
            expect(obj.onSuccess).toHaveBeenCalled();
        });
    });

    xit("writing to file of same name overwrites contents");

    xit("reads a string of data from a filename", function() {
        var filename = "test";
        var done = false;

        var fs = new FileSystem(filename, data, function() {
            done = true;
        });

        waitsFor(function() { return done; }, "file write failed", 5000);

        // XXX: WTF to expect???
        expect(suggestion.content).toEqual(name + " " + argv.join(" "));
    });


}); // FileSystem.write

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

    xit("overwrites the file if it already exists");

    it("truncates the file before writing any new content", function () {
        var filename = "testfile";
        var data1In = "longer string";
        var data2In = "short str";
        var dataOut = "";
        var done = false;

        var fs = new FileSystem(filename, function() {
            throw "FS failure.";
        });

        fs.writeFile(filename, data1In, function () {
            fs.writeFile(filename, data2In, function () {
                fs.readFile(filename, function (data) {
                    dataOut = data;
                    done = true;
                });
            });
        });

        waitsFor(function() { return done; }, "file truncation", 5000);

        runs(function() {
            expect(dataOut).toEqual(data2In);
        });
    });


}); // FileSystem.write


describe("FileSystem.read", function() {


    it("reads a string of data from a filename", function() {
        var filename = "testfile";
        var dataIn = "1234";
        var dataOut = "";
        var done = false;

        var fs = new FileSystem(filename, function() {
            throw "FS failure.";
        });

        fs.writeFile(filename, dataIn, function () {
            fs.readFile(filename, function (data) {
                dataOut = data;
                done = true;
            });
        });

        waitsFor(function() { return done; }, "file write+read", 5000);

        runs(function() {
            expect(dataOut).toEqual(dataIn);
        });
    });


    xit("calls the error function if trying to read a non-existent file");


}); // FileSystem.read

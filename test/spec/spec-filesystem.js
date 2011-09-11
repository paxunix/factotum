describe("FileSystem.writeFile", function() {


    it("calls the error function if writing to an undefined filename", function() {
        var errno = "";
        var onError = function(e) {
            errno = e;
        };
        var onSuccess = jasmine.createSpy();

        var fs = new FileSystem(1024, onError);
        fs.writeFile(undefined, "bogusdata", onSuccess);

        waitsFor(function() { return errno !== ""; }, "writeFile", 2000);

        runs(function() {
            expect(errno).toEqual(2);
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


}); // FileSystem.writeFile


describe("FileSystem.readFile", function() {


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


    it("calls the error function if trying to read a non-existent file", function() {
        var errno = "";
        var onError = function(e) {
            errno = e;
        };
        var onSuccess = jasmine.createSpy();

        var fs = new FileSystem(1024, onError);
        fs.readFile("filename that doesn't exist", onSuccess);

        waitsFor(function() { return errno !== ""; }, "read file", 2000);

        runs(function() {
            expect(errno).toEqual(1);
            expect(onSuccess).not.toHaveBeenCalled();
        });
    });


}); // FileSystem.readFile


describe("FileSystem.getFileList", function() {


    it("calls the success function with a list of found filenames", function () {
        var filename = "testfile";
        var onError = jasmine.createSpy();
        var success = false;

        var fs = new FileSystem(1024, onError);
        var obj = { };
        var fileList = [ ];
        obj.onList = function(entries) {
            fileList = entries;
            fs.removeFile(filename, function() { success = true; });
        };
        obj.onWriteSuccess = function() {
            fs.getFileList(obj.onList);
        };

        spyOn(obj, "onList").andCallThrough();
        spyOn(obj, "onWriteSuccess").andCallThrough();

        fs.writeFile(filename, "testdata", obj.onWriteSuccess);

        waitsFor(function() { return success; }, "writeFile", 2000);

        runs(function() {
            expect(success).toBe(true);
            expect(obj.onWriteSuccess).toHaveBeenCalled();
            expect(obj.onList).toHaveBeenCalled();
            expect(fileList).toContain(filename);
        });
    });


}); // FileSystem.getFileList


describe("FileSystem.removeFile", function() {


    it("calls the success function if removing a non-existent file", function() {
        var success = false;
        var onSuccess = function(e) {
            success = true;
        };
        var onError = jasmine.createSpy();

        var fs = new FileSystem(1024, onError);
        fs.removeFile("filename that doesn't exist", onSuccess);

        waitsFor(function() { return success; },
            "remove file that doesn't exist", 2000);

        runs(function() {
            expect(success).toBe(true);
            expect(onError).not.toHaveBeenCalled();
        });
    });


    it("calls the success function if the file is removed", function () {
        var filename = "testfile";
        var onError = jasmine.createSpy();
        var success = false;
        var fs = new FileSystem(1024, onError);
        var obj = { };
        obj.onRemoveSuccess = function() {
            success = true;
        };
        obj.onWriteSuccess = function() {
            fs.removeFile(filename, obj.onRemoveSuccess);
        };

        spyOn(obj, "onRemoveSuccess").andCallThrough();
        spyOn(obj, "onWriteSuccess").andCallThrough();

        fs.writeFile(filename, "testdata", obj.onWriteSuccess);

        waitsFor(function() { return success; }, "writeFile", 2000);

        runs(function() {
            expect(success).toBe(true);
            expect(obj.onRemoveSuccess).toHaveBeenCalled();
            expect(obj.onWriteSuccess).toHaveBeenCalled();
        });
    });


}); // FileSystem.removeFile

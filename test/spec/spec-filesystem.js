describe("FileSystem.writeFile", function() {


    it("calls the error function if writing to an undefined filename", function() {
        var onSuccess = jasmine.createSpy();
        var onError = jasmine.createSpy();

        var fs = new FileSystem(1024);
        fs.writeFile(undefined, "bogusdata", onSuccess, onError);

        waitsFor(function() { return onError.wasCalled; }, "writeFile", 2000);

        runs(function() {
            expect(onError.mostRecentCall.args[0].code).toEqual(FileError.SECURITY_ERR);
            expect(onSuccess).not.toHaveBeenCalled();
        });
    });


    it("calls the success function after successfully writing data to a file", function() {
        var onError = jasmine.createSpy();
        var onSuccess = jasmine.createSpy();

        var fs = new FileSystem(1024);
        fs.writeFile("testfile", "testdata", onSuccess, onError);

        waitsFor(function() { return onSuccess.wasCalled; }, "writeFile", 2000);

        runs(function() {
            expect(onSuccess).toHaveBeenCalled();
            expect(onError).not.toHaveBeenCalled();
        });
    });


    it("truncates the file before writing any new content", function () {
        var filename = "testfile";
        var data1In = "longer string";
        var data2In = "short str";
        var dataOut = "";
        var onError = jasmine.createSpy();
        var done = false;

        var fs = new FileSystem(1024);

        fs.writeFile(filename, data1In, function () {
            fs.writeFile(filename, data2In, function () {
                fs.readFile(filename, function (data) {
                    dataOut = data;
                    done = true;
                }, onError);
            }, onError);
        }, onError);

        waitsFor(function() { return done; }, "file truncation", 5000);

        runs(function() {
            expect(dataOut).toEqual(data2In);
            expect(onError).not.toHaveBeenCalled();
        });
    });


}); // FileSystem.writeFile


describe("FileSystem.readFile", function() {


    it("reads a string of data from a filename", function() {
        var filename = "testfile";
        var dataIn = "1234";
        var dataOut = "";
        var done = false;
        var onError = jasmine.createSpy();

        var fs = new FileSystem(1024);

        fs.writeFile(filename, dataIn, function () {
            fs.readFile(filename, function (data) {
                dataOut = data;
                done = true;
            }, onError);
        }, onError);

        waitsFor(function() { return done; }, "file write+read", 5000);

        runs(function() {
            expect(dataOut).toEqual(dataIn);
            expect(onError).not.toHaveBeenCalled();
        });
    });


    it("calls the error function if trying to read a non-existent file", function() {
        var onError = jasmine.createSpy();
        var onSuccess = jasmine.createSpy();

        var fs = new FileSystem(1024);
        fs.readFile("filename that doesn't exist", onSuccess, onError);

        waitsFor(function() { return onError.wasCalled; }, "read file", 2000);

        runs(function() {
            expect(onError.mostRecentCall.args[0].code).toEqual(FileError.NOT_FOUND_ERR);
            expect(onSuccess).not.toHaveBeenCalled();
        });
    });


}); // FileSystem.readFile


describe("FileSystem.getFileList", function() {


    it("calls the success function with a list of found filenames", function () {
        var filename = "testfile";
        var onError = jasmine.createSpy();
        var success = false;

        var fs = new FileSystem(1024);
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

        fs.writeFile(filename, "testdata", obj.onWriteSuccess, onError);

        waitsFor(function() { return success; }, "writeFile", 2000);

        runs(function() {
            expect(success).toBe(true);
            expect(onError).not.toHaveBeenCalled();
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

        var fs = new FileSystem(1024);
        fs.removeFile("filename that doesn't exist", onSuccess, onError);

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
        var fs = new FileSystem(1024);
        var obj = { };
        obj.onRemoveSuccess = function() {
            success = true;
        };
        obj.onWriteSuccess = function() {
            fs.removeFile(filename, obj.onRemoveSuccess);
        };

        spyOn(obj, "onRemoveSuccess").andCallThrough();
        spyOn(obj, "onWriteSuccess").andCallThrough();

        fs.writeFile(filename, "testdata", obj.onWriteSuccess, onError);

        waitsFor(function() { return success; }, "writeFile", 2000);

        runs(function() {
            expect(success).toBe(true);
            expect(onError).not.toHaveBeenCalled();
            expect(obj.onRemoveSuccess).toHaveBeenCalled();
            expect(obj.onWriteSuccess).toHaveBeenCalled();
        });
    });


}); // FileSystem.removeFile

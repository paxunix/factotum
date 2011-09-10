// Simple, just-as-much-as-needed abstraction of the FileSystem API in Webkit.

function FileSystem(size, onErrorFn)
{
    this.fsSizeBytes = size;
    this.onErrorFn = function(err) {
        onErrorFn(FileSystem.fileErrorCode2Msg[err.code]);
    };
};  // FileSystem


// As from http://dev.w3.org/2009/dap/file-system/pub/FileSystem/#error-code-descriptions
FileSystem.fileErrorCode2Msg = { };
FileSystem.fileErrorCode2Msg[FileError.ABORT_ERR] = "Internal error";
FileSystem.fileErrorCode2Msg[FileError.ENCODING_ERR] = "Malformed URL";
FileSystem.fileErrorCode2Msg[FileError.INVALID_MODIFICATION_ERR] =
    "Invalid filesytem operation";
FileSystem.fileErrorCode2Msg[FileError.INVALID_STATE_ERR] =
    "Filesystem changed externally";
FileSystem.fileErrorCode2Msg[FileError.NOT_FOUND_ERR] = "File not found";
FileSystem.fileErrorCode2Msg[FileError.NOT_READABLE_ERR] = "File cannot be read";
FileSystem.fileErrorCode2Msg[FileError.NO_MODIFICATION_ALLOWED_ERR] =
    "Filesystem cannot be modified";
FileSystem.fileErrorCode2Msg[FileError.PATH_EXISTS_ERR] = "File already exists";
FileSystem.fileErrorCode2Msg[FileError.QUOTA_EXCEEDED_ERR] = "Storage quota exceeded";
FileSystem.fileErrorCode2Msg[FileError.SECURITY_ERR] = "File security error";
FileSystem.fileErrorCode2Msg[FileError.SYNTAX_ERR] = "Internal error";
FileSystem.fileErrorCode2Msg[FileError.TYPE_MISMATCH_ERR] =
    "Mismatched filesystem entity";


FileSystem.prototype.writeFile = function (filename, data, onSuccessFn)
{
    var onGetFileSuccess = function (file)
    {
        file.createWriter(function (writer) {
            var truncated = false;

            writer.onerror = this.onErrorFn;
            writer.onwriteend = function() {
                // If file has not been truncated, then this event was for the
                // truncate operation.  If the file has been truncated, the
                // event was for the write.
                if (!truncated)
                {
                    truncated = true;

                    var bb = new WebKitBlobBuilder();
                    bb.append(data);

                    // This queues a second and final writeend event.
                    writer.write(bb.getBlob('text/plain'));
                }
                else if (onSuccessFn)
                    onSuccessFn();
            };

            // This queues the first writeend event.
            writer.truncate(0);
        }, this.onErrorFn);
    }.bind(this);

    var onFsInitSuccess = function (fileSystem)
    {
        fileSystem.root.getFile(filename, { create: true },
            onGetFileSuccess, this.onErrorFn);
    }.bind(this);

    webkitRequestFileSystem(window.PERSISTENT, Fcommands.fileSystemSize,
        onFsInitSuccess, this.onErrorFn);
};  // FileSystem.prototype.writeFile


FileSystem.prototype.readFile = function (filename, onSuccessFn)
{
};


FileSystem.prototype.listFiles = function (fn)
{
};


FileSystem.prototype.removeFile = function (fn)
{
};


FileSystem.prototype.removeAllFiles = function (fn)
{
};


FileSystem.prototype.fileExists = function (fn)
{
};

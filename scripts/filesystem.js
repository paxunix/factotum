// Simple, just-as-much-as-needed abstraction of the FileSystem API as is needed
// for Factotum.

function FileSystem(size)
{
    this.fsSizeBytes = size;
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
FileSystem.fileErrorCode2Msg[FileError.NOT_READABLE_ERR] =
    "File cannot be read";
FileSystem.fileErrorCode2Msg[FileError.NO_MODIFICATION_ALLOWED_ERR] =
    "Filesystem cannot be modified";
FileSystem.fileErrorCode2Msg[FileError.PATH_EXISTS_ERR] = "File already exists";
FileSystem.fileErrorCode2Msg[FileError.QUOTA_EXCEEDED_ERR] =
    "Storage quota exceeded";
FileSystem.fileErrorCode2Msg[FileError.SECURITY_ERR] = "File security error";
FileSystem.fileErrorCode2Msg[FileError.SYNTAX_ERR] = "Internal error";
FileSystem.fileErrorCode2Msg[FileError.TYPE_MISMATCH_ERR] =
    "Mismatched filesystem entity";


FileSystem.prototype.getErrorString = function (errno)
{
    return FileSystem.fileErrorCode2Msg[errno];
}   // FileSystem.prototype.getErrorString


FileSystem.prototype.writeFile = function (filename, data, onSuccessFn, onErrorFn)
{
    var onGetFileSuccess = function (file)
    {
        file.createWriter(function (writer) {
            var truncated = false;

            writer.onerror = onErrorFn;
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
        }, onErrorFn);
    };

    var onFsInitSuccess = function (fileSystem)
    {
        fileSystem.root.getFile(filename, { create: true },
            onGetFileSuccess, onErrorFn);
    };

    window.webkitRequestFileSystem(window.PERSISTENT, this.fsSizeBytes,
        onFsInitSuccess, onErrorFn);
};  // FileSystem.prototype.writeFile


FileSystem.prototype.readFile = function (filename, onSuccessFn, onErrorFn)
{
    var onFileAccess = function (file)
    {
        var reader = new FileReader();

        reader.onerror = onErrorFn;
        reader.onloadend = function (e) {
            // According to the spec
            // (http://www.w3.org/TR/FileAPI/#readAsDataText), onloadend is
            // dispatched on success or failure.  If failure, result will be
            // null (and onerror will have been called).
            if (this.result != null)
                onSuccessFn(this.result);
        };

        reader.readAsText(file);
    };

    var onGetFileSuccess = function (fileEntry)
    {
        fileEntry.file(onFileAccess, onErrorFn);
    };

    var onFsInitSuccess = function (fileSystem)
    {
        fileSystem.root.getFile(filename, null,
            onGetFileSuccess, onErrorFn);
    };

    window.webkitRequestFileSystem(window.PERSISTENT, this.fsSizeBytes,
        onFsInitSuccess, onErrorFn);
};  // FileSystem.prototype.readFile


FileSystem.prototype.getFileList = function (onSuccessFn, onErrorFn)
{
    var onRead = function(dirReader, returnList) {
        dirReader.readEntries(function (entries) {
            if (entries.length == 0)
            {
                onSuccessFn(returnList);
                return;
            }

            for (var i = 0; i < entries.length; ++i)
                returnList.push(entries[i].name);

            onRead(dirReader, returnList);
        }, onErrorFn);
    };

    var onFsInitSuccess = function (fileSystem)
    {
        var dirReader = fileSystem.root.createReader();
        onRead(dirReader, []);
    };

    window.webkitRequestFileSystem(window.PERSISTENT, this.fsSizeBytes,
        onFsInitSuccess, onErrorFn);
};  // FileSystem.prototype.getFileList


FileSystem.prototype.removeFile = function (filename, onSuccessFn, onErrorFn)
{
    var onGetFileSuccess = function (fileEntry)
    {
        fileEntry.remove(onSuccessFn, onErrorFn);
    };

    var onFsInitSuccess = function (fileSystem)
    {
        // If the file does not exist, consider it a successful deletion.
        var catchError = function(e) {
            if (e.code === FileError.NOT_FOUND_ERR)
                onSuccessFn();
            else
                onErrorFn(e);
        };

        fileSystem.root.getFile(filename, null, onGetFileSuccess, catchError);
    };

    window.webkitRequestFileSystem(window.PERSISTENT, this.fsSizeBytes,
        onFsInitSuccess, onErrorFn);
};  // FileSystem.prototype.removeFile

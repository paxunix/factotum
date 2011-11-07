/**
 * @class Manages a set of Fcommands.
 */
function FcommandManager()
{
    this.guid2Fcommand = { };

    // XXX: 50 MB storage for Fcommands is sufficient?
    // XXX: Should be a config setting?
    this.fileSystem = new FileSystem(50 * 1024 * 1024);
}   // FcommandManager constructor


/**
 * Load all Fcommands from disk.
 * @param {Function} onSuccess Called once all functions have been loaded.
 * @param {Function} onError Called each time there is a problem loading a
 *      function (does not prevent other functions from being loaded).
 */
FcommandManager.prototype.loadCommands = function(onSuccess, onError)
{
    var manager = this;

    var withFcmd = function (fcmd) {
        manager.guid2Fcommand[fcmd.guid] = fcmd;
    };

    var withFileList = function (files) {
        if (files.length == 0)
        {
            onSuccess();
            return;
        }

        Fcommand.load(files.shift(), manager.fileSystem, withFcmd, onError);
        withFileList(files);
    };

    manager.fileSystem.getFileList(withFileList, onError);
}   // FcommandManager.prototype.loadCommands

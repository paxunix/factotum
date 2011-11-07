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

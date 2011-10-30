/**
 * @class Represents a single Fcommand.
 *
 * @constructor
 * @param {Object} commandData Data for an Fcommand.
 * @param {String} commandData.guid Used to uniquely identify this Fcommand.
 * @param {String[]} commandData.names The names that can be used to execute this Fcommand.
 * @param {Object} [commandData.optSpec] a {@link GetOpt} specification defining how this Fcommand's command line should be parsed.
 * @param {String} commandData.description Describes what this command does.  It is used to generate the text that appears in the omnibox when this command is entered.
 * @param {Function|String} commandData.execute The code to run for this Fcommand.  If a Function, this Fcommand is internal and cannot be saved or loaded.
 * @param {String} [commandData.iconUrl] URL for a favicon-type icon for this Fcommand.
 * @param {String} [commandData.helpHtml] HTML markup help text for this Fcommand.  It will be displayed when the general "help" Fcommand is run with any name for this Fcommand as its argument.
*/
function Fcommand(commandData)
{
    Fcommand.validate(commandData);

    this.data = commandData;
}   // Fcommand constructor


Fcommand.prototype = {
    get guid() {
        return this.data.guid;
    },

    get names() {
        return this.data.names;
    },

    get description() {
        return this.data.description;
    },

    get execute() {
        // XXX: could dynamically load this
        return this.data.execute;
    },

    get optSpec() {
        return this.data.optSpec;
    },

    get helpHtml() {
        return this.data.helpHtml;
    },
};


/**
 * Validate the given Fcommand data.
 * @param {Object} data An Fcommand's data to be validated.
 * @throws {String} If the given data is invalid.
 * @see Fcommand For the set of properties that are expected.
 */
Fcommand.validate = function (commandData)
{
    var requiredProperties = [
        "guid",
        "names",
        "execute",
        "description"
    ];

    if (!jQuery.isPlainObject(commandData))
        throw new FcommandError("commandData must be an object");

    var missingProperties = [];
    jQuery.each(requiredProperties, function (i, prop) {
        if (!(prop in commandData))
            missingProperties.push(prop);
    });

    if (missingProperties.length > 0)
        throw new MissingPropertyError("commandData is missing properties: " +
            missingProperties.join(", "));

    if (!jQuery.isArray(commandData.names) || commandData.names.length === 0)
        throw new InvalidData("commandData.names must be a non-empty array.");

    if (typeof(commandData.description) !== 'string' ||
        commandData.description === "" ||
        commandData.description.search(/\S/) == -1)
            throw new InvalidData(
                "commandData.description must be a non-empty string.");

    if (typeof(commandData.execute) !== "string" &&
        !jQuery.isFunction(commandData.execute))
            throw new InvalidData("commandData.execute must be a string or a function.");

    if ('optSpec' in commandData &&
        !jQuery.isPlainObject(commandData.optSpec))
            throw new InvalidData("commandData.optSpec must be an object.");

    if ('helpHtml' in commandData && typeof(commandData.helpHtml) !== "string")
        throw new InvalidData("commandData.helpHtml must be a string.");
}   // Fcommand.validate


/**
 * Save this Fcommand to disk.
 * @param {FileSystem} fileSystem Object that does the save.
 * @param {Function} onSuccessFn Callback function for successful write.
 * @param {Function} onErrorFn Callback function for an error during write.
 * Its parameter is a FileError object.
 */
Fcommand.prototype.save = function(fileSystem, onSuccessFn, onErrorFn)
{
    // Don't save an internal Fcommand (i.e. execute is a function).
    if (jQuery.isFunction(this.execute))
    {
        onSuccessFn();
        return;
    }

    fileSystem.writeFile(this.guid,
        JSON.stringify(this.data), onSuccessFn, onErrorFn);
}   // Fcommand.prototype.save


/**
 * Load an Fcommand from disk by its guid.
 * @param {FileSystem} fileSystem Object that does the load.
 * @param {String} guid guid of the Fcommand to load.
 * @param {Function} onSuccessFn Callback function for successful read.  Its
 * parameter is the new Fcommand object.
 * @param {Function} onErrorFn Callback function on error during read.  Its
 * parameter is a FileError object or an Error (or derived from Error) object.
 */
Fcommand.load = function(guid, fileSystem, onSuccessFn, onErrorFn)
{
    fileSystem.readFile(guid, function (content) {
        var fcmd;
        try {
            // While it may seem odd that reading in a saved Fcommand could
            // throw an exception, we catch them all in case someone has
            // inappropriately diddled the FileSystem data for this Fcommand or
            // if the data used to be valid, but is no longer valid (e.g. an
            // Fcommand upgrade that broke backwards compatibility--which would
            // be very bad).
            fcmd = new Fcommand(JSON.parse(content));
        } catch (e) {
            onErrorFn(e);
            return;
        }

        onSuccessFn(fcmd);
    }, onErrorFn);
}   // Fcommand.load


/**
 * Delete an Fcommand from disk by its guid and make this Fcommand unusable.
 * @param {FileSystem} fileSystem Object that does the load.
 * @param {Function} onSuccessFn Callback function for successful deletion.
 * @param {Function} onErrorFn Callback function on error during delete.  Its
 * parameter is a FileError object or an Error (or derived from Error) object.
 */
Fcommand.prototype.delete = function(fileSystem, onSuccessFn, onErrorFn)
{
    fileSystem.removeFile(this.guid, function() {
        // Since javascript has no destructors, we allow objects to delete
        // themselves by discarding their data.  This doesn't actually destroy
        // the object, but does make it obvious if the caller continues to use a
        // "deleted" object.  Presumably, the caller will dispose of this object
        delete this.data;   // "kill" this Fcommand

        onSuccessFn();
    }.bind(this), onErrorFn);
}   // Fcommand.prototype.delete

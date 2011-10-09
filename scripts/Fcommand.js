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
 * @param {Function} [onSuccessFn] Callback function for successful write.
 * @param {Function} [onErrorFn] Callback function for an error during write.
 * Its parameter is a FileError object.
 */
Fcommand.prototype.save = function(fileSystem, onSuccessFn, onErrorFn)
{
    // Don't save an internal Fcommand (i.e. execute is a function).
    if (jQuery.isFunction(this.data.execute))
    {
        onSuccessFn();
        return;
    }

    fileSystem.writeFile(this.data.guid,
        JSON.stringify(this.data), onSuccessFn, onErrorFn);
}   // Fcommand.prototype.save

/** @fileOverview Classes for Fcommand errors. */


/** @class General Fcommand error.
 *
 * @constructor
 * @param {String} message Error message.
 */
function FcommandError(message)
{
    Error.apply(this, arguments);

    this.message = message;
}   // FcommandError

FcommandError.prototype = new Error();
FcommandError.prototype.name = "FcommandError";


/** @class Fcommand "missing properties" error.
 *
 * @constructor
 * @param {String} message Error message.
 */
function MissingPropertyError(message)
{
    FcommandError.apply(this, arguments);

    this.message = message;
}   // MissingPropertyError

MissingPropertyError.prototype = new FcommandError();
MissingPropertyError.prototype.name = "MissingPropertyError";


/** @class Fcommand "invalid data" error.
 *
 * @constructor
 * @param {String} message Error message.
 */
function InvalidData(message)
{
    FcommandError.apply(this, arguments);

    this.message = message;
}   // InvalidData

InvalidData.prototype = new FcommandError();
InvalidData.prototype.name = "InvalidData";

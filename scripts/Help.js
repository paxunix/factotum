"use strict";

module.exports = (function () {

var Help = {};

/**
 * Popup help for the given Fcommand.
 * @param {String} fcommandGuid - The guid for the Fcommand whose help
 * should be shown.
 * show.
 */
Help.showFcommandHelp = function (fcommandGuid)
{
    // Arbitrarily make the help dialog's container 50% of the screen's
    // width and 70% of the screen's height.
    // XXX: need min+max range e.g. Math.min(Math.max(300, x), 1000);
    var width = Math.round(window.screen.width * 0.30);
    var height = Math.round(window.screen.height * 0.55);
    var url = chrome.runtime.getURL("build/help.html") +
        "?guid=" + fcommandGuid;

    chrome.windows.create({
        url: url,
        type: "popup",
        left: Math.round((window.screen.width - width) / 2),
        top: Math.round((window.screen.height - height) / 2),
        width: width,
        height: height,
        focused: true,
    });
}   // showFcommandHelp

return Help;

})();   // module.exports

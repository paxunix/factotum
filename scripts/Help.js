"use strict";

module.exports = (function () {

var Help = {};

// Return a promise to get the focussed window; resolves to the Window
// data object.
function getFocussedWindow() {
    return new Promise(function (resolve, reject) {
        chrome.windows.getLastFocused(function (wnd) {
            resolve(wnd);
        });
    });
}


// Return a promise to create the help window
function createHelpWindow(fcommandGuid, wnd) {
    var width = Math.round(wnd.width * 0.40);
    var height = Math.round(wnd.height * 0.65);
    var url = chrome.runtime.getURL("build/help.html") +
        `?guid=${fcommandGuid}`;

    return new Promise(function (resolve, reject) {
        chrome.windows.create({
            url: url,
            type: "popup",
            left: Math.round((wnd.width - width) / 2),
            top: Math.round((wnd.height - height) / 2),
            width: width,
            height: height,
            focused: true,
        }, function (wnd) {
            resolve(wnd);
        });
    });
}


/**
 * Popup help for the given Fcommand.
 * @param {String} fcommandGuid - The guid for the Fcommand whose help
 * should be shown.
 */
Help.showFcommandHelp = function (fcommandGuid)
{
    getFocussedWindow().then(function (wnd) {
        return createHelpWindow(fcommandGuid, wnd);
    }).catch(function (err) {
        // XXX: surface error to user
        console.error(`Failed creating help window for Fcommand ${fcommandGuid}:`, err);
    });
}   // showFcommandHelp

return Help;

})();   // module.exports

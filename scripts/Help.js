"use strict";

module.exports = (function () {

var Help = {};

// XXX:
// - no need for the injected script to do this work; the content script
// already has access to the imported document (because it imported it).
// - however, it has no reason to hang on to the imported document--it
// should have just pulled out the parts it needed to inject, and then
// injected them.  The content-script is actually really dumb:  it has a
// listener to communicate with the bg page and one to communicate with the
// page itself.  Everything else is done in-page.
// - but the content script already has access to the page's DOM anyway
//      - so, should the content script pop the help dialog by extracting it
//      from the import doc in the page's doc?
//      - or should it hang on to the help doc from when it got the document
//      from the bg script?
//          - that doesn't make sense:  it gets the doc from bg as a string,
//          so it would have to parse the html and extract the help dialog
//          markup.  Since it's already in the doc once the Fcommand is
//          imported into the page, it can just be pulled directly from
//          there by the content script, not the page.  There is no reason
//          for the page to pop the help dialog.

/**
 * Popup help for the given Fcommand.
 * @param {Dialog} dialog - HTML dialog element that contains the markup to
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

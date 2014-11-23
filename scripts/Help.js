"use strict";

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
 * For an Fcommand, extract the dialog element XXX for an Fcommandfrom which to clone the help dialog markup.
 * @param {Document} document - Document expected to contain an import document for the Fcommand with the given guid.
 * @returns {Node} Returns the <dialog> node element.
 *
 */
Help.extractDialog = function (document, guid)
{
    var importId = Util.getFcommandImportId(guid);
    var importDoc =
        document.querySelector('link[rel="import"][id="' + importId + '"]');

    if (!importDoc)
        throw RuntimeError("Failed to find link.import for " + importId);

    var dialog = importDoc.import.querySelector('dialog#help');

    if (!dialog)
        throw RuntimeError("No help dialog present for " + importId);

    return dialog;
}   // Help.extractDialog


/**
 * Center the given dialog in a popup.
 * XXX: why not just load the command's entire document and some
 * fixed script in the extension that pops the dialog already in it?  THen
 * no parsing, no fuckery, it just all works?  Document will get torn down
 * immediately anyway once the help window is closed.
 * That's bad:  because if there are <script> tags not in a template, they
 * will be executed which is probably not what you want if you only need the
 * help dialog.  Can just parse the document and show the help.
 *
 * Why not make this an HTML document that is passed the data it needs and a
 * script can load that data in?
 *
 * @param {Dialog} dialog - HTML dialog element that contains the markup to
 * show.
 */
Help.showDialog = function (fcommandGuid)
{
    // Arbitrarily make the help dialog's container 50% of the screen's
    // width and 70% of the screen's height.
    // XXX: need min+max range e.g. Math.min(Math.max(300, x), 1000);
    var width = Math.round(window.screen.width * 0.30);
    var height = Math.round(window.screen.height * 0.55);
    var url = chrome.runtime.getURL("html/help.html") + "?guid=" + fcommandGuid;

    chrome.windows.create({
        url: url,
        type: "popup",
        left: Math.round((window.screen.width - width) / 2),
        top: Math.round((window.screen.height - height) / 2),
        width: width,
        height: height,
        focused: true,
    });
}   // Help.showDialog

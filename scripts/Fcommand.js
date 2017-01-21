"use strict";

import GetOpt from "./GetOpt.js";
import semver from "semver";
import TransferObject from "./TransferObject.js";
import Util from "./Util.js";
import WrappErr from "wrapperr";


class Fcommand
{

/**
 * @class Fcommand Represents a single Fcommand.
 * Note that this constructor is NOT called when Dexie instantiates an
 * Fcommand out of storage.  It is only used when initially creating an
 * Fcommand object.
 * @constructor
 * @param {String} documentString - HTML document defining an Fcommand.
 * @param {String} language - BCP47 language string
*/
constructor(documentString, language) {
    this.documentString = documentString;

    this.extractedData = Fcommand._extractData(this.documentString, language);
    Fcommand._validateData(this.extractedData);

    // An Fcommand is enabled by default
    this.enabled = true;

    // And has lowest order by default
    this.order = 0;

    // Last update check time (millis since epoch)
    this.lastUpdateTime = Date.now();

    return this;
}   // Fcommand constructor


/**
 * Returns the language-specific string value for a given field in head.meta
 * within the Fcommand document.
 * @param {String} field - Field to retrieve
 * @param {HTMLDocument} document - The Fcommand document.
 * @param {String} lang - BCP47 language string
 * @return String The value for field, or null if it doesn't exist.  Any
 * value has leading and trailing whitespace removed.
 */
static _getMetadataFieldString(field, document, lang)
{
    let value = Fcommand._getSelectorContent(`head meta[name='${field}']`, document, lang);

    if (value !== null)
        value = value.replace(/^\s+/, "").replace(/\s+$/, "");

    return value;
}   // Fcommand._getMetadataFieldString


/**
 * Returns the content for a given field based on the document selector.
 * @param {String} selector - Selector (suitable for document.querySelector)
 * @param {HTMLDocument} document - The Fcommand document.
 * @param {String} lang - BCP47 language string
 * @return String The value for field, or null if it doesn't exist.
 */
static _getSelectorContent(selector, document, lang)
{
    let value = (Fcommand._getFromLangSelector(document, selector, lang) || {}).content;

    return (value !== undefined ? value : null);
}   // Fcommand._getSelectorContent


/**
 * Build a data extractor object.  Each key knows how to retrieve the value
 * of the key field name from the Fcommand document.
 * @param {HTMLDocument} document - The Fcommand document.
 * @param {String} lang - BCP47 language string
 * @returns Object Maps Fcommand field names to objects with functions that
 * retrieve data for that field.  Each extract function takes an
 * HTMLDocument and a language string.
 */
static _getDataExtractor(document, lang)
{
    function getMetaFieldExtractor(field)
    {
        return function (document, lang) {
            return Fcommand._getMetadataFieldString(field, document, lang);
        };
    }

    return {
        author: getMetaFieldExtractor("author"),
        bgCodeString: Fcommand._extractBgCodeString,
        context: getMetaFieldExtractor("context"),
        description: getMetaFieldExtractor("description"),
        downloadUrl: getMetaFieldExtractor("downloadUrl"),
        guid: getMetaFieldExtractor("guid"),
        helpMarkup: Fcommand._extractHelpMarkup,
        icon: function (document, lang) {
            let icon = Fcommand._getFromLangSelector(document, "head link[rel=icon]", lang);
            if (icon !== null)
                icon = icon.getAttribute("href");

            return icon;
        },
        keywords: function (document, lang) {
            let keywords = Fcommand._getMetadataFieldString("keywords", document, lang);

            // Keywords is a comma- or space-delimited list of words
            if (keywords !== null)
            {
                keywords = keywords.
                    split(/[,\s]+/).
                    filter(function(el) {
                        return (el !== "" && el !== " " && el !== ",")
                    })
            }
            else
                keywords = [];

            return keywords;
        },
        menu: function (document, lang) {
            let words = Fcommand._getMetadataFieldString("menu", document, lang);

            // "menu" field is a comma- or space-delimited list of words
            if (words !== null)
            {
                words = words.
                    split(/[,\s]+/).
                    filter(function(el) {
                        return (el !== "" && el !== " " && el !== ",")
                    })
            }
            else
                words = [];

            return words;
        },
        optspec: Fcommand._extractOptSpec,
        title: function (document, lang) {
            let title = Fcommand._getFromLangSelector(document, "head title", lang);
            if (title !== null)
                title = title.textContent;

            return title;
        },
        updateUrl: getMetaFieldExtractor("updateUrl"),
        version: getMetaFieldExtractor("version"),
    };
}   // Fcommand._getDataExtractor


/**
 * Build a data validator object.  Each key knows how to validate the value
 * of the key field name from the Fcommand document.
 * @param {HTMLDocument} document - The Fcommand document.
 * @param {String} lang - BCP47 language string
 * @returns Object Maps Fcommand field names to objects with functions that
 * validate the data for that field.  Validate functions take the value to
 * validate.  Data being validated is expected to have been extracted by the
 * extraction functions.  Fields with no validation function don't get
 * validated (duh).
 */
static _getDataValidator()
{
    function getNullChecker(field)
    {
        return function throwIfNull(value) {
            if (value === null)
                throw new Error(`Fcommand field '${field}' is required.`);
        };
    }

    return {
        author: getNullChecker("author"),
        description: getNullChecker("description"),
        guid: getNullChecker("guid"),
        keywords: function (value) {
            if (value.length === 0)
                throw new Error("Fcommand field 'keywords' must have at least one keyword");
        },
        title: getNullChecker("title"),
        version: function (value) {
            if (semver.valid(value) === null)
                throw new Error(`Fcommand field 'version'='${value}' is not semver-compliant`);
        },
    };
}   // Fcommand._getDataValidator


/**
 * Retrieve Fcommand data from the import document.
 * @param {String} documentString - Fcommand document in string form
 * @param {String} lang - BCP47 language string
 * @returns {Object} Retrieved values for every key (field) specified in
 * _getDataExtractor.
 */
static _extractData(documentString, lang)
{
    let dom = Fcommand._parseDomFromString(documentString);
    let extractor = Fcommand._getDataExtractor(dom, lang);
    let extractData = {};

    for (let [field, extractFn] of Object.entries(extractor))
    {
        extractData[field] = extractFn(dom, lang);
    }

    return extractData;
}   // Fcommand._extractData


/**
 * Return one HTML object for the given selector, preferring elements with
 * the given language attribute and falling back as necessary.
 * @param {HTMLDocument} document - HTML document to search
 * @param {String} selector - document query selector
 * @param {String} lang - BCP47 language string
 */
static _getFromLangSelector(document, selector, lang)
{
    let elements = document.querySelectorAll(selector);

    // List of languages in order of preference:  given language (presumably
    // from the browser), given language with no subtags, no language
    let langList = [ lang.toLowerCase(), lang.toLowerCase().split("-")[0], "" ];

    for (let lidx = 0; lidx < langList.length; ++lidx)
    {
        for (let el of elements)
        {
            if (langList[lidx] === el.lang.toLowerCase())
                return el;
        }
    }

    return null;
};   // Fcommand._getFromLangSelector


/**
 * Return an HTMLDocument object representing the given document string.
 * @private
 * @param {String} documentString - Input document to be parsed as HTML
 * markup.
 * @return {HTMLDocument} The HTMLDocument object resulting from
 * documentString.
 */
static _parseDomFromString(documentString)
{
    return (new DOMParser).parseFromString(documentString, "text/html");
}   // Fcommand._parseDomFromString


/**
 * Validate the Fcommand data.  Accumulate any errors so they can all be
 * shown at once, rather than one at a time.
 * @param {Object} data - Object with fields as from _extractData().
 * @throws {Error} On validation failure.
 */
static _validateData(data)
{
    let validator = Fcommand._getDataValidator();
    let error = "";

    for (let [field, validateFn] of Object.entries(validator))
    {
        try {
            validateFn(data[field]);
        }
        catch (e) {
            if (error.length)
                error += "\n";

            error += e;
        }
    }

    if (error.length)
        throw new Error(error);
}   // Fcommand._validateData


/**
 * Returns an object that can be passed to GetOpt.getOptions for options
 * parsing.
 * @param {Object} document - HTML document object specifying the Fcommand
 * @param {String} lang - extracts metadata for this BCP47 language string
 * @returns {Object} Option parsing data
 */
static _extractOptSpec(document, lang)
{
    let sel = "template#getopt";
    let template = Fcommand._getFromLangSelector(document, sel, lang);
    if (!template)
        return {};

    try {
        return JSON.parse(template.content.textContent);
    }

    catch (e)
    {
        throw new WrappErr(e, `Failed parsing ${sel}`);
    }
}   // Fcommand._extractOptSpec


/**
 * Retrieve the Fcommand's help markup.
 * @param {Object} document - HTML document object specifying the Fcommand
 * @param {String} lang - extracts help markup for this BCP47 language string
 * @returns {String} Help command markup.
 */
static _extractHelpMarkup(document, lang)
{
    let sel = "template#help";
    let template = Fcommand._getFromLangSelector(document, sel, lang);
    if (!template)
        return null;

    return template.innerHTML;
    // XXX: test me
}   // Fcommand._extractHelpMarkup


/**
 * Returns the Fcommand's background code as a string.
 * @param {HTMLDocument} document - contains the Fcommand
 * @param {String} language - extracts metadata for this BCP47 language string
 * @returns {String} Fcommand background-code string.
 */
static _extractBgCodeString(document, language)
{
    let sel = "template#bgCode";
    let template = Fcommand._getFromLangSelector(document, sel, language);
    if (!template)
        return null;

    return template.content.textContent;
}   // Fcommand._extractBgCodeString


/**
 * Return a promise to run the bg code for this Fcommand, passing it the
 * given data (as 'transferObj').
 * @param {TransferObject} transferObj - Data passed to the Fcommand.
 * @return {Promise} - run the bg code, resolve to whatever the bg code
 * returns from calling onSuccess();
 */
runBgCode(transferObj)
{
    let self = this;

    let cloneTransferObject = transferObj.clone();
    cloneTransferObject.set("_bg.fcommandDocument",
        Fcommand._parseDomFromString(self.documentString));
    // No need to pass the document string since we already extracted it for
    // our use.
    cloneTransferObject.delete("_content.documentString");

    // Run the Fcommand's bgCode
    return new Promise(function (onSuccess, onFailure) {
        let bgFunction = new Function("transferObj", "onSuccess", "onFailure",
            (transferObj.get("_content.internalCmdlineOptions").bgdebug ? "d\ebugger;\n" : "") +
                self.extractedData.bgCodeString);

        return bgFunction(cloneTransferObject, onSuccess, onFailure);
    });
}   // Fcommand.runBgCode


/**
 * Send the content script a message to run this Fcommand, passing it the
 * given data.
 * @param {Fcommand} fcommand - Fcommand to be invoked
 * @param {TransferObject} transferObj - Data passed to the Fcommand.
 */
runPageCode(transferObj)
{
    let tab = transferObj.getCurrentTab();

    // If the current page is internal, it can't run a "page" context
    // Fcommand.
    if (tab.url.search(/^(chrome|about)[-\w]*:/i) !== -1)
    {
        throw new Error(`Fcommand '${transferObj.get("_content.title")}' cannot run on a browser page.`);
    }

    chrome.tabs.sendMessage(tab.id, transferObj);
}   // Fcommand.runPageCode


/**
 * Return a promise to execute this Fcommand in the current tab.  Does the
 * right thing depending if it's a bg or page command.
 * @param {TransferObject} - data for the Fcommand
 * @return {Promise} - with the transferObj data for the Fcommand.
 */
execute(transferObj)
{
    let self = this;

    return Util.getCurrentTab().then(function (tab) {
        transferObj.setCurrentTab(tab)
            .set("_content.documentString", self.documentString)
            .set("_content.title", self.extractedData.title)
            .set("_content.guid", self.extractedData.guid);

        // If the Fcommand is bg-only, invoke it now.
        if (self.extractedData.context.toLowerCase() === "bg")
        {
            return self.runBgCode(transferObj);
        }

        return self.runPageCode(transferObj);
    });
}   // Fcommand.execute


// Return the ID to be used for this Fcommand's context menu entry (if it
// has one).
_getContextMenuId()
{
    return this.extractedData.guid;
}   // Fcommand._getContextMenuId


/**
 * Return a promise to create a context menu item under the given parent.
 * @returns {Promise}
 */
createContextMenu(parentMenuId)
{
    let self = this;

    return new Promise(function (resolve, reject) {
        if (self.extractedData.menu.length > 0)
        {
            chrome.contextMenus.create({
                type: "normal",
                id: self._getContextMenuId(),
                parentId: parentMenuId,
                title: self.extractedData.title,
                contexts: self.extractedData.menu,
                enabled: self.enabled,      // XXX: need to update this whenever the enabled state changes
                onclick: function (contextMenuData, tab) {
                    let transferObj = new TransferObject({
                        // There are no internal command line options
                        // because none could have been entered.
                        "_content.internalCmdlineOptions": GetOpt.getOptions({},[]),
                    });
                    // The command line is only the Fcommand keyword.
                    // This isn't strictly necessary, but mimics
                    // invoking the Fcommand by entering its first
                    // keyword in the omnibox with no parameters.
                    transferObj.setCommandLine(GetOpt.getOptions(self.extractedData.optspec, [ self.extractedData.keywords[0] ]));
                    transferObj.setContextClickData(contextMenuData);
                    // Context menu action always implies current tab
                    transferObj.setTabDisposition("currentTab");

                    // XXX: the problem here is that there is no error trap;
                    // an exception during execution will not surface to the
                    // user because this happens after the onclick doesn't
                    // happen as a result of a promise during regular
                    // invocation.
                    self.execute(transferObj);
                },
            }, function () {
                if (chrome.runtime.lastError)
                {
                    reject(new Error(`Failed to create context menu for ${self.extractedData.title}: ${chrome.runtime.lastError}`));
                    return;
                }

                resolve(self);
            });
        }
        else
        {
            resolve(self);
        }
    });
}   // Fcommand.createContextMenu


/**
 * Return a promise to create the help popup window for this Fcommand.  If
 * no help markup exists, say so.
 * @returns {Promise}
 */
popupHelpWindow()
{
    let self = this;

    return getFocussedWindow().then(function (wnd) {
        if (self.extractedData.helpMarkup === null)
        {
            throw new Error(`No help available for Fcommand '${self.extractedData.title}' (${self.extractedData.guid}).`);
        }

        return createHelpWindow(self.extractedData.guid, wnd);
    });
}

}   // class Fcommand


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
    let width = Math.round(wnd.width * 0.40);
    let height = Math.round(wnd.height * 0.65);
    let url = chrome.runtime.getURL("build/help.html") +
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


export default Fcommand;

/**
 * Loaded in the popup window that displays an Fcommand's help.
 */

var lang = navigator.language || "en-us";
var okButton = Util.getFromLangSelector(document, "#ok-button", lang);
var helpWrapper = Util.getFromLangSelector(document, "#wrap-help", lang);
var fcommandGuid = window.location.search.split("?guid=")[1];
// XXX: Retrieve markup from DB for this fcommand.

document.title = "Help for: XXX";  // XXX: fcommand's name from DB

var markup = "XXX: This is the content shown when help is requested for this Fcommand.  It can be anywhere in this document and requires an id of 'help'.  <pre> loadjq [--min] [--version version] </pre> <p> Defaults to loading the latest version.";
// XXX: markup should already have <script> tags removed from it.  So the
// help markup is stored as-is in the DB.

helpWrapper.innerHTML = markup;

function closeAction()
{
    window.close();
}

okButton.addEventListener("click", closeAction);
document.addEventListener("keydown", function keydown(evt) {
    if (evt.keyCode === 27)     // Esc
        closeAction();
});

okButton.focus();

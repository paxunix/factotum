// Sample Fcommand code (run in bg console):

function fcommand() {


function bgCodeWrapper(title, count)
{

function bgPopNotification(title, content)
{
    chrome.notifications.create(
        "bogusId",
        {
            type: "basic",
            iconUrl: chrome.runtime.getURL("icons/error.png"),
            title: title,
            message: content
        },
        function() {}
    );
}

bgPopNotification(title, "The count is: " + count);

}


var count = document.querySelectorAll("meta").length;
console.log("Meta count:", count);
bgArgs = [ "This is the title", count ];
arguments[0].responseCallback("(" + bgCodeWrapper.toString() + ")(" +
    bgArgs.map(function(el) { return JSON.stringify(el); }).join(",") +
    ");");

}

// only to be used in the console to fake invocation of an fcommand
chrome.tabs.query({active: true}, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {
        documentString: "dummy",
    codeString: "("+fcommand.toString()+").apply(this,arguments);" }, Factotum.responseHandler);
})

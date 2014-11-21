// Sample Fcommand code (run in bg console):

function fcommand(data) {

var importdoc = data.importDocument;
var cmdline = data.cmdline;
var responseCallback = data.responseCallback;


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
}   // bgPopNotification

bgPopNotification(title, "The count is: " + count);

}   // bgCodeWrapper


var count = document.querySelectorAll("meta").length;
console.log("Meta count:", count);
responseCallback([ bgCodeWrapper, "This is the title", count ]);

}   // fcommand

// only to be used in the console to fake invocation of an fcommand
chrome.tabs.query({active: true}, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {
            documentString: "dummy",
            cmdline: {
                debug: false,
                help: false,
                _: [ 1, 2, 3 ],
            },
            codeString: Util.getCodeString([fcommand], { debug: 0 } ),
        }, Factotum.responseHandler);
})

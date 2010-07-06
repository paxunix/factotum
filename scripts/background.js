var onRequest = function(request, sender, sendResponse)
{
    window.alert("hooray");
};

(function()
{
    chrome.extension.onRequest.addListener(onRequest);
})();

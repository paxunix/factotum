window.addEventListener('keyup', function (e) {
    if (e.which == 32 && e.ctrlKey && !e.metaKey && !e.altKey)
    {
        chrome.extension.sendRequest({action: "open"});
    }
}, false);

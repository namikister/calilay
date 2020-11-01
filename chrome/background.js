// Listen for any changes to the URL of any tab.
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (getSiteType(tab.url) !== null) {
        chrome.pageAction.show(tabId);
    }
});

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    var response = (request.method == "getLocalStorage") ? {data: localStorage[request.key]} : {};
    sendResponse(response);
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.method == "callAPI") {
        var url = "https://api.calil.jp" + request.params;
        fetch(url)
            .then(response => response.text())
            .then(text => {
                let json = text.match(/callback\((.*?)\)/);
                let data = JSON.parse(json[1]);
                sendResponse(data);
            })
            .catch(error => console.log('error: ' + error));
        return true;
    }
    return false;
});

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

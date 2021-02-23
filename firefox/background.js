// Listen for any changes to the URL of any tab.
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (getSiteType(tab.url) !== null) {
        chrome.pageAction.show(tabId);
    }
});

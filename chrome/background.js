// Listen for any changes to the URL of any tab.

function getSiteType(url) {
    const pages = {
        MediaMarker:      /http:\/\/mediamarker\.net\/u\/.*\//,
        AmazonDetail:     /https?:\/\/www\.amazon\.co\.jp\/.*(ASIN|[dg]p)(\/product)?\/[\dX]{10}/,
        AmazonKindle:     /https?:\/\/www\.amazon\.co\.jp\/.*(ASIN|[dg]p)(\/product)?\/\w{10}/,
        AmazonWishlist:   /https?:\/\/www\.amazon\.co\.jp\/(.*\/)?wishlist[\/?]/,
        DockushoMeterPre: /https?:\/\/bookmeter.com\/users\/\d+/
    };
    const found = Object.entries(pages).find(([type, regexp]) => regexp.test(url));
    return found ? found[0] : undefined;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.method == "callAPI") {
        const url = "https://api.calil.jp" + request.params;
        fetch(url)
            .then(response => response.text())
            .then(text => {
                const json = text.match(/callback\((.*?)\)/),
                      data = JSON.parse(json[1]);
                sendResponse(data);
            })
            .catch(error => console.log('error: ' + error));
        return true;
    }
    else if (request.method == "getSiteType") {
        const type = getSiteType(request.url);
        sendResponse(type);
        return true;
    }
    return false;
});

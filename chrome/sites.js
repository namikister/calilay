function getSiteType(url) {
    var pages = {
        MediaMarker:      /http:\/\/mediamarker\.net\/u\/.*\//,
        AmazonDetail:     /https?:\/\/www\.amazon\.co\.jp\/.*(ASIN|[dg]p)(\/product)?\/[\dX]{10}/,
        AmazonKindle:     /https?:\/\/www\.amazon\.co\.jp\/.*(ASIN|[dg]p)(\/product)?\/\w{10}/,
        AmazonWishlist:   /https?:\/\/www\.amazon\.co\.jp\/(.*\/)?wishlist[\/?]/,
        DockushoMeterPre: /https?:\/\/bookmeter.com\/users\/\d+/
    };
    for (var type in pages) {
        if (pages[type].test(url)) {
            if (type == "AmazonKindle"){
                return document.body.classList.contains("ebooks") ? type : null;
            }
            return type;
        }
    }
    return null;
}

function getSiteType(url) {
    var pages = {
        MediaMarker:      /http:\/\/mediamarker\.net\/u\/.*\//,
        AmazonDetail:     /http:\/\/www\.amazon\.co\.jp\/.*(ASIN|[dg]p)(\/product)?\/[\dX]{10}/,
        AmazonWishlist:   /http:\/\/www\.amazon\.co\.jp\/(.*\/)?wishlist\//,
        DockushoMeterPre: /http:\/\/book.akahoshitakuya.com\/home\?main=pre/
    };
    for (var type in pages) {
        if (pages[type].test(url)) {
            return type;
        }
    }
    return null;
}
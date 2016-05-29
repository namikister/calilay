exports.main = function (options, callbacks) {
    if (options.loadReason === "install") {
        var ps = require("sdk/preferences/service");
        ps.set("extensions.calilay.library1", "Tokyo_Setagaya");
        ps.set("extensions.calilay.library2", "");
        ps.set("extensions.calilay.library3", "");
        ps.set("extensions.calilay.library4", "");
        ps.set("extensions.calilay.library5", "");
        ps.set("extensions.calilay.enabled", true);
    }
};

var data = require("sdk/self").data;

function getSiteType(url) {
    var pages = [
        ["MediaMarker",      /http:\/\/mediamarker\.net\/u\/.*\//],
        ["AmazonDetail",     /https?:\/\/www\.amazon\.co\.jp\/.*(ASIN|[dg]p)(\/product)?\/[\dX]{10}/],
        ["AmazonKindle",     /https?:\/\/www\.amazon\.co\.jp\/.*(ASIN|[dg]p)(\/product)?\/\w{10}/],
        ["AmazonWishlist",   /https?:\/\/www\.amazon\.co\.jp\/(.*\/)?wishlist\//],
        ["DockushoMeterPre", /http:\/\/book.akahoshitakuya.com\/home\?main=pre/]
    ];
    for (var i = 0, len = pages.length; i < len; i++) {
        if (pages[i][1].test(url)) {
            return pages[i][0];
        }
    }
    return null;
}

var sp = require("sdk/simple-prefs");
sp.on("config", function() {
    var windows = require("sdk/windows").browserWindows;
    windows.open("chrome://calilay/content/config.xul");
});

require("sdk/page-mod").PageMod({
    include: [
        "http://mediamarker.net/u/*",
        "http://www.amazon.co.jp/*",
        "https://www.amazon.co.jp/*",
        "http://book.akahoshitakuya.com/*"
    ],
    contentScriptWhen: "ready",
    contentStyleFile: data.url("calilapi.css"),
    contentScriptFile: [
        data.url("jquery-1.6.4.min.js"),
        data.url("calilapi.js"),
        data.url("calilay.js")
    ],
    onAttach: function(worker) {
        var ps = require("sdk/preferences/service");

        var prefs = {};
        var prefRoot = "extensions.calilay.";
        var name;
        for (var i = 1; i <= 5; i++) {
            name = "library" + i;
            prefs[name] = ps.get(prefRoot + name);
        }
        var enabled = ps.get(prefRoot + "enabled");

        if (!enabled) return;
        var siteType = getSiteType(worker.url);
        if (typeof siteType !== "string") return;

        worker.postMessage({
            prefs: prefs,
            siteType: siteType
        });
    }
});
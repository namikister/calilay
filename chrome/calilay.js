/**
 * Calilay 図書館蔵書検索
 *
 * Showing results of library searching using calil api.
 * Copyright Yuta Namiki
 * For any bug or suggestion contact namikister@gmail.com
 * Released under BSD
 *
 */
chrome.extension.sendRequest({method: "getLocalStorage", key: "libraries"}, function(response) {
    var libraries = JSON.parse(response.data);

    var appkey = '0f316d2b698c28451ed3f5f5223df15b';

    var siteType = getSiteType(document.location.href);
    if (siteType === null) return;

    var createInitialElement = function(isbn) {
        var html =
            '<div id="'+isbn+'" class="calilay">' +
            libraries.map(function(library) {
                return '<div id="'+library.id+'" class="calil_libsys">' +
                    '<div>' + library.name +
                    '<span class="calil_system_status calilay_searching">:検索中' +
                    '</span>' +
                    '</div>' +
                    '<div class="prefix"></div>' +
                    '</div>';
            }).join("") +
            '<div class="calil_clear"></div></div>';
        return html;
    };

    // for Kindle formats, find the ISBNs of their corresponding paper books from their detail pages.
    var resolveKindleIsbnFromAmazonDetailPage = function(detailPageURI, parentElement) {
        var callback = function(html) {
            var asyncIsbnList = [];
            $(html).find('#formats a.title-text').each(function(i) {
                if ($(this).attr('href').match(/\/(?:ASIN|[dg]p)(?:\/product)?\/([\dX]{10})/)) {
                    var isbn = RegExp.$1;
                    asyncIsbnList.unshift(isbn);
                    // TODO: when more than 1 formats exists, some descriptions may be needed.
                    $(parentElement).append(createInitialElement(isbn));
                }
            });

            // this callback function may be called after render() is called.
            // so we have to access Calil API also in this callback.
            if (asyncIsbnList.length > 0) {
                var calil = new Calil({
                    appkey: appkey,
                    render: new CalilRender('single'),
                    isbn: asyncIsbnList,
                    systemid: libraries.map(function(library) { return library.id; })
                });
                calil.search();
            }
        };
        $.get(detailPageURI, callback);
    }

    var renderFunctions = {
        MediaMarker: function () {
            var isbnList = [];
            var $binder_data = $('div.binder_data').not('div:has(div.calilay)');
            var $med_imgview = $('div.med_imgview').not('div:has(div.calilay)');
            var $elems = $med_imgview.size() > 0 ? $med_imgview : $binder_data;
            $elems.each(function(i) {
                var url = $('a[href^="http://www.amazon.co.jp/"]:first', this).attr('href');
                if (url.match(/ASIN\/([A-Z0-9]{10})/)) {
                    var isbn = RegExp.$1;
                    isbnList.unshift(isbn);
                    $(this).append(createInitialElement(isbn));
                }
            });
            return $.unique(isbnList);
        },

        DockushoMeterPre: function () {
            var isbnList = [];
            $('div.book.book_button_add_ver').not(':has(div.calilay)').each(function(i) {
                var href = $(this).children('a:first').attr('href');
                if (href.match(/\/b\/([A-Z0-9]{10})/)) {
                    var isbn = RegExp.$1;
                    isbnList.unshift(isbn);
                    $(this).css('height', 'auto !important').append(createInitialElement(isbn));
                }
            });
            return $.unique(isbnList);
        },

        AmazonDetail: function () {
            var isbn = document.getElementById('ASIN').value;
            var isbnList = [isbn];
            $('#centerCol, form#handleBuy > table:last tr:last > td').append(createInitialElement(isbn));
            return isbnList;
        },

        AmazonKindle: function () {
            var isbnList = [];
            $("#formats a[id^=a-autoid-").each(function(a) {
                if ($(this).attr('href').match(/\/(?:ASIN|[dg]p)(?:\/product)?\/([\dX]{10})/)) {
                    var isbn = RegExp.$1;
                    isbnList.unshift(isbn);
                    // TODO: when more than 1 ISBNs are matched, some descriptions may be needed.
                    $('#centerCol').append(createInitialElement(isbn));
                }
            });
            return $.unique(isbnList);
        },

        AmazonWishlist: function () {
            var isbnList = [];
            $('#wishlist-page [id^=itemInfo_]').not(':has(div.calilay)').each(function(i, itemInfo) {
                var href = $(this).find('a[id^=itemName_]').attr('href');

                if (href) {
                    if (href.match(/\/(?:ASIN|[dg]p)(?:\/product)?\/([\dX]{10})/)) {
                        var isbn = RegExp.$1;
                        isbnList.unshift(isbn);
                        $(this).append(createInitialElement(isbn));
                    }
                    else if ($(this).text().includes('(Kindle版)')) {
                        resolveKindleIsbnFromAmazonDetailPage(href, itemInfo);
                    }
                }
            });
            return $.unique(isbnList);
        }
    };

    var render = function() {
        var isbnList = renderFunctions[siteType]();

        if (isbnList.length > 0) {
            var calil = new Calil({appkey: appkey,
                                   render: new CalilRender('single'),
                                   isbn: isbnList,
                                   systemid: libraries.map(function(library) { return library.id; })
                                  });

            calil.search();
        }
    };

    render();

    document.addEventListener("AutoPagerAfterInsert", render);
});

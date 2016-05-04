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
            $('#wishlist-page [id^=itemInfo_]').not(':has(div.calilay)').each(function(i) {
                var href = $(this).find('a[id^=itemName_]').attr('href');
                if (href && href.match(/\/(?:ASIN|[dg]p)(?:\/product)?\/([\dX]{10})/)) {
                    var isbn = RegExp.$1;
                    isbnList.unshift(isbn);
                    $(this).append(createInitialElement(isbn));
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

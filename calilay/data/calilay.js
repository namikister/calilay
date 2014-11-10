/**
 * Calilay 図書館蔵書検索
 *
 * Showing results of library searching using calil api.
 * Copyright Yuta Namiki
 * For any bug or suggestion contact namikister@gmail.com
 * Released under BSD
 *
 */
self.on('message', function(message) {
    var prefs = message.prefs;
    var siteType = message.siteType;

    var appkey = '0f316d2b698c28451ed3f5f5223df15b';

    var systemIds = (function () {
                         var systemids = [];
                         var i, library = "";
                         for (i = 1; library != null; i++) {
                             library = prefs["library" + i];
                             if (library) {
                                 systemids.push(library);
                             }
                         }
                         return systemids;
                     })();

    var systemNames = {};

    var createInitialElement = function(isbn) {
        var html =
            '<div id="'+isbn+'" class="calilay">' +
            systemIds.map(function(systemId) {
                return '<div id="'+systemId+'" class="calil_libsys">' +
                    '<div>' + systemNames[systemId] +
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
                    $(this).css("cssText", "height: auto !important;").append(createInitialElement(isbn));
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

        AmazonWishlist: function () {
            var isbnList = [];
            $('tbody.itemWrapper').not('tbody:has(div.calilay)').each(function(i) {
                if ($(this).attr('name').match(/\.([A-Z0-9]{10})$/)) {
                    var isbn = RegExp.$1;
                    isbnList.unshift(isbn);
                    $(this).find('td.lineItemMainInfo:first').append(createInitialElement(isbn));
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
                                   systemid: systemIds
                                  });

            calil.search();
        }
    };

    var counter = 0;
    systemIds.forEach(function(id) {
        $.ajax({
            url: 'http://api.calil.jp/library',
            data: {
                appkey: appkey,
                format: "json",
                systemid: id
            },
            dataType: "text"
        }).success(function(text) {
            var json = text.match(/callback\((.*?)\);$/);
            var data = JSON.parse(json[1]);
            systemNames[id] = data[0].systemname;
            counter++;
            if (counter >= systemIds.length) {
                render();
            }
        });
    });

    document.addEventListener("AutoPagerAfterInsert", render);
});

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

        AmazonDetail: function () {
            var isbn = document.getElementById('ASIN').value;
            var isbnList = [isbn];
            $('form#handleBuy > table:last tr:last > td').append(createInitialElement(isbn));
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
				   systemid: libraries.map(function(library) { return library.id; })
                                  });

            calil.search();
        }
    };

    render();

    document.addEventListener("AutoPagerAfterInsert", render);
});

/**
 * Calilay 図書館蔵書検索
 * 
 * Showing results of library searching using calil api.
 * Copyright Yuta Namiki
 * For any bug or suggestion contact namikister@gmail.com
 * Released under BSD
 * 
 */
(function () {
     if (!GM_getValue("enabled")) return;

     // この行がないとFirefox4でエラーが発生する
     $ = window.$;

     var appkey = '0f316d2b698c28451ed3f5f5223df15b';

     var systemIds = (function () {
         var systemids = [];
         var i, library = "";
         for (i = 1; library !== null; i++) {
             library = GM_getValue("library" + i, null);
             if (library) {
                 systemids.push(library);
             }
         }
         return systemids;
     })();

     var systemNames = {};
     var counter = 0;
     systemIds.forEach(function(id) {
	     GM_xmlhttpRequest({
	         method:'GET', 
			 url: 'http://api.calil.jp/library?appkey='+appkey+'&format=json&systemid='+id,
			 onload:function(data){
                 var json = data.responseText.match(/callback\((.*?)\);$/);
			     data = JSON.parse(json[1]);
                 systemNames[id] = data[0].systemname;
                 counter++;
             }
		 });
     });

     function createInitialElement(isbn) {
         var html = '<div id="'+isbn+'" class="calilay">' +
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
     }

     var renderFunctions = {
         renderMediaMarker: function () {
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

	 renderDockushoMeterPre: function () {
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

         renderAmazonDetail: function () {
             var isbn = document.getElementById('ASIN').value;
             var isbnList = [isbn];
             $('form#handleBuy > table:last tr:last > td').append(createInitialElement(isbn));
             return isbnList;
         },
     
         renderAmazonWishlist: function () {
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

     function render() {
         var isbnList = renderFunctions[renderer]();
    
         if (isbnList) {
             var calil = new Calil({appkey: appkey,
							        render: new CalilRender('single'),
							        isbn: isbnList,
							        systemid: systemIds
                                   });

             calil.search();
         }
     }

     // Wait until all xmlhttprequests complete.
     var watchCounter = setInterval(function () {
         if (counter >= systemIds.length) {
             clearInterval(watchCounter);
             render();
             GM_addCSS('chrome://calilay/content/calilapi.css');
         }
     }, 20);

     // following lines are for using this extension with AutoPager.
     var previousTimer;
     document.addEventListener("AutoPagerAfterInsert", function (e) {
                                   clearTimeout(previousTimer);
                                   previousTimer = setTimeout(function() {
                                       render();
                                   }, 10);
                               }, false);
})();

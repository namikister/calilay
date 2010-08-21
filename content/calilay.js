/**
 * Calilay
 * 
 * Showing results of library searching using calil api.
 * Copyright Yuta Namiki
 * For any bug or suggestion contact namikister@gmail.com
 * Released under GPL 2.0
 * 
 */
(function () {
     var appkey = '0f316d2b698c28451ed3f5f5223df15b';

     var systemIds = (function () {
         var systemids = [];
         var i, library = "";
         for (i = 1; library !== null; i++) {
             library = GM_getValue("library" + i, null);
             if (library) {
                 systemids.unshift(library);
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
			     eval('var data = ' + json[1]);
                 systemNames[id] = data[0].systemname;
                 counter++;
             }
		 });
     });

     // Wait until all xmlhttprequests complete.
     var timer = setInterval(function () {
         if (counter >= systemIds.length) {
             clearInterval(timer);
             render();
         }
     }, 20);

     function render() {
         var isbnList = eval(renderer + '();');
         if (isbnList) {
             var calil = new Calil({appkey: appkey,
							        render: new CalilRender('single'),
							        isbn: isbnList,
							        systemid: systemIds
                                   });

             calil.search();

             GM_addCSS('chrome://calilay/content/calilapi.css');
         }
     }

     function renderMediaMarker() {
         var isbnList = [];
         $('.binder_data').each(function(i) {
             var url = $('a[href^="http://www.amazon.co.jp/"]:first', this).attr('href');
             if (url.match(/ASIN\/(\d+)/)) {
                 var isbn = RegExp.$1;
                 isbnList.push(isbn);
                 $(this).append(getInitialElement(isbn));
             }
         });
         return $.unique(isbnList);
     }

     function renderAmazonDetail() {
         if (!window.location.href.match(/\/[dg]p\/(\d{10})\//)) return null;
         var isbn = RegExp.$1;
         var isbnList = [isbn];
         $('#olpDivId').before(getInitialElement(isbn));
         return isbnList;
     }

     function renderAmazonWishlist() {
         var isbnList = [];
         $('tbody.itemWrapper').each(function(i) {
             if ($(this).attr('name').match(/\.(\d{10})/)) {
                 var isbn = RegExp.$1;
                 isbnList.push(isbn);
                 $(this).find('td.lineItemMainInfo:first').append(getInitialElement(isbn));
             }
         });
         return $.unique(isbnList);
     }

     function getInitialElement(isbn) {
         var html = '<div id="'+isbn+'">' +
                    systemIds.map(function(systemId) {
						return '<div id="'+systemId+'" class="calil_libsys">' +
							   '<div>' + systemNames[systemId] +
							   '<span class="calil_system_status">:検索中' +
							   '<img src="http://gae.calil.jp/public/img/run.gif">' +
							   '</span>' +
							   '</div>' +
							   '<div class="prefix"></div>' +
							   '</div>';
					}).join("") +
                    '<div class="calil_clear"></div></div>';
         return html;
     }     
})();

/**
* Calilay
* 
* Showing results of library searching using calil api.
* Copyright Yuta Namiki
* For any bug or suggestion contact namikister@gmail.com
* Version 0.1
* Released under GPL 2.0
* 
*/

(function () {
     var appkey = '0f316d2b698c28451ed3f5f5223df15b';
     var isbnList = [];
     var getSystemIds = function () {
         var systemids = [];
         var i, library = "";
         for (i = 1; library !== null; i++) {
             library = GM_getValue("library" + i, null);
             if (library) {
                 systemids.unshift(library);
             }
         }
         return systemids;
     };

     var systemIds = getSystemIds();
     var inner = "";
     systemIds.forEach(function(systemId) {
                           inner += '<div id="'+systemId+'"><div>'+systemId+'<span class="calil_system_status"></span></div><div class="prefix"></div></div>';
                       });

     $('.binder_data').each(function(i) {
         var url = $('a[href^="http://www.amazon.co.jp/"]:first', this).attr('href');
         if (url.match(/ASIN\/(\d+)/)) {
             var isbn = RegExp.$1;
             isbnList.push(isbn);
             $(this).append('<div id="'+isbn+'">'+inner+'</div>');
         }
     });
     isbnList = $.unique(isbnList);

     var calil = new Calil({appkey: appkey,
							render: new CalilRender('single'),
							isbn: isbnList,
							systemid: systemIds
                           });

     calil.search();

     GM_addCSS('chrome://calilay/content/calilapi.css');
})();

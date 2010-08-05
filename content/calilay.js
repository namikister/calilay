/**
* Calilay
* 
* Showing results of library searching using calil api.
* Copyright Yuta Namiki
* For any bug or suggestion contact namikister@gmail.com
* Version 0.1
* Released under GPL 3.0
* 
*/

(function () {
     var appkey = '0f316d2b698c28451ed3f5f5223df15b';
     var isbnList = [];
     $('.binder_data').each(function(i) {
         var url = $('a[href^="http://www.amazon.co.jp/"]:first', this).attr('href');
         if (url.match(/ASIN\/(\d+)/)) {
             var isbn = RegExp.$1;
             isbnList.push(isbn);
             $(this).append('<div id="'+isbn+'"></div>');
         }
     });
     isbnList = $.unique(isbnList);

     var systemids = [];
     var i, library = "";
     for (i = 1; library !== null; i++) {
         library = GM_getValue("library" + i, null);
         if (library) {
             systemids.push(library);
             alert(library);
         }
     }

     var calil = new Calil({appkey: appkey,
							render: new CalilRender(),
							isbn: isbnList,
							systemid: systemids
                           });

     calil.search();

     GM_addCSS('chrome://calilay/content/calilapi.css');
})();

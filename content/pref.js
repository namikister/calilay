var debug = Application.console.log;
var CalilayPrefWindow = {
    cityData: null,
    appkey: '0f316d2b698c28451ed3f5f5223df15b',
    ajaxGet: function (url, callback) {
        var req = new XMLHttpRequest();
        req.open('get', url, true);
        req.onreadystatechange = function(ev) {
            if (req.readyState == 4 && req.status == 200) {
                if (callback) {
                    callback(req.responseText);
                }
            }
        };
        req.send(null);
    },

    getPrefValue: function (index, key, defaultval) {
        var name = "extensions.calilay.library" + index + "." + key;
        var value = Application.prefs.getValue(name, defaultval);
        return value;
    },

    onLoad: function () {
        CalilayPrefWindow.ajaxGet("http://calil.jp/city_list", function (text) {
                         var json = text.match(/loadcity\((.*?)\);$/);
	                     eval('var data = ' + json[1]);
	                     CalilayPrefWindow.loadCity(data);
                     });

        var libraryList = document.getElementById("libraryList");

        for (var i = 1; i <= 5; i++) {
            if (CalilayPrefWindow.getPrefValue(i, "enable", false)) {
                var pref = CalilayPrefWindow.getPrefValue(i, "pref", "");
                var city = CalilayPrefWindow.getPrefValue(i, "city", "");
                var listitem = document.createElement("listitem");
                var prefCell = document.createElement("listcell");
                prefCell.setAttribute("label", pref);
                var cityCell = document.createElement("listcell");
                cityCell.setAttribute("label", city);
                listitem.appendChild(prefCell);
                listitem.appendChild(cityCell);
                libraryList.appendChild(listitem);
            }
        }
    },

    loadCity: function (data) {
        var pref;
        var prefSelect = document.getElementById("prefSelect");
        var newitem;
        for (pref in data) {
            newitem = document.createElement("menuitem");
            newitem.setAttribute("label", pref);
            prefSelect.menupopup.appendChild(newitem);
        }
        CalilayPrefWindow.cityData = data;
    },

    prefOnSelect: function () {
        var citySelect = document.getElementById("citySelect");
        var prefSelect = document.getElementById("prefSelect");
        var selectedItem = prefSelect.selectedItem;
        if (selectedItem) {
            citySelect.disabled = false;
            var cities = CalilayPrefWindow.cityData[prefSelect.selectedItem.label];
	        var yindex = "あ,か,さ,た,な,は,ま,や,ら,わ".split(",");
            yindex.forEach(function (y) {
                               if (cities[y]) {
                                   cities[y].forEach(function (city) {
                                                         var newitem = document.createElement("menuitem");
                                                         newitem.setAttribute("label", city);
                                                         citySelect.menupopup.appendChild(newitem);
                                                     });
                               }
                           });
            citySelect.focus();
        }
    },
    
    cityOnSelect: function () {
        var button = document.getElementById("addButton");
        button.focus();
    },

    addOnPush: function () {
        var citySelect = document.getElementById("citySelect");
        var prefSelect = document.getElementById("prefSelect");
	    var pref = prefSelect.selectedItem.label;
	    var city = citySelect.selectedItem.label;
	    pref = encodeURIComponent(pref);
	    city = encodeURIComponent(city);
	    var url = 'http://api.calil.jp/library?appkey='+CalilayPrefWindow.appkey+'&format=json&pref='+pref+'&city='+city;
        CalilayPrefWindow.ajaxGet(url, function (text) {
				         var json = text.match(/callback\((.*?)\);$/);
				         eval('var data = ' + json[1]);
				         CalilayPrefWindow.setLibrary(data, pref, city);
                     });
    },

    setLibrary: function (data, pref, city) {
        if(data.length > 0){
		    var systemids = data.map(function(elem){ return e.systemid; });
	    }else{
		    alert('図書館が見つかりませんでした。');
	    }
    }
};
window.addEventListener('load', CalilayPrefWindow.onLoad, false);
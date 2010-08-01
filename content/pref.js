var debug = Application.console.log;

var CalilayPrefWindow = {
    cityData: null,
    appkey: '0f316d2b698c28451ed3f5f5223df15b',
    maxNum: 5,
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

    setPrefValue: function (index, key, value) {
        var name = "extensions.calilay.library" + index + "." + key;
        Application.prefs.setValue(name, value);
    },

    onLoad: function () {
        CalilayPrefWindow.ajaxGet("http://calil.jp/city_list", function (text) {
                         var json = text.match(/loadcity\((.*?)\);$/);
	                     eval('var data = ' + json[1]);
	                     CalilayPrefWindow.loadCity(data);
                     });
        CalilayPrefWindow.refreshLibraryList();
    },

    loadCity: function (data) {
        var pref;
        var prefSelect = document.getElementById("prefSelect");
        var newitem;
        CalilayPrefWindow.removeChildren(prefSelect.menupopup);
        for (pref in data) {
            prefSelect.appendItem(pref, pref);
        }
        CalilayPrefWindow.cityData = data;
    },

    prefOnSelect: function () {
        var prefSelect   = document.getElementById("prefSelect");
        var citySelect   = document.getElementById("citySelect");
        var systemSelect = document.getElementById("systemSelect");

        var selectedItem = prefSelect.selectedItem;
        if (selectedItem) {
            citySelect.disabled = false;
            citySelect.selectedItem = null;
            systemSelect.selectedItem = null;
            document.getElementById("systemSelect").disabled = true;
            document.getElementById("addButton").disabled = true;
            var cities = CalilayPrefWindow.cityData[prefSelect.selectedItem.label];
	        var yindex = "あ,か,さ,た,な,は,ま,や,ら,わ".split(",");
            CalilayPrefWindow.removeChildren(citySelect.menupopup);
            yindex.forEach(function (y) {
                               if (cities[y]) {
                                   cities[y].forEach(function (city) {
                                                         citySelect.appendItem(city, city);
                                                     });
                               }
                           });
            citySelect.focus();
        }
    },
    
    cityOnSelect: function () {
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
				         setLibrary(data, pref, city);
                     });

        function setLibrary(data, pref, city) {
            if (data.length > 0) {
		        var systems = {};
                data.forEach(function(elem){
                                 if (typeof systems[elem.systemid] === 'undefined') {
                                     systems[elem.systemid] = elem.systemname;
                                 }
                             });
                var systemSelect = document.getElementById("systemSelect");
                CalilayPrefWindow.removeChildren(systemSelect.menupopup);
                systemSelect.disabled = false;
                systemSelect.selectedItem = null;
                var id;
                for (id in systems) {
                    systemSelect.appendItem(systems[id], id);
                }
	        } else {
		        alert('図書館が見つかりませんでした。');
	        }
        }
    },

    systemOnSelect: function (selected) {
        var button = document.getElementById("addButton");
        button.disabled = false;
        button.focus();
    },

    addOnPush: function () {
        var systemSelect = document.getElementById("systemSelect");
        var selectedItem = systemSelect.selectedItem;
        CalilayPrefWindow.addLibrary(selectedItem.value, selectedItem.label);
        CalilayPrefWindow.refreshLibraryList();
    },

    removeOnPush: function () {
        var libraryList = document.getElementById('libraryList');
        var item = libraryList.selectedItem;
        if (item === null) {
            alert("削除対象が選択されていません。");
        } else {
            CalilayPrefWindow.removeLibrary(item.value);
            libraryList.removeItemAt(libraryList.getIndexOfItem(item));
        }

    },

    librarySelected: function () {
        var removeButton = document.getElementById("removeButton");
        removeButton.disabled = false;
    },

    removeChildren: function (element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);   
        }
    },

    refreshLibraryList: function () {
        var libraryList = document.getElementById("libraryList");
        CalilayPrefWindow.removeChildren(libraryList);
        for (var i = 1; i <= CalilayPrefWindow.maxNum; i++) {
            if (CalilayPrefWindow.getPrefValue(i, "enable", false)) {
                var name = CalilayPrefWindow.getPrefValue(i, "name", "");
                var id =   CalilayPrefWindow.getPrefValue(i, "id", "");
                libraryList.appendItem(name, id);
            }
        }
    },

    removeLibrary: function (id) {
        for (var i = 1; i <= CalilayPrefWindow.maxNum; i++) {
            if (CalilayPrefWindow.getPrefValue(i, "enable", false) &&
                id === CalilayPrefWindow.getPrefValue(i, "id", "")) {
                CalilayPrefWindow.setPrefValue(i, "enable", false);
                break;
            }
        }

    },

    addLibrary: function (id, name) {
        var emptyIndex = 0;
        if (isDuplicate(id)) {
            alert("既に同じ図書館が登録されています。");
            return;
        }

        for (var i = 1; i <= CalilayPrefWindow.maxNum; i++) {
            if (!CalilayPrefWindow.getPrefValue(i, "enable", false)) {
                emptyIndex = i;
                break;
            }
        }
        if (emptyIndex) {
            CalilayPrefWindow.setPrefValue(i, "enable", true);
            CalilayPrefWindow.setPrefValue(i, "id", id);
            CalilayPrefWindow.setPrefValue(i, "name", name);
        } else {
            alert("これ以上図書館を追加できません。");
        }

        function isDuplicate(id) {
            for (var i = 1; i <= CalilayPrefWindow.maxNum; i++) {
                if (CalilayPrefWindow.getPrefValue(i, "enable", false) &&
                    id === CalilayPrefWindow.getPrefValue(i, "id", "")) {
                    return true;
                }       
            }
            return false;
        }
    }
};
window.addEventListener('load', CalilayPrefWindow.onLoad, false);
var debug = Application.console.log;

var CalilayPrefWindow = {
    cityData: null,
    prefectures: [
        '北海道', '青森県', '岩手県', '宮城県', '秋田県',
        '山形県', '福島県', '茨城県', '栃木県', '群馬県',
        '埼玉県', '千葉県', '東京都', '神奈川県', '新潟県',
        '富山県', '石川県', '福井県', '山梨県', '長野県',
        '岐阜県', '静岡県', '愛知県', '三重県', '滋賀県',
        '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
        '鳥取県', '島根県', '岡山県', '広島県', '山口県',
        '徳島県', '香川県', '愛媛県', '高知県', '福岡県',
        '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県',
        '鹿児島県', '沖縄県'
    ],
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

    onLoad: function () {
        var url = "http://calil.jp/city_list";
        CalilayPrefWindow.ajaxGet(url, function (text) {
                         var json = text.match(/loadcity\((.*?)\);$/);
	                     var data = JSON.parse(json[1]);
	                     loadCity(data);
                     });
        CalilayPrefWindow.refreshLibraryList();

        function loadCity(data) {
            var pref;
            var prefSelect = document.getElementById("prefSelect");
            var newitem;
            CalilayPrefWindow.removeOptions(prefSelect.menupopup);
            CalilayPrefWindow.prefectures.forEach(function (pref) {
                prefSelect.appendItem(pref, pref);
            });
            CalilayPrefWindow.cityData = data;
            // prefSelect.selectedIndex = 0;
            // CalilayPrefWindow.prefOnSelect();
        };
    },

    prefOnSelect: function () {
        var prefSelect   = document.getElementById("prefSelect");
        var citySelect   = document.getElementById("citySelect");
        var systemSelect = document.getElementById("systemSelect");

        var selectedItem = prefSelect.selectedItem;
        if (selectedItem) {
            citySelect.selectedItem = null;
            systemSelect.selectedItem = null;
            var cities = CalilayPrefWindow.cityData[prefSelect.selectedItem.label];
	        var yindex = "あ,か,さ,た,な,は,ま,や,ら,わ".split(",");
            CalilayPrefWindow.removeOptions(citySelect.menupopup);
            yindex.forEach(function (y) {
                if (cities[y]) {
                    cities[y].forEach(function (city) {
                        citySelect.appendItem(city, city);
                    });
                }
            });
            // citySelect.selectedIndex = 0;
            // CalilayPrefWindow.cityOnSelect();
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
				         var data = JSON.parse(json[1]);
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
                CalilayPrefWindow.removeOptions(systemSelect.menupopup);
                systemSelect.selectedItem = null;
                var id;
                for (id in systems) {
                    systemSelect.appendItem(systems[id], id);
                }
                systemSelect.selectedIndex = 0;
                CalilayPrefWindow.systemOnSelect();
	        } else {
		        alert('図書館が見つかりませんでした。');
	        }
        }
    },

    systemOnSelect: function (selected) {
        var button = document.getElementById("addButton");
        button.focus();
    },

    addOnPush: function () {
        var systemSelect = document.getElementById("systemSelect");
        var selectedItem = systemSelect.selectedItem;
        var libraryList = document.getElementById("libraryList");
        var nodes = libraryList.childNodes;
        var i, library, len = nodes.length;

        for (i = 0; i < len; i++) {
            library = CalilayPrefWindow.getPrefValue(nodes.item(i));
            if (library) {
                if (library === selectedItem.value) {
                    alert("既に同じ図書館が登録されています。");
                    break;
                }
            } else {
                CalilayPrefWindow.setPrefValue(nodes.item(i), selectedItem.value);
                nodes.item(i).label = selectedItem.label;
                break;
            }
        }
        if (i === len ) alert("これ以上図書館を追加できません。");
    },

    removeOnPush: function () {
        var libraryList = document.getElementById('libraryList');
        var node = libraryList.selectedItem;
        if (node === null || node.label === "") {
            alert("削除対象が選択されていません。");
        } else {
            for (; node !== null; node = node.nextSibling) {
                if (node.nextSibling) {
                    CalilayPrefWindow.setPrefValue(node, CalilayPrefWindow.getPrefValue(node.nextSibling));
                    CalilayPrefWindow.setPrefValue(node.nextSibling, "");
                    node.label = node.nextSibling.label;
                    node.nextSibling.label = "";
                }
                else {
                    CalilayPrefWindow.setPrefValue(node, "");
                    node.label = "";
                }
            }
        }
    },

    librarySelected: function () {
        var removeButton = document.getElementById("removeButton");
        removeButton.disabled = false;
    },

    removeOptions: function (element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);   
        }
    },

    refreshLibraryList: function () {
        var libraryList = document.getElementById("libraryList");
        var i, id, pref;
        var nodes = libraryList.childNodes;
        var len = nodes.length;
        for (i = 0; i < len; i++){
            id = CalilayPrefWindow.getPrefValue(nodes.item(i));
            if (id) {
				setSystemName(id, nodes.item(i));
            }
        }

        function setSystemName(id, elem) {
	        var url = 'http://api.calil.jp/library?appkey='+CalilayPrefWindow.appkey+'&format=json&systemid='+id;
            CalilayPrefWindow.ajaxGet(url, function (text) {
				var json = text.match(/callback\((.*?)\);$/);
				var data = JSON.parse(json[1]);
                elem.label = data[0].systemname;
            });
        };
    },

    getPrefValue: function (elem) {
        var prefId = elem.getAttribute("preference");
        return document.getElementById(prefId).value;
    },

    setPrefValue: function (elem, value) {
        var prefId = elem.getAttribute("preference");
        document.getElementById(prefId).value = value;
    }
};
window.addEventListener('load', CalilayPrefWindow.onLoad, false);
(function() {
    var cityData = null;
    var prefectures = [
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
    ];
    var appkey = '0f316d2b698c28451ed3f5f5223df15b';

    var saveLibraries = function(libraries) {
        browser.storage.local.set({
            libraries: libraries
        });
    };

    var loadLibraries = function(process) {
        function onError(error) {
            console.log(`Error: ${error}`);
        }
        function onGot(item) {
            process(item.libraries || []);
        }
        browser.storage.local.get("libraries").then(onGot, onError);
    };

    $(document).ready(function() {
        $("select").not("#libraryList").attr("disabled", true);
        $("button").attr("disabled", true);

        $("#prefSelect").append(
            prefectures.map(function (pref) {
                return new Option(pref, pref);
            })
        );

        $.get("https://calil.jp/city_list", function (text) {
            var json = text.match(/loadcity\((.*?)\);/);
            var data = JSON.parse(json[1]);
            cityData = data;
            $("#prefSelect")
            .attr("disabled", false)
            .focus();
        }, "text").error(function(jqXHR, textStatus) {
            alert('市町村の取得に失敗しました。:' + textStatus);
        });

        loadLibraries(function(libraries) {
            $("#libraryList").append(
                libraries.map(function(library) {
                    return new Option(library.name, library.id);
                })
            );
        });
    });

    $("#prefSelect").change(function() {
        var $prefSelect   = $(this),
            cities = cityData[$prefSelect.val()],
            yindex = "あ,か,さ,た,な,は,ま,や,ら,わ".split(","),
            options = [];

        $("#systemSelect").val("").attr("disabled", true);
        $("#addLibrary").attr("disabled", true);

        yindex.forEach(function(y) {
            if (cities[y] === undefined) return;
            options = options.concat(cities[y].map(function (city) {
                                         return new Option(city, city);
                                     }));
        });

        $("#citySelect")
        .find("option").not(":first").remove().end().end()
        .append(options)
        .val("")
        .attr("disabled", false)
        .focus();
    });

    $("#citySelect").change(function() {
        var $citySelect = $(this),
            $prefSelect = $("#prefSelect"),
            $systemSelect = $("#systemSelect"),
            $addLibrary = $("#addLibrary"),
            $loading =  $("#loading");

        $prefSelect.attr("disabled", true);
        $citySelect.attr("disabled", true);
        $systemSelect.attr("disabled", true).val("");
        $addLibrary.attr("disabled", true).val("");
        $loading.addClass("show");

        $.ajax({
            url: 'https://api.calil.jp/library',
            data: {
                appkey: appkey,
                format: "json",
                pref: $prefSelect.val(),
                city: $citySelect.val()
            },
            dataType: "text"
        }).success(function(text) {
            var json = text.match(/callback\((.*?)\);/);
            var data = JSON.parse(json[1]);
            var options, systems = [];

            if (data.length <= 0) {
                alert('図書館が見つかりませんでした。');
                return;
            }

            options = data.filter(function(elem){
                          var id = elem.systemid;
                          if (systems.indexOf(id) < 0) {
                              systems.push(id);
                              return true;
                          }
                          else {
                              return false;
                          }
                      }).map(function(elem) {
                          return new Option(elem.systemname, elem.systemid);
                      });

            $systemSelect
            .find("option").not(":first").remove().end().end()
            .append(options)
            .val("")
            .attr("disabled", false)
            .focus();
        }).error(function(jqXHR, textStatus) {
            alert('図書館の取得に失敗しました。:' + textStatus);
        }).complete(function() {
            $prefSelect.attr("disabled", false);
            $citySelect.attr("disabled", false);
            $loading.removeClass("show");
        });
    });

    $("#systemSelect").change(function() {
        $("#addLibrary")
        .attr("disabled", false)
        .focus();
    });

    $("#libraryList").change(function() {
        if ($(this).children("option:selected").length > 0) {
            $("#removeLibrary").attr("disabled", false);
        }
    });

    $("#addLibrary").click(function() {
        var $libraryList = $("#libraryList"),
            $selected = $("#systemSelect option:selected"),
            library = {
                name: $selected.text(),
                id: $selected.val()
            };
        loadLibraries(function(libraries) {
            if (libraries.some(function(elem) {return (elem.id === library.id);})) {
                alert("既に同じ図書館が登録されています。");
            }
            else if (libraries.length > $libraryList.attr("size")) {
                alert("これ以上図書館を追加できません。");
            }
            else {
                $libraryList.append(new Option(library.name, library.id));
                libraries.push(library);
                saveLibraries(libraries);
            }
        });
    });

    $("#removeLibrary").click(function() {
        var $selected = $("#libraryList option:selected"),
            id = $selected.val();
        $selected.remove();
        loadLibraries(function(libraries) {
            saveLibraries(libraries.filter(function(elem) {
                              return elem.id !== id;
                          }));
        });
        $("#removeLibrary").attr("disabled", true);
    });
})();
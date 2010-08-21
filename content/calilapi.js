function Calil() {
	this.initialize.apply(this, arguments);
}

Calil.prototype = {
	initialize: function(options) {

			this.api_timeout_timer = 0;
			this.api_call_count = 0;
			this.data_cache = '';

			this.render = options.render || false;
			this.systemid_list  = [];
			this.isbn_list = [];
			var self = this;

			this.appkey = options.appkey || false;
			if(this.appkey == false){
				alert('please set app key');
				return;
			}
			if(options.isbn){
				if($.isArray(options.isbn)){
					$(options.isbn).each(function(i, isbn){
						self.add_isbn(isbn);
					});
				}else if(typeof options.isbn == 'string'){
					this.add_isbn(options.isbn);
				}
			}else{
				alert('please set isbn');
				return;
			}
			if(options.systemid){
				if($.isArray(options.systemid)){
					$(options.systemid).each(function(i, systemid){
						self.add_systemid(systemid);
					});
				}else if(typeof options.systemid == 'string'){
					this.add_systemid(options.systemid)
				}
			}else{
				alert('please set systemid');
				return;
			}
	},
	add_systemid : function(sytemid) {
		this.systemid_list.push(sytemid);
	},
	add_isbn : function(isbn) {
		this.isbn_list.push(isbn);
		$("#"+isbn).attr("status","");
	},
	search : function() {
		var domain = "http://api.calil.jp";
		var apiurl = domain + "/check?appkey="+this.appkey+"&systemid="+ this.systemid_list.join(',') +"&isbn="+ this.isbn_list.join(',');
		this.call_api(apiurl);

		if(this.render){
			this.render.start_render_books(this.isbn_list, this.systemid_list);
		}
 	},
	call_api : function(url) {
		var self = this;
		if(typeof GM_xmlhttpRequest == 'function'){
			GM_xmlhttpRequest({
				method:'GET', 
				url:url,
				onload:function(data){
					var json = data.responseText.match(/callback\((.*?)\)/);
					eval('var data = ' + json[1]);
					self.callback(data);
				}
			});
		}else{
			$.ajax({
					url: url,
					dataType: "jsonp",
					success:function(data){
							self.callback(data);
					},
					error:function(){
							alert('error');
					}
			});
		}
		clearTimeout(this.api_timeout_timer);
		this.api_timeout_timer = setTimeout(function(){
			self.api_timeout();
		},10000);
	},
	callback : function(data){
		var session = data['session'];
		var conti = data['continue'];
		this.data_cache = data;

		clearTimeout(this.api_timeout_timer);

		if (conti == 1){
			this.api_call_count++;
			var seconds = (this.api_call_count < 3) ? 1000 : 2000;
			if (this.api_call_count > 7){
				seconds = 5000;
			}
			var newurl = "http://api.calil.jp/check?appkey="+this.appkey+"&session=" + session;
			var self = this;
			setTimeout(function(){
				self.call_api(newurl);
			},seconds);
		}
        else {
            this.api_timeout();
        }

		if(this.render){
			this.render.render_books(data);
		}
	},
	api_timeout : function(){
		if(this.render){
			this.render.timeoutSearchProgress();
		}
	}
};

function CalilRender() {
	this.set_mode.apply(this, arguments);
}

CalilRender.prototype =  {
	render_mode : 'list',
	filter_system_id : 'all',
	filter_libkey : '',
	target : '',
	
	set_mode : function(mode){
		this.render_mode = mode || 'list';
	},
	
	set_target : function(name){
		this.target = name;
	},

	showSearchProgress : function(){
		//適切な数の検索途中結果だけ表示する
		//常に３つだけにする
		var i = 0;
		$(".calil_searching").each(function(){
			$(this).show();
			if (i >= 2){
				return false;
			}
			i++;
		});
	},
	timeoutSearchProgress : function(){
		//タイムアウト結果を表示する
		var i = 0;
		if (this.render_mode == 'single'){
			$(".calil_system_status").each(function(){
				$(this).html('：タイムアウト');
			});
		}else if (this.render_mode == 'list'){
			$(".calil_searching").each(function(){
				$(this).css('background-image','url()');
				$(this).html('タイムアウト');
				$(this).show();
				if (i >= 2){
					return false;
				}
				i++;
			});
		}else{
			$(".calil_searching").each(function(){
				$(this).html('T')
				$(this).show();
				if (i >= 2){
					return false;
				}
				i++;
			});
		
		}
	},
	start_render_books : function(isbn_list, systemid_list){
        if (this.render_mode == 'list'){
		    this.systemid_list = systemid_list;
		    for (var i in isbn_list){
			    this.init_abstract(isbn_list[i]);
		    }
        }
	},
	render_books : function(data){
		this.conti = data['continue'];
		var isbn;
		var systemid;

		for (isbn in data.books){
			var csc = this.get_complete_systemid_count(data.books[isbn]);
			for (systemid in data.books[isbn]){
				if (this.filter_system_id == 'all' || this.filter_system_id == systemid){
                    switch (this.render_mode) {
                    case 'single':
                        this.render_detail(isbn,systemid,data.books[isbn][systemid]);
                        break;
                    case 'list':
					    var conti = (csc < this.systemid_list.length);
					    this.render_abstract(isbn,systemid,data.books[isbn][systemid], conti);
                        break;
                    }
				}
			}
		}
	},
	get_complete_systemid_count : function(data){
		var count = 0;
		var systemid = '';
		for (systemid in data){
			if (data[systemid]["status"] != "Running"){
				count++;
			}
		}
		return count;
			
	},
	get_color : function(status){
		var status_color = {
			"貸出可":"#339AFC",
			"蔵書あり":"#5CC00F",
			"館内のみ":"#EC6A8C",
			"貸出中":"#F29327",
			"予約中":"#F29327",
			"準備中":"#F29327",
			"休館中":"#F29327"
		};
		
		if (status_color[status]){
			return status_color[status];
		}
		
		return "";
	
	},
	get_rank : function(status){
		var srank = {
			"貸出可":"100",
			"蔵書あり":"90",
			"館内のみ":"80",
			"貸出中":"70",
			"準備中":"60",
			"予約中":"50",
			"蔵書なし":"40" /*ここから下が不合格*/
		};
		
		if (srank[status]){
			return parseInt(srank[status]);
		}else if( status != undefined && status != ''){
			return 10;
		}

		return 0;
	},
	init_abstract : function(isbn){
		$("#"+isbn).html('<div class="calil_searching">検索中</div>');
	},

	render_detail : function(isbn,systemid,data){
		if (data.status == 'Running'){
			return;
		}
		if (data.status == 'Error'){
			if ($("#"+isbn) &&
                $("#"+systemid+" .calil_system_status").html() === ":検索中") {
				$("#"+systemid+" .calil_system_status").html("：検索失敗");
				this.showSearchProgress();
			}
			return;
		}
		
		var text = "";
		var total_status = '蔵書なし';
		for (var i in data.libkey) {
		
			var status = data.libkey[i];
			var color = "red";
			var bgcolor = "#AAAAAA";
			var temp = this.get_color(status);
			if (temp != ""){
				color= "white";
				bgcolor = temp;
			}
			if (status != "蔵書なし"){
				total_status = "蔵書あり";
			}
			text += '<div class="calil_libname" style="color:'+ color + '; background-color:'+bgcolor+';">';
			text += '<a href="http://api.calil.jp/library/search?s='+systemid+'&k='+encodeURIComponent(i)+'">' + i + '</a>';
			text += '<div class="calil_status">';
			text += status;
			text += '</div>';
			text += '</div>';
		}

		if (data.reserveurl != "" && total_status != "蔵書なし"){
			text += '<div class="calil_reserve">';
			text += '<a href="'+data.reserveurl+'" target="_blank">予約する</a>';
			text += '</div>';
		}

		if ($("#"+isbn)){
			$("#"+isbn).find("#"+systemid+" .calil_system_status").html("："+total_status);
			$("#"+isbn).find("#"+systemid+"> .prefix").html(text);
		}
	},

	render_abstract : function (isbn,systemid,data, conti){
		var text = "";
		var status = '蔵書なし';
		var status_show = status;
		var status_rank = 0;
		
		//優先表示するステータスを取得
		for (var i in data.libkey) {
			if (this.filter_libkey == '' || this.filter_libkey == i){
				//状況をまとめる
				var temp = data.libkey[i];
				if (this.get_rank(temp) > status_rank){
					status = temp;
					status_show = status;
					status_rank = this.get_rank(temp);
				}
			}
		}
		//システムエラー
		if (data.status == 'Error'){
			status = 'システムエラー';
			status_show = status;
		}

		var style = this.render_status(status);
		var link = 'http://calil.jp/book/' + isbn;
		text += '<div style="white-space:nowrap;">';
		text += '<a href="'+link+'" class="calil_status '+style.css+'">'+ style.status + '</a></div>';

		//検索の途中であれば40点以下は表示しない
		if ((data.status == 'Running' || conti) && this.get_rank(status) <= 40){
			return;
		}
		
	//	log(" filter_system_id: " + this.filter_system_id);
		
		if ($("#"+isbn)){
			var before_s = $("#"+isbn).attr("status");
			var isup =  ((this.filter_system_id != 'all') || 
					(this.get_rank(status) > this.get_rank(before_s)));
	//		log("before: " + before_s + " and after: " + status + ":" + isup);
			if (isup){
				if (data.reserveurl != ""){
					text += '<div style="clear:both">';
					text += '<a href="'+data.reserveurl+'" target="_blank"><img border="0" src="http://gyazo.com/2064f557b8c17c879558165b0020ff5e.png"></a>';
					text += '</div>';
				}
				$("#"+isbn).html(text);
				$("#"+isbn).attr("status",status);
				this.showSearchProgress();
			}
		}
	},
	render_status : function(status){
			var style ={
				raw_status : status,
				status : status,
				total_status : '蔵書なし',
				color : "red",
				bgcolor : "",
				css : 'calil_nothing'
			};
			with(style){
				if (status == "貸出可"){
					status = "蔵書あり(貸出可)";
					total_status = "蔵書あり";
					color = "white";
					bgcolor = "#339AFC";
					css = 'calil_nijumaru';
				}
				if (status == "蔵書あり"){
					total_status = "蔵書あり";
					color= "white";
					bgcolor = "#5CC00F";
					css = 'calil_maru';
				}
				if (status == "館内のみ"){
					status = "蔵書あり(館内のみ)";
					total_status = "蔵書あり";
					color= "white";
					bgcolor = "#EC6A8C";
					css = 'calil_marukannai';
				}
				if (status == "準備中"){
					status = "蔵書あり(準備中)";
					color= "white";
					bgcolor = "#F29327";
					css = 'calil_sankaku';
				}
				if (status == "貸出中"){
					status = "蔵書あり(貸出中)";
					total_status = "蔵書あり";
					color= "white";
					bgcolor = "#F29327";
					css = 'calil_sankaku';
				}
				if (status == "予約中"){
					status = "蔵書あり(予約中)";
					color= "white";
					bgcolor = "#F29327";
					css = 'calil_sankaku';
				}
				if (status == "休館中"){
					status = "蔵書あり(休館中)";
					total_status = "蔵書あり";
					color= "white";
					bgcolor = "#F29327";
					css = 'calil_sankaku';
				}
			}
			return style;
	}
};

function CalilCitySelectDlg() {
	this.initialize.apply(this, arguments);
}

CalilCitySelectDlg.prototype = {

	pref_name : '',
	pref_data : false, 

	initialize: function(options){
		this.appkey = options.appkey || false;
		if(this.appkey == false){
			alert('please set app key');
			return;
		}
		this.getstart = options.getstart || false;
		$(document.body).append(this.dialog_html);
		this.placeDialog = $(options.placeDialog || '#calil_place_dialog');
		this.placeDialogWrapper = $(options.placeDialogWrapper || '#calil_place_dialog_wrapper');
		if(typeof options.select_func != 'function'){
			alert('Please set function');
			return;
		}
		this.selectFunc = options.select_func || false;
		var self = this;
		$('.calil_place_dialog_close').click(function(){
			self.closeDlg();
		});
		$('#calil_pref_selector a').each(function(i, e){
			var temp = $(e).attr('href').split('/');
			var pref = temp[temp.length-1];
			$(e).attr('href', 'javascript:void(0)').click(function(){
				self.load_pref(pref);
			});
		});
		$('.calil_hide_city').click(this.hidecity);
		$(window).resize(function(){
			self.placeDialogWrapper.css("height", $(window).height());
			self.placeDialogWrapper.css("width", $(window).width());
			self.placeDialog.css("top",($(window).height()-self.placeDialog.height())/2+$(window).scrollTop() + 'px');
			self.placeDialog.css("left",($(window).width()-self.placeDialog.width())/2+$(window).scrollLeft() + 'px');
		});
		if(this.getstart == true){
			var self = this;
			setTimeout(function(){
				self.showDlg();
			}, 1000);
		}
	},
	showDlg : function(){
		var self = this;
		this.placeDialogWrapper.show();
		this.placeDialog.show("fast", function(){
			self.placeDialogWrapper.css("height", $(window).height());
			self.placeDialogWrapper.css("width", $(window).width());
			self.placeDialog.css("top",($(window).height()-self.placeDialog.height())/2+$(window).scrollTop() + 'px');
			self.placeDialog.css("left",($(window).width()-self.placeDialog.width())/2+$(window).scrollLeft() + 'px');
		});
		if ($.browser.msie && $.browser.version <= 6){
			$("select").hide();
		}
	},
	
	closeDlg : function(){
		this.placeDialog.hide("fast");
		this.placeDialogWrapper.hide();
		this.hidecity();
		if ($.browser.msie && $.browser.version <= 6){
			$("select").show();
		}
	},
	load_pref : function(pref){
		this.pref_name = pref;
	
		if (this.pref_data != false){
			this.expand_city();
			return;
		}
		var url = "http://calil.jp/city_list";
		var self = this;
		if(typeof GM_xmlhttpRequest == 'function'){
			GM_xmlhttpRequest({
				method:'GET', 
				url:url,
				onload:function(data){
					var json = data.responseText.match(/loadcity\((.*?)\);$/);
					eval('var data = ' + json[1]);
					self.loadcity(data);
				}
			});
		}else{
			$.ajax({
					url: url,
					dataType: "jsonp",
					success:function(data){
							self.loadcity(data);
					},
					error:function(){
							alert('error');
					}
			});	
		}
	},
	loadcity : function(data){
		this.pref_data = data;
		this.expand_city();
	},
	expand_city : function(){
		var cities = this.pref_data[this.pref_name];
		var html = '<div class="calil_city_list">';
		var yindex = "あ,か,さ,た,な,は,ま,や,ら,わ".split(",");
		for (var i=0; i<yindex.length;i++){
			var y = yindex[i];
			if (cities[y]){
				html += '<div class="calil_yomi_block"></div>';
				html += '<div class="calil_yomi">' + y + '</div>';
				html += '<div class="calil_cities">';
				var city = '';
				for (city in cities[y]){
					html += '<a class="calil_city_part" href="'+this.pref_name+','+cities[y][city]+'">' + cities[y][city] + '</a>';
				}
				html += '</div>';
			}
		}
		html += '</div>';
		$("#calil_city_selector").show();
		$("#calil_pref_selector").hide();
		$("#calil_city_selector .calil_pref_list").html(html);
		var self = this;
		$("#calil_city_selector .calil_pref_list a").each(function(i, e){
			var temp = $(e).attr('href').split('/');
			var pref = temp[temp.length-1];
			$(e).attr('href', 'javascript:void(0)').click(function(){
				self.get_systemid(pref);
			});
		});
	
	},
	hidecity : function(){
		$("#calil_pref_selector").show();
		$("#calil_city_selector").hide();
	},
	get_systemid : function(raw_pref){
		this.closeDlg();
		var temp = raw_pref.split(',');
		raw_pref = raw_pref.split(',').join('');
		var pref = temp[0];
		var city = temp[1];
		pref = encodeURIComponent(pref);
		city = encodeURIComponent(city);
		var url = 'http://api.calil.jp/library?appkey='+this.appkey+'&format=json&pref='+pref+'&city='+city;
		var self = this;
		if(typeof GM_xmlhttpRequest == 'function'){
			GM_xmlhttpRequest({
				method:'GET', 
				url:url,
				onload:function(data){
					var json = data.responseText.match(/callback\((.*?)\);$/);
					eval('var data = ' + json[1]);
					self.set_systemid(data, raw_pref);
				}
			});
		}else{
			$.ajax({
					url: url,
					dataType: "jsonp",
					success:function(data){
							self.set_systemid(data, raw_pref);
					},
					error:function(){
							alert('error');
					}
			});	
		}
	},
	set_systemid : function(data, pref){
		if(data.length > 0){
			var systemid_list = [];
			$(data).each(function(i, e){
				systemid_list.push(e.systemid);
			});
			systemid_list = this.uniq(systemid_list);
			this.selectFunc.apply(this, [systemid_list, pref]);
		}else{
			alert('図書館が見つかりませんでした。');
		}
	},
	uniq : function(arr) {
		var o = {},
		r = [];
		for (var i = 0;i < arr.length;i++)
			if (arr[i] in o? false: o[arr[i]] = true)
				r.push(arr[i]);
		return r;
	},
	dialog_html : [
'<div id="calil_place_dialog_wrapper">',
'<div id="calil_place_dialog">',
'	<div class="calil_dlg_content">',
'		<div style="float:right;font-size:140%;"><a href="javascript:void(0)" class="calil_place_dialog_close">[×]</a></div>',
'		<h3>図書館のエリアを選んでください。</h3>',
'		<div id = "calil_city_selector" style="display:none;">',
'		<a href="javascript:void(0)" class="calil_hide_city">« 戻る</a>',
'		<div class="calil_pref_list">&nbsp;</div>',
'		</div>',
'',
'<table cellspacing="0" cellpadding="6" id="calil_pref_selector">',
'<tr>',
'<td>',
'',
'<table width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;line-height:140%;">',
'<tr valign="top">',
'<td>',
'',
'</td>',
'<td align="right">',
'',
'',
'<table cellspacing="1" cellpadding="0">',
'<tr height="40" style="font-size:10px;text-align:center;">',
'<td></td>',
'<td bgcolor="#8888ff" width="50">',
'<a href="北海道">北海道</a>',
'</td>',
'</tr>',
'',
'<tr>',
'<td height="10"></td>',
'</tr>',
'</table>',
'',
'<table cellspacing="1" cellpadding="0" style="font-size:10px;text-align:center;margin-bottom:-1;">',
'<tr height="25">',
'<td></td><td></td><td></td><td width="30"></td>',
'<td bgcolor="#99ddff" width="30">',
'<a href="青森県">青森</a>',
'</td>',
'<td width="20"></td>',
'</tr>',
'',
'<tr height="40">',
'<td></td><td></td><td width="30"></td>',
'<td bgcolor="#99ddff" width="30">',
'<a href="秋田県">秋田</a>',
'</td>',
'<td bgcolor="#99ddff">',
'<a href="岩手県">岩手</a>',
'</td>',
'</tr>',
'',
'<tr height="35">',
'<td></td><td></td><td></td>',
'<td bgcolor="#99ddff" width="30">',
'<a href="山形県">山形</a>',
'</td>',
'<td bgcolor="#99ddff">',
'<a href="宮城県">宮城</a>',
'</td>',
'</tr>',
'',
'<tr height="25">',
'<td bgcolor="#ccf577" width="30">',
'<a href="石川県">石川</a>',
'</td>',
'<td bgcolor="#ccf577" width="30">',
'<a href="富山県">富山</a>',
'</td>',
'<td bgcolor="#ccaaff" width="60" colspan="2">',
'<a href="新潟県">新潟</a>',
'</td>',
'<td bgcolor="#99ddff" width="30">',
'<a href="福島県">福島</a>',
'</td>',
'</tr>',
'</table>',
'',
'</td>',
'</tr>',
'</table>',
'',
'<table cellspacing="1" cellpadding="0" style="font-size:10px;text-align:center;border-style:none;">',
'<tr height="25">',
'<td bgcolor="#f5e577" width="26">',
'<a href="長崎県">長崎</a>',
'</td>',
'<td bgcolor="#f5e577" width="26">',
'<a href="佐賀県">佐賀</a>',
'</td>',
'<td bgcolor="#f5e577" width="26">',
'<a href="福岡県">福岡</a>',
'</td>',
'<td width="10"></td>',
'<td bgcolor="#ff88bb" width="26" rowspan="2">',
'<a href="山口県">山口</a>',
'</td>',
'<td bgcolor="#ff88bb" width="26">',
'<a href="島根県">島根</a>',
'</td>',
'<td bgcolor="#ff88bb" width="26">',
'<a href="鳥取県">鳥取</a>',
'</td>',
'<td bgcolor="#80f580" width="26" rowspan="2">',
'<a href="兵庫県">兵庫</a>',
'</td>',
'<td bgcolor="#80f580" width="30">',
'<a href="京都府">京都</a>',
'</td>',
'<td bgcolor="#80f580" width="26">',
'<a href="滋賀県">滋賀</a>',
'</td>',
'<td bgcolor="#ccf577" width="30">',
'<a href="福井県">福井</a>',
'</td>',
'<td bgcolor="#ccaaff" width="30" rowspan="2">',
'<a href="長野県">長野</a>',
'</td>',
'<td bgcolor="#ff99ff" width="30">',
'<a href="群馬県">群馬</a>',
'</td>',
'<td bgcolor="#ff99ff" width="30">',
'<a href="栃木県">栃木</a>',
'</td>',
'<td bgcolor="#ff99ff" width="30">',
'<a href="茨城県">茨城</a>',
'</td>',
'<td width="20"></td>',
'</tr>',
'',
'<tr height="25">',
'<td></td>',
'<td bgcolor="#f5e577">',
'<a href="熊本県">熊本</a>',
'</td>',
'<td bgcolor="#f5e577">',
'<a href="大分県">大分</a>',
'</td>',
'<td></td>',
'<td bgcolor="#ff88bb">',
'<a href="広島県">広島</a>',
'</td>',
'<td bgcolor="#ff88bb">',
'<a href="岡山県">岡山</a>',
'</td>',
'<td bgcolor="#80f580">',
'<a href="大阪府">大阪</a>',
'</td>',
'<td bgcolor="#80f580">',
'<a href="奈良県">奈良</a>',
'</td>',
'<td bgcolor="#ffcc88">',
'<a href="岐阜県">岐阜</a>',
'</td>',
'<td bgcolor="#ff99ff">',
'<a href="山梨県">山梨</a>',
'</td>',
'<td bgcolor="#ff99ff">',
'<a href="埼玉県">埼玉</a>',
'</td>',
'<td bgcolor="#ff99ff">',
'<a href="千葉県">千葉</a>',
'</td>',
'</tr>',
'',
'<tr height="24">',
'<td></td>',
'<td bgcolor="#f5e577">',
'<a href="鹿児島県">鹿児島</a>',
'</td>',
'<td bgcolor="#f5e577">',
'<a href="宮崎県">宮崎</a>',
'</td>',
'<td></td><td></td><td></td><td></td><td></td>',
'<td bgcolor="#80f580">',
'<a href="和歌山県">和歌山</a>',
'</td>',
'<td bgcolor="#ffcc88">',
'<a href="三重県">三重</a>',
'</td>',
'<td bgcolor="#ffcc88">',
'<a href="愛知県">愛知</a>',
'</td>',
'<td bgcolor="#ffcc88">',
'<a href="静岡県">静岡</a>',
'</td>',
'<td bgcolor="#ff99ff">',
'<a href="神奈川県">神奈川</a>',
'</td>',
'<td bgcolor="#ff99ff">',
'<a href="東京都">東京</a>',
'</td>',
'</tr>',
'',
'<tr height="20">',
'<td></td><td></td><td></td><td></td><td></td>',
'<td bgcolor="#ddbb99">',
'<a href="愛媛県">愛媛</a>',
'</td>',
'<td bgcolor="#ddbb99">',
'<a href="香川県">香川</a>',
'</td>',
'</tr><tr height="20">',
'<td bgcolor="#ff8888">',
'<a href="沖縄県">沖縄</a>',
'</td>',
'<td></td><td></td><td></td><td></td>',
'<td bgcolor="#ddbb99">',
'<a href="高知県">高知</a>',
'</td>',
'<td bgcolor="#ddbb99">',
'<a href="徳島県">徳島</a>',
'</td>',
'</tr>',
'</table>',
'',
'</td>',
'</tr>',
'</table>',
'',
'</div>',
'</div>',
'</div>'
	].join('')
};


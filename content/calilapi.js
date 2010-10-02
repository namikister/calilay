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
					data = JSON.parse(json[1]);
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
                if ($(this).text() === ":検索中") {
			        $(this).html('：タイムアウト');
                }
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
                $("#"+systemid+" .calil_system_status").text() === ":検索中") {
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
			text += '<a href="http://calil.jp/library/search?s='+systemid+'&k='+encodeURIComponent(i)+'">' + i + '</a>';
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

var calilay_gmCompiler={

// getUrlContents adapted from Greasemonkey Compiler
// http://www.letitblog.com/code/python/greasemonkey.py.txt
// used under GPL permission
//
// most everything else below based heavily off of Greasemonkey
// http://greasemonkey.devjavu.com/
// used under GPL permission

getUrlContents: function(aUrl){
	var	ioService=Components.classes["@mozilla.org/network/io-service;1"]
		.getService(Components.interfaces.nsIIOService);
	var	scriptableStream=Components
		.classes["@mozilla.org/scriptableinputstream;1"]
		.getService(Components.interfaces.nsIScriptableInputStream);
	var unicodeConverter=Components
		.classes["@mozilla.org/intl/scriptableunicodeconverter"]
		.createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
	unicodeConverter.charset="UTF-8";

	var	channel=ioService.newChannel(aUrl, "UTF-8", null);
	var	input=channel.open();
	scriptableStream.init(input);
	var	str=scriptableStream.read(input.available());
	scriptableStream.close();
	input.close();

	try {
		return unicodeConverter.ConvertToUnicode(str);
	} catch (e) {
		return str;
	}
},

isGreasemonkeyable: function(url) {
	var scheme=Components.classes["@mozilla.org/network/io-service;1"]
		.getService(Components.interfaces.nsIIOService)
		.extractScheme(url);
	return (
		(scheme == "http" || scheme == "https" || scheme == "file") &&
		!/hiddenWindow\.html$/.test(url)
	);
},

getCalilayRenderer: function(href) {
    var pages = [
        [/http:\/\/mediamarker\.net\/u\/.*\//,  "renderMediaMarker"],
        [/http:\/\/www\.amazon\.co\.jp\/.*[dg]p\/\d{10}\//,  "renderAmazonDetail"],
        [/http:\/\/www\.amazon\.co\.jp\/(.*\/)?wishlist\//,  "renderAmazonWishlist"]
    ];
    for (var i = 0; i < pages.length; i++) {
        if (pages[i][0].test(href)) {
            return pages[i][1];
        }
    }
    return null;
},

contentLoad: function(e) {
	var unsafeWin=e.target.defaultView;
	if (unsafeWin.wrappedJSObject) unsafeWin=unsafeWin.wrappedJSObject;

	var unsafeLoc=new XPCNativeWrapper(unsafeWin, "location").location;
	var href=new XPCNativeWrapper(unsafeLoc, "href").href;
    var renderer = calilay_gmCompiler.getCalilayRenderer(href);

	if (
		calilay_gmCompiler.isGreasemonkeyable(href)
		&& renderer
		&& true
	) {
		var script = "";
        script += calilay_gmCompiler.getUrlContents(
			'chrome://calilay/content/jquery-1.4.2.js'
		);
        script += calilay_gmCompiler.getUrlContents(
			'chrome://calilay/content/calilapi.js'
		);
        script += calilay_gmCompiler.getUrlContents(
			'chrome://calilay/content/calilay.js'
		);
		calilay_gmCompiler.injectScript(script, href, unsafeWin, renderer);
	}
},

injectScript: function(script, url, unsafeContentWin, renderer) {
	var sandbox, logger, xmlhttpRequester;
	var safeWin=new XPCNativeWrapper(unsafeContentWin);

	sandbox=new Components.utils.Sandbox(safeWin);

	var storage=new calilay_ScriptStorage();
	xmlhttpRequester=new calilay_xmlhttpRequester(
		unsafeContentWin, window//appSvc.hiddenDOMWindow
	);

	sandbox.window=safeWin;
	sandbox.document=sandbox.window.document;
	sandbox.unsafeWindow=unsafeContentWin;
    sandbox.renderer = renderer;

	// patch missing properties on xpcnw
	sandbox.XPathResult=Components.interfaces.nsIDOMXPathResult;

	// add our own APIs
	sandbox.GM_addCSS=function(url) {
        var css = calilay_gmCompiler.getUrlContents(
			'chrome://calilay/content/calilapi.css'
		);
        calilay_gmCompiler.addStyle(sandbox.document, css);
    };
	sandbox.GM_addStyle=function(css) { calilay_gmCompiler.addStyle(sandbox.document, css); };
	sandbox.GM_setValue=calilay_gmCompiler.hitch(storage, "setValue");
	sandbox.GM_getValue=calilay_gmCompiler.hitch(storage, "getValue");
	sandbox.GM_openInTab=calilay_gmCompiler.hitch(this, "openInTab", unsafeContentWin);
	sandbox.GM_xmlhttpRequest=calilay_gmCompiler.hitch(
		xmlhttpRequester, "contentStartRequest"
	);
	//unsupported
	sandbox.GM_registerMenuCommand=function(){};
	sandbox.GM_log=function(){};
	sandbox.GM_getResourceURL=function(){};
	sandbox.GM_getResourceText=function(){};

	sandbox.__proto__=sandbox.window;

	try {
        Components.utils.evalInSandbox(
			"(function(){"+script+"})()",
			sandbox);
	} catch (e) {
		var e2=new Error(typeof e=="string" ? e : e.message);
		e2.fileName=script.filename;
		e2.lineNumber=0;
		//GM_logError(e2);
		alert(e2);
	}
},

openInTab: function(unsafeContentWin, url) {
	var tabBrowser = getBrowser(), browser, isMyWindow = false;
	for (var i = 0; browser = tabBrowser.browsers[i]; i++)
		if (browser.contentWindow == unsafeContentWin) {
			isMyWindow = true;
			break;
		}
	if (!isMyWindow) return;
 
	var loadInBackground, sendReferrer, referrer = null;
	loadInBackground = tabBrowser.mPrefs.getBoolPref("browser.tabs.loadInBackground");
	sendReferrer = tabBrowser.mPrefs.getIntPref("network.http.sendRefererHeader");
	if (sendReferrer) {
		var ios = Components.classes["@mozilla.org/network/io-service;1"]
							.getService(Components.interfaces.nsIIOService);
		referrer = ios.newURI(content.document.location.href, null, null);
	 }
	 tabBrowser.loadOneTab(url, referrer, null, null, loadInBackground);
},
 
apiLeakCheck: function(allowedCaller) {
	var stack=Components.stack;

	var leaked=false;
	do {
		if (2==stack.language) {
			if ('chrome'!=stack.filename.substr(0, 6) &&
				allowedCaller!=stack.filename 
			) {
				leaked=true;
				break;
			}
		}

		stack=stack.caller;
	} while (stack);

	return leaked;
},

hitch: function(obj, meth) {
	if (!obj[meth]) {
		throw "method '" + meth + "' does not exist on object '" + obj + "'";
	}

	var hitchCaller=Components.stack.caller.filename;
	var staticArgs = Array.prototype.splice.call(arguments, 2, arguments.length);

	return function() {
		if (calilay_gmCompiler.apiLeakCheck(hitchCaller)) {
			return;
		}
		
		// make a copy of staticArgs (don't modify it because it gets reused for
		// every invocation).
		var args = staticArgs.concat();

		// add all the new arguments
		for (var i = 0; i < arguments.length; i++) {
			args.push(arguments[i]);
		}

		// invoke the original function with the correct this obj and the combined
		// list of static and dynamic arguments.
		return obj[meth].apply(obj, args);
	};
},

addStyle:function(doc, css) {
	var head, style;
	head = doc.getElementsByTagName('head')[0];
	if (!head) { return; }
	style = doc.createElement('style');
	style.type = 'text/css';
	style.innerHTML = css;
	head.appendChild(style);
},

onLoad: function() {
	var	appcontent=window.document.getElementById("appcontent");
	if (appcontent && !appcontent.greased_calilay_gmCompiler) {
		appcontent.greased_calilay_gmCompiler=true;
		appcontent.addEventListener("DOMContentLoaded", calilay_gmCompiler.contentLoad, false);
	}
},

onUnLoad: function() {
	//remove now unnecessary listeners
	window.removeEventListener('load', calilay_gmCompiler.onLoad, false);
	window.removeEventListener('unload', calilay_gmCompiler.onUnLoad, false);
	window.document.getElementById("appcontent")
		.removeEventListener("DOMContentLoaded", calilay_gmCompiler.contentLoad, false);
},

}; //object calilay_gmCompiler


function calilay_ScriptStorage() {
	this.prefMan=new calilay_PrefManager();
}
calilay_ScriptStorage.prototype.setValue = function(name, val) {
	this.prefMan.setValue(name, val);
}
calilay_ScriptStorage.prototype.getValue = function(name, defVal) {
	return this.prefMan.getValue(name, defVal);
}


window.addEventListener('load', calilay_gmCompiler.onLoad, false);
window.addEventListener('unload', calilay_gmCompiler.onUnLoad, false);
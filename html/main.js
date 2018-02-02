//
// Copyright (C) 2011 Panasonic Corporation. All Rights Reserved.
//

enable_keyhook = true;

console = {};
console.log = function(){};

// create path
var boot_url = null;
try{
  boot_url = system.boot.stage_url;
}catch(e){
  boot_url = "https://us.vieraconnect.tv/data/home-screen.js";
}
var url = boot_url.match("//([^/]+)/")[1].split(":");
var server_name = url[0];
var https_port = url[1] || 443;
var http_port = https_port - (443-80);
path = "http://" + server_name + ((http_port==80 )?(""):(":"+http_port))  + "/data/";
PATH_IMG = path + "sdkhtml/img/";

// partner url
var partner_info = {url:null, init_json:null, console_path:null};
try {
  if (_uri.match("sdkhtml/main.js")) {
    var url = _uri.match("[\?&]url=([^&]+)");
    if (url && url.length > 1) {
      partner_info.url = decodeURIComponent (url[1]);
    }
    var init_json = _uri.match("[\?&]init_json=([^&]+)");
    if (init_json && init_json.length > 1) {
      partner_info.init_json = decodeURIComponent (init_json[1]);
    }
    var console_path = _uri.match("[\?&]console_path=([^&]+)");
    if (console_path && console_path.length > 1) {
      partner_info.console_path = decodeURIComponent (console_path[1]);
    }
  }
}catch(e){}

// load commercial service setting.
add_package_load_path("pkg_app_info", "../pkg_app_info.js");
prepare_package("pkg_app_info");

// load softkeyboard pkg
kbd_path = path + "sdkhtml/kbd/";
kbd_img_path = path + "sdkhtml/kbd_img/";
add_package_load_path("pkg_keyboard", kbd_path + "pkg_keyboard.js");

// load parts pkg
try{
  add_package_load_path("lang_sdkhtml",
    "lang/pkg_lang_sdkhtml_"+system.locale.language.substr(0,5)+".js");
  require("lang_sdkhtml");
}catch(e){
  add_package_load_path("lang_sdkhtml", "lang/pkg_lang_sdkhtml_en-US.js");
  require("lang_sdkhtml");
}
add_package_load_path("pkg_parts", "pkg_parts.js");
require("pkg_parts");

// load remote console
add_package_load_path("console", "remote_console.js");

var is_2014_later = !(system.product.match("13PRO4") || system.product.match("13MT5590") 
                      || system.product.match("12PRO4") || system.product.match("12LD4") 
                      || system.product.match("11LDA3") || system.product.match("10LDA2"));
var is_cc_setting_support = (system.locale.country.substr(0,2) == "US" && is_2014_later);
if(is_cc_setting_support) {
  // load SMPTE-TT Closed Caption
  cc_setting_path = path + "iptv_cc_setting/";
  add_package_load_path("cc_setting_convert", cc_setting_path + "cc_setting_convert.js");
  require("cc_setting_convert");
}

// @disable-check M306
W_TEXT = lang_sdkhtml.GetMessageText();


function isString(obj) {
  return (typeof (obj) == "string" || obj instanceof String);
};

function isBoolean(obj) {
  return (typeof (obj) == "boolean" || obj instanceof Boolean);
};

var set_cursor = function(sobj, cobj){
  var old = sobj.cursor;
  if (old == cobj)
    return;
  if (old) {
    if (old.leave_focus)
      old.leave_focus (old);
    old.in_cursor = false;
    old.toggle_cursor = false;
  }
  if (cobj) {
    if (cobj.enter_focus)
      cobj.enter_focus (cobj);
    cobj.in_cursor = true;
  }
  sobj.cursor = cobj;
};

common_key = {};
common_key.set_cursor = function(sobj, cobj) {
  set_cursor(sobj, cobj);
};

var deeplinkid = null;
var deeplinkurl = null;
try { deeplinkid  = decodeURIComponent (_uri.match("[?&]deeplinkid=([^&]+)")[1]);  }catch(e){};
try { deeplinkurl = decodeURIComponent (_uri.match("[?&]deeplinkurl=([^&]+)")[1]); }catch(e){};

var app_info = null;
try {
  require("pkg_app_info");
  app_info = pkg_app_info;
} catch(e) {
}

var splash_image = new gimage({width:1920, height:1080});
try {
  if (app_info && app_info.splash_image)
    splash_image.src = app_info.splash_image;
}catch(e){}

var version_more_than = function(t_version, version) {
  var t_ver = t_version;
  var p_ver = version;
  t_ver = t_ver.split(".");
  p_ver = p_ver.split(".");

  for (var i = 0; i < t_ver.length; i++) {
    if (parseInt(t_ver[i]) < parseInt(p_ver[i])) {
      return true;
    } else if (parseInt(t_ver[i]) > parseInt(p_ver[i])) {
      return false;
    }
  }
  return true;
};

var read_iptv_nvram = function(){
  var param_data = "";
  try {
    param_data = flash_mem.read("iptv_cc_setting");
    return eval("("+param_data+")");
  } catch(e) {
    console.log(e);
    return null;
  }
}

var bc_related = function () {
  if (brw_param.get_data(BRW_PRM_PROFILE) == "hbbtv") {
    console.log("bc-unrelated");
    return 0;
  }
  console.log("bc-related");
  return 1;
}

var videobox_no_transform = function () {
  if (arguments[6] && arguments[7]) {
    brw_video_box.visible_p = true;
  } else {
    brw_video_box.visible_p = false;
  }
  force_redraw();
}

var handle_videobox_ev = function () {
  if (arguments[6] && arguments[7]) {
    brw_video_box.width = arguments[6];
    brw_video_box.height = arguments[7];
    brw_video.translate[0] = arguments[4]-960+brw_video_box.width/2;
    brw_video.translate[1] = 540-arguments[5]-brw_video_box.height/2;
    brw_video_box.visible_p = true;
  } else {
    brw_video_box.visible_p = false;
  }
  force_redraw();
}

// dial
function dial (app_name, product_id) {
  if(!(system.boot && system.boot.option && ebus.smartphone)) return;
  var boot_obj = system.boot.option.get_type() || "viera:0";
  var boot_type  = boot_obj.split(":")[0];
  var session_id = boot_obj.split(":")[1];
  if (boot_type != "smapho") {
    session_id = "0";
  }

  this.smp = new ebus.smartphone.Listener();
  this.smp.recv_hook = function () {
    var stg     = arguments[0];
    var smp     = arguments[1];
    var event   = arguments[2];
    var action  = arguments[3];
    var req_ack = arguments[4];
    var result  = arguments[5];
    var data    = arguments[6];

    if (event != smp.RECEIVED_EV) return;
    if (result != 0x00) return;
    if (action == smp.ACTION_QUERY) {
      if (data && data[0] && data[0] == "EXIT") {
	var response = [];
	if (("session_id="+session_id) == data[1]) {
	  response = ["EXIT", "OK"];
	  console.log("will exit.");
	  append_timer({}, 200, function(obj) {
	    delete_timer(obj);
	    exit(0);});
	}
	smp.send({
	  "action":action,
	  "req_ack":smp.ACK,
	  "result":(response.length > 0) ? smp.RESULT_SUCCESS : smp.RESULT_ERROR,
	  "message":response,
	  "message_length":response.length});
      }
    }
    return;
  };
  this.smp.connect();
  var message = ["vc_app:"+session_id+":product_id="+product_id+":"+app_name];
  this.smp.send({
    "action":this.smp.ACTION_RUNNOTIFY,
    "req_ack":this.smp.REQ,
    "result":this.smp.RESULT_REQUEST,
    "message":message,
    "message_length":message.length
  });
  return;
};

function get_dial_arg (label, fmt) {
  var dial_arg = null;

  if(!(system.boot && system.boot.option)) return null;
  try {
    var boot_data = system.boot.option.get_data();
    var boot_data_len = boot_data.length;
    if (boot_data.charCodeAt(boot_data_len-1) == 0)
      boot_data = boot_data.slice(0,boot_data_len-1);
    var boot_args = boot_data.split("&");
    for (var i=0; i<boot_args.length; i++) {
      var args = boot_args[i].split("=");
      var symbol = args[0];
      var value  = args.slice(1).join("=");
      if (symbol.indexOf(label) != -1)
      {
	switch(fmt) {
	case "HEX":
	  var bin = sysutil.hex.decode (value);
	  dial_arg = sysutil.tconv.binary_to_string(bin);
	  break;
	default:
	  dial_arg = value;
	  break;
	}
      }/* fi */
    }
  }catch(e){
    dial_arg = null;
  }

  if (dial_arg)
    console.log("  [ INFO  ] DIAL " + label + "=" + (dial_arg?dial_arg:""));

  return dial_arg;
};

function get_default_additional_url (dial_name) {
  var dial_arg = null;

  if(!(system.boot && system.boot.option)) return null;
  try {
    var boot_data = system.boot.option.get_data();
    if (boot_data && boot_data.match("^http://localhost"))
      dial_arg = boot_data + dial_name;
  }catch(e){
    dial_arg = null;
  }

  console.log("  [ INFO  ] DIAL ADDITIONAL_DATA_URL=" + (dial_arg?dial_arg:""));

  return dial_arg;
};


////////////////////////////////////////////
// Browser
////////////////////////////////////////////
var pb_version = "";
var mouse_pos_x = 0;
var mouse_pos_y = 0;
var oposition_x = 0;
var oposition_y = 0;
var obutton = 0;

var hide_panel = new gbox({width:1920,height:1080,visible_p:false});
var pb = {};
pb.browser_init = function(){
  this.focus_info_init();
  this.user_agent = null;
  this.in_loading = false;
  this.in_clickable = false;
  this.in_busy = false;
  this.back_count = -1;
  this.server_name = this.get_server_name();
};
pb.get_enum_hook = function() {
  pb_version = arguments[3];
  eval (arguments[5]);
};
pb.get_server_name = function(){
  var sname = "";
  var radio = flash_mem.read("_____radio");
  if(radio == 0){
    sname = "192.168.0.100";
  }else{
    sname = "localserver.vieraconnect.com";
  }
  return sname;
};

// cursor move
pb.focus_info_init = function () {
  this.focus_info = {};
  this.focus_info.obj = null;
  this.focus_info.rect = [];
  this.focus_info.type = null;
  this.focus_info.value = null;
  this.set_focus_info_done = false;
};
pb.set_focus_info = function (obj, arg) {
  this.focus_info_init ();
  if (arg[4]) {
    this.focus_info.obj = arg[4];
    this.focus_info.rect = [arg[5], arg[6], arg[7], arg[8]];
    if (arg.length > 9) {
      this.focus_info.type = arg[9];
      this.focus_info.value = arg[10];
    }
  } else {
    this.focus_info.obj = "unfocus";
  }
  this.set_focus_info_done = true;
};
pb.edit_text_cb = function(obj, arg) {
  this.set_focus_text_info(obj, arg);
  this.apply_keyboard({text:this.focus_info.value,mode:this.focus_info.type});
};
pb.set_focus_text_info = function (obj, arg) {
  this.focus_info.value = arg[4];
  this.focus_info.start_pos = arg[5];
  this.focus_info.end_pos = arg[6];
};
pb.is_focus_textbox = function () {
  if(!brw_param.get_data(BRW_PRM_KEYBOARD)) return false;
  if ((this.focus_info.obj == null) || (this.focus_info.obj == "unfocus")
      || (this.focus_info.type == null))
    return false;

  if ((this.focus_info.obj == "input")
   && ((this.focus_info.type == "text")
    || (this.focus_info.type == "password")
    || (this.focus_info.type == "email")
    || (this.focus_info.type == "url")
    || (this.focus_info.type == "search")
    || (this.focus_info.type == "tel")
    || (this.focus_info.type == "number")
    || (this.focus_info.type == "date")
    || (this.focus_info.type == "datetime")
    || (this.focus_info.type == "datetime-local")
    || (this.focus_info.type == "month")
    || (this.focus_info.type == "week")
    || (this.focus_info.type == "time"))
   || (this.focus_info.tag == "textarea")) {
    return true;
  }
  return false;
};
pb.is_chkbx_or_radio = function () {
  if ((this.focus_info.obj == null) || (this.focus_info.obj == "unfocus") ||
      (this.focus_info.type == null)){
    return false;
  }
  if (((this.focus_info.obj == "input") || (this.focus_info.obj == "div")) &&
      ((this.focus_info.type == "checkbox") || (this.focus_info.type == "radio"))){
    return true;
  }
  return false;
};

//free pointer
pb.point_info_init = function () {
  this.point_info = {};
  this.point_info.tag = null;
  this.point_info.type = null;
  this.point_info.value = null;
};
pb.check_textarea = function() {
  if(pb.GET_HITTEST_RESULT){
    ebus.pbrowser[0].request (true, this.get_hittest_cb,
      pb.GET_HITTEST_RESULT, mouse_pos_x, mouse_pos_y);
  }
};
pb.get_hittest_cb = function () {
  pb.point_info_init();
  pb.point_set_info(arguments);
  if(pb.is_point_textbox()){
    pb.apply_keyboard({text:pb.point_info.value, mode:pb.point_info.type});
  }
};
pb.point_set_info = function (arguments) {
  this.point_info.tag = arguments[3];
  if (arguments[4])
    this.point_info.type = arguments[4];
  if (arguments[5]){
    this.point_info.value = arguments[5];
  }else{
    this.point_info.value = "";
  }
  if (arguments[6]){
    this.point_info.x = arguments[6];
  }else{
    this.point_info.x = 0;
  }
  if (arguments[7]){
    this.point_info.y = arguments[7];
  }else{
    this.point_info.y = 0;
  }
  if (arguments[8]){
    this.point_info.w = arguments[8];
  }else{
    this.point_info.w = 0;
  }
  if (arguments[9]){
    this.point_info.h = arguments[9];
  }else{
    this.point_info.h = 0;
  }
  if((arguments[10] == undefined) || (arguments[10])){
    this.point_info.writable = true;
  }else{
    this.point_info.writable = false;
  }
};
pb.is_point_textbox = function () {
  if(!brw_param.get_data(BRW_PRM_KEYBOARD)) return false;

  if((!this.point_info.x) || (!this.point_info.y)
    || (!this.point_info.w) || (!this.point_info.h)
    || (!this.point_info.writable)){
    return false;
  }

  if((this.point_info.tag == "input")
   && ((this.point_info.type == "text")
    || (this.point_info.type == "password")
    || (this.point_info.type == "email")
    || (this.point_info.type == "url")
    || (this.point_info.type == "search")
    || (this.point_info.type == "tel")
    || (this.point_info.type == "number")
    || (this.point_info.type == "date")
    || (this.point_info.type == "datetime")
    || (this.point_info.type == "datetime-local")
    || (this.point_info.type == "month")
    || (this.point_info.type == "week")
    || (this.point_info.type == "time"))
   || (this.point_info.tag == "textarea")){
    return true;
  }
  return false;
};

pb.apply_keyboard = function(param){
  if(sft_keyboard.visible_p) return false;
  sft_keyboard.appear({text:param.text});
  switch(param.mode){
    case "password":
      sft_keyboard.set_passwd_mode();
      break;
    case "email":
    case "url":
    case "tel":
    case "number":
      sft_keyboard.set_input_char("ALPHABET");
      break;
    default:
      break;
  }
  return true;
};
pb.enter_text = function (param) {
  ebus.pbrowser[0].request (false, null, pb.SELECT_ALL_TEXT);
  if(param.text){
    ebus.pbrowser[0].request (false, null, pb.CONFIRM_COMPOSITION, param.text);
  }else{
    ebus.pbrowser[0].request (false, null, pb.SEND_KEYCODE, pb.RawKeyDown, pb.VKEY_BACK, 0);
    ebus.pbrowser[0].request (false, null, pb.SEND_KEYCODE, pb.KeyUp, pb.VKEY_BACK, 0);
  }
};
pb.cancel_text = function () {
};
pb.update_cursor_img = function () {
  if (this.in_busy) {
    system.cursor_pointer.set_current_index(3);    
  }else {
    if(this.in_clickable){
      if(this.in_loading){
        system.cursor_pointer.set_current_index(2);
      }else{
        system.cursor_pointer.set_current_index(1);
      }
    }else{
      if(this.in_loading){
        system.cursor_pointer.set_current_index(2);
      }else{
        system.cursor_pointer.set_current_index(0);
      }
    }
  }
};

pb.set_extensions = function(opt) {
  this._extensions = opt;
};
pb.get_extensions = function() {
  return this._extensions;
};

pb.set_runtimefeatures = function(opt) {
  this._runtimefeatures = opt;
};
pb.get_runtimefeatures = function() {
  return this._runtimefeatures;
};

pb.event_hook = function(stage, obj, event, ev, data1, data2, data3) {
  switch(event) {
  case obj.CONNECTED_EV:
    console.log("CONNECTED_EV");
    obj.request(true, pb.get_enum_hook, obj.GET_ENUM, "pb");
    if (obj == ebus.pbrowser[0]) {
      obj.set_auto_redraw(true);
      obj.request(false, null, pb.RENDERING_SIZE,
        brw_param.get_data(BRW_PRM_RENDERING_W),
        brw_param.get_data(BRW_PRM_RENDERING_H)
      );

      var sta_ver = "";
      if(version_more_than("3.10.13", pb_version)){
        sta_ver = " SmartTvA/3.0.0 ";
      }
      if(brw_param.get_data(BRW_PRM_USER_AGENT)){
        if(pb.default_useragent)
          obj.request(false, null, pb.SET_USERAGENT,
            pb.default_useragent + sta_ver + "/" + brw_param.get_data(BRW_PRM_USER_AGENT));
        else{
          // Add a string to the UserAgent in China Model (old model so no STA3.0)
          var ua;               
          ua = "Mozilla/5.0 (FreeBSD; U; Viera; " + system.locale.language.substr(0,5)
              + ") AppleWebKit/535.11 (KHTML, like Gecko) Viera/" + pb_version
              + " Chrome/14.0.835.202 Safari/535.1";
          ua += "/" + brw_param.get_data(BRW_PRM_USER_AGENT);
          obj.request(false, null, pb.SET_USERAGENT, ua);
        }
      }
      else{
        if(pb.default_useragent){
          if(sta_ver != ""){
            obj.request(false, null, pb.SET_USERAGENT, pb.default_useragent + sta_ver);
          }
        }
      }

      if(pb.SET_EXTENSIONS)
        obj.request(false, null, pb.SET_EXTENSIONS, "STA2.0", true);

      if(version_more_than("3.10.13", pb_version) && pb.SET_BROWSER_PROFILE){
        obj.request(false, null, pb.SET_BROWSER_PROFILE, brw_param.get_data(BRW_PRM_PROFILE));
        obj.request(false, null, pb.SET_NSPLUGIN_ENABLED, true);
        add_event_hook( ebus.pbrowser[0].plugin, pb.plugin_event_hook );
      }

      if(version_more_than("3.0.0", pb_version) && get_appli_id()){
        if(pb.SET_CONFIG_DIR)
          obj.request(false, null, pb.SET_CONFIG_DIR, String(get_appli_id()));
        if(pb.SET_LOCALSTORAGE_QUOTA_BYTES)
          obj.request(false, null, pb.SET_LOCALSTORAGE_QUOTA_BYTES, 524288);
      }

      // spatial_navigation support
      if(brw_param.get_data(BRW_PRM_SPATIAL_NAVIGATION)){
        obj.request(false, null, pb.SET_SPATIAL_NAVIGATION_ENABLED, true);
      }

      try {
        var opt = pb.get_extensions();
        for (var i = 0; i < opt.length; i++) {
          if(pb.SET_EXTENSIONS) {
            obj.request(false, null, pb.SET_EXTENSIONS, opt[i], true);
          }
        }
      } catch(e) {
        console.log("extensions error:"+e);
      }

      try {
        if (pb.SET_RUNTIMEFEATURES) {
          var opt = pb.get_runtimefeatures();
          for (var i = 0; i < opt.length; i++) {
            switch(opt[i]) {
            case "MediaSource":
            case "EncryptedMedia":
	      obj.request(false, null, pb.SET_RUNTIMEFEATURES, opt[i], true);
              console.log("SET_RUNTIMEFEATURES:"+opt[i]);
              break;
            }
          }
        }
      } catch(e) {
        console.log("runtimefeatures error:"+e);
      }
      
      try {
        if (pb.SET_CLIENT_CERT) {
          if (app_info && isString(app_info.client_cert)) {
            obj.request(false, null, pb.SET_CLIENT_CERT, app_info.client_cert);
          }
          else if (brw_param.get_data(BRW_PRM_WITH_CLIENT_CERT)) {
            obj.request(false, null, pb.SET_CLIENT_CERT, "browser_clientcert.pem");
          }
        }
      } catch(e) {
        console.log("client cert error.");
      }

      var load_url = null;
      if (app_info && app_info.url) {
        load_url = app_info.url;
      } else if (partner_info && partner_info.url) {
        load_url = partner_info.url;
      } else {
        load_url = "http://" + pb.server_name + "/sdkhtml/main.html";
      }

      var query = [];
      var dial_name = brw_param.get_data(BRW_PRM_DIAL_NAME);
      if (dial_name) {
        var dial_arg = get_dial_arg("DIAL_ARG", "HEX");
        if (dial_arg) query.push(dial_arg);
        var additional_data_url = get_dial_arg("ADDITIONAL_DATA_URL", "RAW");
        if (additional_data_url) {
          query.push("additionalDataUrl="+additional_data_url);
        }else{
          additional_data_url = get_default_additional_url(dial_name);
          if (additional_data_url) {
            query.push("additionalDataUrl="+encodeURIComponent(additional_data_url));
          }
        }
      }

      var product_id = null;
      try {
        if (app_info.product_id) {
          product_id = app_info.product_id;
        }else{
          product_id = system.boot.stage_url.match("product_id=([^&]+)")[1];
        }
        dial(dial_name, product_id);
      }catch(e){}
      
      if (query.length > 0) {
        if (load_url.indexOf("?") == -1) {
          load_url += "?" + query.join("&");
        }else{
          load_url += "&" + query.join("&");
        }
      }
      console.log("load_url: "+load_url);
      obj.request(false, null, pb.LOAD_URL, load_url);

      if(is_cc_setting_support){
        var myObj = read_iptv_nvram();
        if(myObj){
          cc_setting_convert.setRenderingSize( brw_param.rendering_h, brw_param.rendering_w );
          cc_setting_convert.ccSettingConvert( ebus.pbrowser[0], pb, myObj );
        }else{
          var default_dt = {
            'mode':0,
            'trunck':0,
            'size':0,
            'font':0,
            'style':0,
            'outline':0,
            'foreground':0,
            'foreground-opacity':0,
            'background':0,
            'background-opacity':0,
            'background-window':0,
            'background-window-opacity':0
          };
          cc_setting_convert.setRenderingSize( brw_param.rendering_h, brw_param.rendering_w );
          cc_setting_convert.ccSettingConvert( ebus.pbrowser[0], pb, default_dt );
        }
      }
    }
    break;
  case obj.BROWSER_EV:
    pb.ev = arguments[3];
    switch (pb.ev) {
    case pb.PAGE_INFORMATION_EV:
      console.log("[PAGE_INFORMATION_EV]"+data1);
      if(pb.in_loading && !pb.chk_accese_url(data1)){
        obj.request(false, null, pb.LOAD_STOP);
        hide_panel.visible_p = true;
      }
      break;

    case pb.FOCUSED_NODE_EV:
      console.log("[FOCUSED_NODE_EV]");
      pb.set_focus_info(pb, arguments);
      break;
    case pb.EDIT_TEXT_EV:
      console.log("[EDIT_TEXT_EV]");
      pb.edit_text_cb(pb, arguments);
      break;
    case pb.SET_CURSOR_EV:
      try {
        if (arguments[4] == "pointer"){
            pb.in_clickable = false;
            pb.update_cursor_img();
        }else if (arguments[4] == "hand"){
            pb.in_clickable = true;
            pb.update_cursor_img();
        }else if (arguments[4] == "custom"){
          var index = 16;
          system.cursor_pointer.set_image ({index:index, 
              type:system.cursor_pointer.IMG_FMT_BITMAP,
              data:arguments[5],
              img_width:arguments[6],
              img_height:arguments[7],
              host_spot_x:arguments[8],
              host_spot_y:arguments[9],
              draw_width:100,
              draw_height:100});

          system.cursor_pointer.set_current_index (index);
          force_redraw();
        }
      } catch (e){
      }
      break;
    case pb.LOAD_STARTED_EV:
      console.log ("LOAD_STARTED_EV");
      pb.in_loading = true;
      pb.in_busy = true;
      pb.update_cursor_img();
      hide_panel.visible_p = false;
      break;
    case pb.LOAD_PROGRESS_EV:
      if((arguments[4] >= 40) && (pb.in_busy)){
        pb.in_busy = false;
        pb.update_cursor_img();
      }
      break;
    case pb.LOAD_FINISHED_EV:
      console.log("LOAD_FINISHED_EV");
      pb.in_loading = false;
      pb.in_busy = false;
      pb.update_cursor_img();
      splash_screen.disappear();
      force_redraw();
      break;
    case pb.LOAD_FAILED_EV:
      console.log("LOAD_FAILED_EV");
      pb.in_loading = false;
      pb.in_busy = false;
      pb.update_cursor_img();
      splash_screen.disappear();
      show_normal_error();
      break;
    case pb.NO_BACK_HISTORY_EV:
      console.log("NO_BACK_HISTORY_EV");
      common_out_hook();
      break;
    case pb.BACKFORWARD_COUNT_EV:
      console.log("BACKFORWARD_COUNT_EV back:"+arguments[4]);
      pb.back_count = arguments[4];
      break;
    case pb.VIDEOBOX_EV:
      handle_videobox_ev.apply(this, arguments);
      break;
    case pb.NOT_HANDLED_EV:
      console.log("NOT_HANDLED_EV type:"+arguments[4]+" key:"+arguments[6]+" updown:"+arguments[5]);
      switch (arguments[4]) {
      case pb.SEND_KEYCODE:
        switch (arguments[6]) {
        case pb.VKEY_BACK:
          if (arguments[5] == pb.RawKeyDown) {
            ebus.pbrowser[0].request (false, null, pb.HISTORY_BACK);
          }
          break;
        default:
          break;
        }
        break;
      default:
        break;
      }
      break;
    }
    break;
  case obj.DISCONNECTED_EV:
    exit_appli(0);
    break;
  case obj.EXIT_EV:
    exit_appli(0);
    break;
  default:
    break;
  }
};

pb.plugin_event_hook = function( stg, obj, ev )
{
  switch( ev ){
  case obj.CONNECTED_EV:
    var idx = arguments[3];
    if( ebus.pbrowser[0].plugin[idx].type == ebus.pbrowser[0].plugin.TYPE_OIPF ){
      add_event_hook( ebus.pbrowser[0].plugin[idx], pb.oipf_event_hook );
    }
    break;
  case obj.DISCONNECTED_EV:
    del_event_hook( ebus.pbrowser[0].plugin[idx] );
    break;
  default:
    break;
  }
};

pb.oipf_event_hook = function( stg, obj, ev )
{
  switch( ev ){
  case obj.AVAILABLE_EV:
    var eval_str = "oipf_sym = " + obj.get_plugin_info ();
    eval( eval_str );

    obj.request( obj.MSG_REQ_ASYNC, oipf_sym.SET_PROFILE, brw_param.get_data(BRW_PRM_PROFILE) );
    obj.request( obj.MSG_REQ_ASYNC, oipf_sym.INITIALIZE_FINISHED );
    break;
  case obj.PLUGIN_OIPF_EV:
    tag = arguments[3];
    switch( tag ){
    case oipf_sym.REQ_GET_BROADCAST_RELATED_STATE_EV:
        obj.request( obj.MSG_RES_SYNC, oipf_sym.RES_GET_BROADCAST_RELATED_STATE, bc_related());
        break;
    default:
      break;
    }
    break;
  default:
    break;
  }
};

pb.key_repeat_flg = false;
pb.set_key_repeat = function(enabled) {
  this.key_repeat_flg = enabled;
}
pb.key_hook = function(up_down, key) {
  var type = null;

  var extensions = pb.get_extensions();
  if (extensions && extensions.indexOf("amazon") != -1) {
    if (!(key == TXK_UP || key == TXK_DOWN || key == TXK_LEFT || key == TXK_RIGHT)) {
      if (up_down == KEY_PRESS) {
        return true;
      }
      if (up_down == KEY_DOWN) {
        up_down = KEY_PRESS;
      }
    }
  }

  if (up_down == KEY_PRESS) {
    type = pb.RawKeyDown;
    if (this.key_repeat_flg === false)
      return;
  } else if (up_down == KEY_DOWN) {
    type = pb.RawKeyDown;      
    if (this.key_repeat_flg === true)
      return;
  } else {
    type = pb.KeyUp;
  }
  console.log("[key_hook]key:"+key + " up_down:"+up_down);
  if (!enable_keyhook) return false;

  switch(key) {
  case TXK_ENTER:
    if (this.is_focus_textbox () == true) {
      if (up_down == KEY_DOWN || up_down == KEY_PRESS)
        ebus.pbrowser[0].request (false, null, pb.EDIT_TEXT);
    }else if(this.is_chkbx_or_radio () == true){
      ebus.pbrowser[0].request(false,null, pb.SEND_KEYCODE, type,
        pb.VKEY_SPACE,0," ");
      if (up_down == KEY_DOWN || up_down == KEY_PRESS)
        ebus.pbrowser[0].request(false,null, pb.SEND_KEYCODE, pb.Char,
          pb.VKEY_SPACE,0," ");
    }else{
      ebus.pbrowser[0].request (false, null, pb.SEND_KEYCODE, type,
        pb.VKEY_RETURN, 0, "\r");
      if (up_down == KEY_DOWN || up_down == KEY_PRESS)
        ebus.pbrowser[0].request (false, null, pb.SEND_KEYCODE, pb.Char,
          pb.VKEY_RETURN, 0, "\r");
    }
    return true;
  case TXK_UP:
    ebus.pbrowser[0].request(false, null, pb.SEND_KEYCODE, type, pb.VKEY_UP, 0);
    return true;
  case TXK_DOWN:
    ebus.pbrowser[0].request(false, null, pb.SEND_KEYCODE, type, pb.VKEY_DOWN, 0);
    return true;
  case TXK_LEFT:
    ebus.pbrowser[0].request(false, null, pb.SEND_KEYCODE, type, pb.VKEY_LEFT, 0);
    return true;
  case TXK_RIGHT:
    ebus.pbrowser[0].request(false, null, pb.SEND_KEYCODE, type, pb.VKEY_RIGHT, 0);
    return true;

  case TXK_RED:
    ebus.pbrowser[0].request(false, null, pb.SEND_KEYCODE, type, pb.VKEY_RED, 0);
    return true;
  case TXK_GREEN:
    ebus.pbrowser[0].request(false, null, pb.SEND_KEYCODE, type, pb.VKEY_GREEN, 0);
    return true;
  case TXK_YELLOW:
    ebus.pbrowser[0].request(false, null, pb.SEND_KEYCODE, type, pb.VKEY_YELLOW, 0);
    return true;
  case TXK_BLUE:
    ebus.pbrowser[0].request(false, null, pb.SEND_KEYCODE, type, pb.VKEY_BLUE, 0);
    return true;

  case TXK_PLAY:
    ebus.pbrowser[0].request(false, null, pb.SEND_KEYCODE, type, pb.VKEY_OIPF_PLAY, 0);
    return true;
  case TXK_PAUSE:
    ebus.pbrowser[0].request(false, null, pb.SEND_KEYCODE, type, pb.VKEY_PAUSE, 0);
    return true;
  case TXK_STOP:
    ebus.pbrowser[0].request(false, null, pb.SEND_KEYCODE, type, pb.VKEY_STOP, 0);
    return true;
  case TXK_FF:
    ebus.pbrowser[0].request(false, null, pb.SEND_KEYCODE, type, pb.VKEY_FAST_FWD, 0);
    return true;
  case TXK_REW:
    ebus.pbrowser[0].request(false, null, pb.SEND_KEYCODE, type, pb.VKEY_REWIND, 0);
    return true;
  case TXK_SKIP_NEXT:
    ebus.pbrowser[0].request(false, null, pb.SEND_KEYCODE, type, pb.VKEY_OIPF_NEXT, 0);
    return true;
  case TXK_SKIP_PREV:
    ebus.pbrowser[0].request(false, null, pb.SEND_KEYCODE, type, pb.VKEY_PREV, 0);
    return true;

  case TXK_D0:
    ebus.pbrowser[0].request(false, null, pb.SEND_KEYCODE, type, pb.VKEY_0, 0);
    return true;
  case TXK_D1:
    ebus.pbrowser[0].request(false, null, pb.SEND_KEYCODE, type, pb.VKEY_1, 0);
    return true;
  case TXK_D2:
    ebus.pbrowser[0].request(false, null, pb.SEND_KEYCODE, type, pb.VKEY_2, 0);
    return true;
  case TXK_D3:
    ebus.pbrowser[0].request(false, null, pb.SEND_KEYCODE, type, pb.VKEY_3, 0);
    return true;
  case TXK_D4:
    ebus.pbrowser[0].request(false, null, pb.SEND_KEYCODE, type, pb.VKEY_4, 0);
    return true;
  case TXK_D5:
    ebus.pbrowser[0].request(false, null, pb.SEND_KEYCODE, type, pb.VKEY_5, 0);
    return true;
  case TXK_D6:
    ebus.pbrowser[0].request(false, null, pb.SEND_KEYCODE, type, pb.VKEY_6, 0);
    return true;
  case TXK_D7:
    ebus.pbrowser[0].request(false, null, pb.SEND_KEYCODE, type, pb.VKEY_7, 0);
    return true;
  case TXK_D8:
    ebus.pbrowser[0].request(false, null, pb.SEND_KEYCODE, type, pb.VKEY_8, 0);
    return true;
  case TXK_D9:
    ebus.pbrowser[0].request(false, null, pb.SEND_KEYCODE, type, pb.VKEY_9, 0);
    return true;

  case TXK_RETURN:
     if(brw_param.get_data(BRW_PRM_PROFILE) == "hbbtv"){
       ebus.pbrowser[0].request(false, null, pb.SEND_KEYCODE, type, pb.VKEY_BACKRETURN, 0);
     }else{
      if(pb.back_count < 0){
        console.log("go to homescreen");
        common_out_hook();
      }else{
        console.log("[key_hook]BACK:"+up_down);
        ebus.pbrowser[0].request(false, null, pb.SEND_KEYCODE, type, pb.VKEY_BACK, 0);
      }
    }
    return true;
  }
  return false;
};

pb.mouse_hook = function(){
  var stg = arguments[0];
  var obj = arguments[1];
  var ev  = arguments[2];
  var button = arguments[3];
  var pos_x = arguments[4];
  var pos_y = arguments[5];
  var diff_z = arguments[6];
  var diff_x = arguments[7];
  var diff_y = arguments[8];
  
  var modifier1 = (button & ebus.mouse.DOWN_MODIFIER1_BUTTON);

  if (ev != obj.LOW_EV)  return;

  if(!input_dev.get_pointer_status())
    input_dev.pointer_appear();

  if(hide_panel.visible_p) return false;

  if(sft_keyboard.visible_p){
    sft_keyboard.kb_item.set_move_mode("free");
    return sft_keyboard.kb_item.mouse_hook(arguments);
  }

  if(error_popup.visible_p) return false;

  mouse_pos_x = system.cursor_pointer.get_pos_x () + 960;
  mouse_pos_y = -system.cursor_pointer.get_pos_y () + 540;

  if(modifier1){
    if(diff_x || diff_y)
      ebus.pbrowser[0].request (false, null, pb.SCROLL_DELTA, diff_x, diff_y);
  }else{
    if (diff_z) {
      console.log("[brw_obj.mouse_hook]SEND_WHEELEVENT");
      ebus.pbrowser[0].request (false, null, pb.SEND_WHEELEVENT,
              mouse_pos_x, mouse_pos_y, 0, -diff_z*50, 0);
    }
    if ((button & ebus.mouse.DOWN_LEFT_BUTTON)
         && (obutton & ebus.mouse.DOWN_LEFT_BUTTON)){
      ebus.pbrowser[0].request (false, null, pb.MOVE_POINTER,
              mouse_pos_x, mouse_pos_y, pb.LeftButton);
    }else{
      ebus.pbrowser[0].request (false, null, pb.MOVE_POINTER,
              mouse_pos_x, mouse_pos_y, pb.NoButton);
    }
    if ((button & ebus.mouse.DOWN_LEFT_BUTTON)
         != (obutton & ebus.mouse.DOWN_LEFT_BUTTON)) {
      if (button & ebus.mouse.DOWN_LEFT_BUTTON){
        console.log("[pb.mouse_hook]CLICK_POINTER LeftButton MouseEventPressed");
        ebus.pbrowser[0].request (false, null, pb.CLICK_POINTER,
                mouse_pos_x, mouse_pos_y,
                pb.LeftButton, pb.MouseEventPressed, 1);
      }else{
        console.log("[pb.mouse_hook]CLICK_POINTER LeftButton MouseEventReleased");
        ebus.pbrowser[0].request (false, null, pb.CLICK_POINTER,
                mouse_pos_x, mouse_pos_y,
                pb.LeftButton, pb.MouseEventReleased, 1);
        pb.check_textarea();
      }
    }
    if ((button & ebus.mouse.DOWN_RIGHT_BUTTON)
         != (obutton & ebus.mouse.DOWN_RIGHT_BUTTON)) {
      if (button & ebus.mouse.DOWN_RIGHT_BUTTON){
        console.log("[pb.mouse_hook]CLICK_POINTER RightButton MouseEventPressed");
        ebus.pbrowser[0].request (false, null, pb.CLICK_POINTER,
          mouse_pos_x, mouse_pos_y,
          pb.RightButton, pb.MouseEventPressed, 1);
      }else
        console.log("[pb.mouse_hook]CLICK_POINTER RightButton MouseEventReleased");
        ebus.pbrowser[0].request (false, null, pb.CLICK_POINTER,
          mouse_pos_x, mouse_pos_y,
          pb.RightButton, pb.MouseEventReleased, 1);
    }
  }

  obutton = button;
  oposition_x = mouse_pos_x;
  oposition_y = mouse_pos_y;
  
  return false
};

pb.chk_accese_url = function(url){
  var accese_url = "";
  var accese_domain = "";
  var accese_path = "";
  var allow_domain_ary = Array();
  var allow_url = "";
  var allow_domain = "";
  var allow_path = "";
  var pos = 0;

  allow_domain_ary = brw_param.get_data(BRW_PRM_ALLOWED_DOMAIN);
  if(!allow_domain_ary){
    console.log("[pb.chk_accese_url] Allow Domain Not Set!!");
    return true;
  }
  accese_url = pb.convert_url(url);
  accese_domain = pb.extract_domain(accese_url);
  accese_path = pb.extract_path(accese_url);

  for(var i=0, max=allow_domain_ary.length; i<max; i++){
    allow_url = pb.convert_url(allow_domain_ary[i]);
    allow_domain = pb.extract_domain(allow_url);
    pos = accese_domain.lastIndexOf(allow_domain);
    
    if(pos < 0) continue;
    if((accese_domain.length - pos) != allow_domain.length){
      continue;
    }else{
      allow_path = pb.extract_path(allow_url);
      if(!allow_path){
        console.log("[pb.chk_accese_url] true (domain only)");
        return true;
      }else{
        if(accese_path){
          pos = accese_path.indexOf(allow_path);
          if(pos == 0){
            console.log("[pb.chk_accese_url] true");
            return true;
          }
        }
      }
    }
  }
  console.log("[pb.chk_accese_url] true");
  return false;
};

pb.convert_url = function(url){
  var pos = 0;
  var convert_url = "";

  if(url.charAt(url.length - 1) != "/"){
    url = url.concat("/");
  }
  pos = url.indexOf("://");
  if(pos >= 0){
    convert_url = url.substring(pos+3);
  }else{
    convert_url = url;
  }
  return convert_url;
};

pb.extract_domain = function(url){
  var pos1 = 0;
  var pos2 = 0;
  var domain = "";

  pos1 = url.indexOf("/");
  pos2 = url.indexOf(":");
  if(pos2 >= 0){
    if((pos1 < 0) || (pos1 > pos2)){
      domain = url.substring(0,pos2);
    }else{
      domain = url.substring(0,pos1);
    }
  }else{
    if(pos1 >= 0){
      domain = url.substring(0,pos1);
    }else{
      domain = url;
    }
  }
  return domain;
};

pb.extract_path = function(url){
  var path = "";

  if( (url.length) != (url.indexOf("/")+1) ){
    path = url.substring(url.indexOf("/"));
  }
  return path;
};

////////////////////////////////////////////
// USB KeyBoard
////////////////////////////////////////////
var usb_kbd = {
  dead_key:TXKB_VoidSymbol
};
usb_kbd.convert_up_down = function (up_down) {
  switch (up_down) {
  case KBD_DOWN: return pb.RawKeyDown;
  case KBD_PRESS: return pb.RawKeyDown;
  case KBD_UP: return pb.KeyUp;
  default: return 0;
  }
};
usb_kbd.keysym_to_vkey = function (keysym, modifiers, ret, keycode) {
  var raw_keysym = keysym;
  if (modifiers)
    raw_keysym = ebus.kbd.keycode_to_keysym (keycode);
  switch (raw_keysym) {
  case TXKB_BackSpace: return pb.VKEY_BACK;
  case TXKB_Tab: return pb.VKEY_TAB;
  case TXKB_Clear: return pb.VKEY_CLEAR;
  case TXKB_Return: return pb.VKEY_RETURN;
  case TXKB_Pause: return pb.VKEY_PAUSE;
  case TXKB_Scroll_Lock: return pb.VKEY_SCROLL;
  case TXKB_Escape: return pb.VKEY_ESCAPE;
  case TXKB_Delete: return pb.VKEY_DELETE;
  case TXKB_Kanji: return pb.VKEY_KANJI;
  case TXKB_Muhenkan: return pb.VKEY_NONCONVERT;
  case TXKB_Henkan_Mode: return pb.VKEY_CONVERT;
  case TXKB_Home: return pb.VKEY_HOME;
  case TXKB_Left: return pb.VKEY_LEFT;
  case TXKB_Up: return pb.VKEY_UP;
  case TXKB_Right: return pb.VKEY_RIGHT;
  case TXKB_Down: return pb.VKEY_DOWN;
  case TXKB_Prior: return pb.VKEY_PRIOR;
  case TXKB_Page_Up: return pb.VKEY_PRIOR;
  case TXKB_Next: return pb.VKEY_NEXT;
  case TXKB_Page_Down: return pb.VKEY_NEXT;
  case TXKB_End: return pb.VKEY_END;
  case TXKB_Select: return pb.VKEY_SELECT;
  case TXKB_Print: return pb.VKEY_PRINT;
  case TXKB_Execute: return pb.VKEY_EXECUTE;
  case TXKB_Insert: return pb.VKEY_INSERT;
  case TXKB_Menu: return pb.VKEY_MENU;
  case TXKB_Help: return pb.VKEY_HELP;
  case TXKB_Mode_switch: return pb.VKEY_MODECHANGE;
  case TXKB_Num_Lock: return pb.VKEY_NUMLOCK;
  case TXKB_KP_Multiply: return pb.VKEY_MULTIPLY;
  case TXKB_KP_Add: return pb.VKEY_ADD;
  case TXKB_KP_Subtract: return pb.VKEY_SUBTRACT;
  case TXKB_KP_Decimal: return pb.VKEY_DECIMAL;
  case TXKB_KP_Divide: return pb.VKEY_DIVIDE;
  case TXKB_KP_0: return pb.VKEY_NUMPAD0;
  case TXKB_KP_1: return pb.VKEY_NUMPAD1;
  case TXKB_KP_2: return pb.VKEY_NUMPAD2;
  case TXKB_KP_3: return pb.VKEY_NUMPAD3;
  case TXKB_KP_4: return pb.VKEY_NUMPAD4;
  case TXKB_KP_5: return pb.VKEY_NUMPAD5;
  case TXKB_KP_6: return pb.VKEY_NUMPAD6;
  case TXKB_KP_7: return pb.VKEY_NUMPAD7;
  case TXKB_KP_8: return pb.VKEY_NUMPAD8;
  case TXKB_KP_9: return pb.VKEY_NUMPAD9;
  case TXKB_F1: return pb.VKEY_F1;
  case TXKB_F2: return pb.VKEY_F2;
  case TXKB_F3: return pb.VKEY_F3;
  case TXKB_F4: return pb.VKEY_F4;
  case TXKB_F5: return pb.VKEY_F5;
  case TXKB_F6: return pb.VKEY_F6;
  case TXKB_F7: return pb.VKEY_F7;
  case TXKB_F8: return pb.VKEY_F8;
  case TXKB_F9: return pb.VKEY_F9;
  case TXKB_F10: return pb.VKEY_F10;
  case TXKB_F11: return pb.VKEY_F11;
  case TXKB_F12: return pb.VKEY_F12;
  case TXKB_Shift_L: return pb.VKEY_SHIFT;
  case TXKB_Shift_R: return pb.VKEY_SHIFT;
  case TXKB_Control_L: return pb.VKEY_CONTROL;
  case TXKB_Control_R: return pb.VKEY_CONTROL;
  case TXKB_Caps_Lock: return pb.VKEY_CAPITAL;
  case TXKB_Alt_L: return pb.VKEY_MENU;
  case TXKB_Alt_R: return pb.VKEY_MENU;
  case TXKB_Super_L: return pb.VKEY_LWIN;
  case TXKB_Super_R: return pb.VKEY_RWIN;
  default:
    var raw_ret = ret;
    if (keysym != raw_keysym)
      raw_ret = ebus.kbd.keysym_to_string(TXKB_VoidSymbol, raw_keysym);
    switch (raw_ret) {
    case KBD_CONTROLKEY:
    case KBD_DEADKEY:
      return 0;
    default:
      var code = raw_ret.charCodeAt(0);
      if ((code >= 0x30 && code <= 0x39)
	    || (code >= 0x41 && code <= 0x5a))
        return code;		// VKEY_0 ... VKEY_9, VKEY_A ... VKEY_Z
      if (code >= 0x61 && code <= 0x7a)
        return code-0x20;	// VKEY_A ... VKEY_Z
      switch (raw_ret) {
      case ';': 
      case ':': 
        return pb.VKEY_OEM_1;
      case '+':
      case '=':
        return pb.VKEY_OEM_PLUS;
      case ',':
      case '<':
        return pb.VKEY_OEM_COMMA;
      case '-':
      case '_':
        return pb.VKEY_OEM_MINUS;
      case '.':
      case '>':
        return pb.VKEY_OEM_PERIOD;
      case '/': 
      case '?': 
        return pb.VKEY_OEM_2;
      case '`':
      case '~':
        return pb.VKEY_OEM_3;
      case '[':
      case '{':
        return pb.VKEY_OEM_4;
      case '\\':
      case '|':
        return pb.VKEY_OEM_5;
      case ']':
      case '}':
        return pb.VKEY_OEM_6;
      case '\'':
      case '\"':
        return pb.VKEY_OEM_7;
      default:
        return 0;
      }
    }
  }
};
usb_kbd.convert_modifiers = function (mod) {
  switch (mod) {
  case KBD_MOD_CONTROL_L: return pb.CtrlKey;
  case KBD_MOD_CONTROL_R: return pb.CtrlKey;
  case KBD_MOD_SHIFT_L: return pb.ShiftKey;
  case KBD_MOD_SHIFT_R: return pb.ShiftKey;
  case KBD_MOD_ALT_L: return pb.AltKey;
  case KBD_MOD_ALT_R: return pb.AltKey;
  default: return 0;
  }
};
usb_kbd.key_hook = function (stage, device, event) {
  if (event != ebus.kbd.KEYSYM_EV)
    return;
  var up_down = usb_kbd.convert_up_down(arguments[3]);
  var keysym = arguments[4];
  var ret = ebus.kbd.keysym_to_string(usb_kbd.dead_key, keysym);
  var modifiers = usb_kbd.convert_modifiers(arguments[5]);
  var vkey = usb_kbd.keysym_to_vkey (keysym, modifiers, ret, arguments[6]);
  switch (ret) {
  case KBD_CONTROLKEY:
    // add dead_key func
    if (keysym == TXKB_BackSpace) {
      usb_kbd.dead_key = TXKB_VoidSymbol;
    }
    if (vkey == pb.VKEY_RETURN) {
      if ((arguments[3] == KBD_PRESS) || (arguments[3] == KBD_UP))
        ebus.pbrowser[0].request (false, null, pb.SEND_KEYCODE, up_down, vkey, modifiers, "\r");
      if (arguments[3] == KBD_PRESS)
        ebus.pbrowser[0].request (false, null, pb.SEND_KEYCODE, pb.Char, vkey, modifiers, "\r");
    }
    else {
      if ((arguments[3] == KBD_PRESS) || (arguments[3] == KBD_UP))
        ebus.pbrowser[0].request (false, null, pb.SEND_KEYCODE, up_down, vkey, modifiers);
    }
    break;
  case KBD_DEADKEY:
    if (arguments[3] == KBD_PRESS)
      usb_kbd.dead_key = arguments[4];
    return;
  default:
    // add dead_key func
    if (arguments[3] == KBD_PRESS)
      usb_kbd.dead_key = TXKB_VoidSymbol;

    if ((arguments[3] == KBD_PRESS) || (arguments[3] == KBD_UP))
      ebus.pbrowser[0].request (false, null, pb.SEND_KEYCODE, up_down, vkey, modifiers, ret);
    if (arguments[3] == KBD_PRESS)
      ebus.pbrowser[0].request (false, null, pb.SEND_TEXTCODE, 0, ret);
    break;
  }
};

////////////////////////////////////////////
// Control Input Device
////////////////////////////////////////////
var input_dev = {};
input_dev.init = function(){
  this.mode = "key";
  this.pointer_status = false;
};
input_dev.set_move_mode = function(mode){
  if(mode == this.mode) return;
  if(mode == "free"){
    this.pointer_appear();
    this.mode = "free";
    this.set_free();
  }else if(mode == "key"){
    this.pointer_disappear();
    this.mode = "key";
    this.set_key();
  }else{
    this.pointer_appear();
    this.mode = "hybrid";
    this.set_hybrid();
  }
};
input_dev.get_move_mode = function(){
  return this.mode;
};
input_dev.pointer_appear = function(){
  if(system.cursor_pointer){
    system.cursor_pointer.set_timeout(0);
    system.cursor_pointer.force_show();
    this.set_pointer_status(true);
  }
};
input_dev.pointer_disappear = function(){
  if(system.cursor_pointer){
    system.cursor_pointer.set_current_index( 31 ); // CURSOR_INVISIBLE_INDEX
    system.cursor_pointer.set_timeout(1);
    system.cursor_pointer.force_show();
    this.set_pointer_status(false);
  }
};
input_dev.set_pointer_status = function(state){
  this.pointer_status = state;
};
input_dev.get_pointer_status = function(){
  return this.pointer_status;
};
input_dev.set_key = function(){
  if(system.input_dev)
    system.input_dev.key.set_dispatch({destination:system.input_dev.DISPATCH_DEFAULT});
  if(system.input_dev && system.input_dev.mouse)
    system.input_dev.mouse.set_dispatch({destination:system.input_dev.DISPATCH_TXK_KEY});
  if(system.input_dev)
    system.input_dev.touchpad.set_dispatch({destination:system.input_dev.DISPATCH_TXK_KEY});
  if(system.input_dev && system.input_dev.kbd)
    system.input_dev.kbd.set_dispatch ({destination:system.input_dev.DISPATCH_DEFAULT});
  add_event_hook (ebus.kbd, usb_kbd.key_hook);
};
input_dev.set_free = function(){
  if(system.input_dev)
    system.input_dev.key.set_dispatch({
      destination:system.input_dev.DISPATCH_EBUS_MOUSE,unused_to_default:true,
      right_click_time:750});
  if(system.input_dev && system.input_dev.mouse)
    system.input_dev.mouse.set_dispatch({
      destination:system.input_dev.DISPATCH_EBUS_MOUSE,unused_to_default:true});
  if(system.input_dev)
    system.input_dev.touchpad.set_dispatch({
      destination:system.input_dev.DISPATCH_EBUS_MOUSE,unused_to_default:true});
  if(system.input_dev && system.input_dev.kbd)
    system.input_dev.kbd.set_dispatch ({
      destination:system.input_dev.DISPATCH_EBUS_MOUSE,unused_to_default:true});
};
input_dev.set_hybrid = function(){
  system.input_dev.key.set_dispatch({destination:system.input_dev.DISPATCH_DEFAULT});
  if(system.input_dev && system.input_dev.kbd)
    system.input_dev.kbd.set_dispatch ({destination:system.input_dev.DISPATCH_DEFAULT});
  if(system.input_dev && system.input_dev.mouse)
    system.input_dev.mouse.set_dispatch({
      destination:system.input_dev.DISPATCH_EBUS_MOUSE,unused_to_default:true});
  if(system.input_dev)
    system.input_dev.touchpad.set_dispatch({
      destination:system.input_dev.DISPATCH_EBUS_MOUSE,unused_to_default:true});
};

////////////////////////////////////////////
// Error Popup
////////////////////////////////////////////
var error_popup = new pkg_parts.popup_panel();
function show_error(param) {
  param = param || {};
  enable_keyhook = false;
  if (error_popup.is_visible()) return;
  error_popup.appear({text:param.text, title:param.title,
                      width:1000, height:800, translate:[0,0,1],
                      focus_obj:Cursor, focus_offset:[0.0,0,1],
                      appear_cb:function(){
                        common_key.set_cursor(sobj, error_popup);
                        Cursor.appear();
                        enable_keyhook = true;
                      },
                      return_cb:param.return_cb,
                      btn_cb:param.btn_cb, btn_offset:-250, btn_text:param.btn_list
                     });
};
function show_normal_error () {
  var btn_list = [W_TEXT.W_OK];
  var btn_cb = [function(){
    common_key.set_cursor(sobj, pb);
  }];
  show_error({text:W_TEXT.W_NORMAL_ERROR, title:W_TEXT.W_ERR_TITLE,
              btn_cb:btn_cb, return_cb:btn_cb[0], btn_list:btn_list});
};

////////////////////////////////////////////
//Software Keyboard
////////////////////////////////////////////
var sft_keyboard = new container({visible_p:false});
sft_keyboard.create = function(){
  if(this.components.length == 0){
    require("pkg_keyboard");
    pkg_keyboard.set_skin_info({color:brw_param.get_data(BRW_PRM_KEYBOARD_CL), size:"MEDIUM"});
    this.kb_item = pkg_keyboard.create();
    this.components.push(this.kb_item);
    this.kb_item.set_height_change_callback(this.change_kb_height);
    this.kb_item.set_done_callback(sft_keyboard.done_enter_action, "UP");
    this.kb_item.set_cancel_callback(sft_keyboard.cancel_enter_action);
    this.change_kb_height(this.kb_item.get_height());
    this.pos_y = -540+this.height/2;
    this.moveTo = pkg_parts.MoveTo;
  }

  if (ebus && ebus.kbd && ebus.kbd.supported) {
    add_event_hook(ebus.kbd, sft_keyboard.kb_item.usb_key_hook);
  }
};

sft_keyboard.set_passwd_mode = function(){
  this.kb_item.set_mode("PASSWD");
};

sft_keyboard.set_input_char = function(val){
  this.kb_item.change_input_char_set({type:val});
};

sft_keyboard.appear = function(param){
  var r = 39;
  sft_keyboard.create();
  this.translate[1] = -540-this.height/2;
  this.moveTo({x:0,y:-540+this.height/2,z:0.1,end_func:function(){
    common_key.set_cursor(sobj, sft_keyboard);
  }});
  this.kb_item.setText(param.text);
  this.visible_p = true;
  this.kb_item.set_move_mode("free");
  input_dev.set_move_mode("hybrid");
  input_dev.pointer_appear();
};

sft_keyboard.disappear = function(){
  var self = this;
  del_event_hook(ebus.kbd);
  input_dev.set_move_mode(brw_param.get_data(BRW_PRM_MODE));

  this.moveTo({x:0,y:-540-this.height/2,z:0,end_func:function(){
    self.visible_p = false;
    self.free();
  }});
};

sft_keyboard.free = function(){
  if (this.components.length == 0){
    return;
  }
  if(this.kb_item.free) this.kb_item.free();
  this.components.splice(0, this.components.length);
};

sft_keyboard.enter_focus = function() {
  common_key.set_cursor(this, this.kb_item);
};

sft_keyboard.leave_focus = function() {
  common_key.set_cursor(this, null);
};

sft_keyboard.done_enter_action = function(){
  common_key.set_cursor(sobj, pb);
  pb.enter_text({text:sft_keyboard.kb_item.getText()});
  sft_keyboard.disappear();
};

sft_keyboard.cancel_enter_action = function(){
  sft_keyboard.disappear();
  pb.cancel_text();
  common_key.set_cursor(sobj, pb);
};

sft_keyboard.change_kb_height = function(height){
  var self = sft_keyboard;
  self.height = height;
  self.translate = [0,-540+self.height/2,0.1];
  self.kb_item.set_translate([0,height/2,0]);
  self.pos_y = self.translate[1];
};

sft_keyboard.key_hook = function(up_down, key) {
  var ret = false;
  if(this.cursor == this.kb_item) {
    if((key == TXK_UP) || (key == TXK_DOWN)
      || (key == TXK_LEFT) || (key == TXK_RIGHT))
      this.kb_item.set_move_mode("key");
    ret = this.kb_item.keyhook(up_down, key);
  }

  return true;
};

var splash_screen = new container({visible_p:false});
splash_screen.create = function() {
  if (this.components.length > 0) return;
  this.components = [splash_image];
};
splash_screen.free = function() {
  splash_image.src = "";
}
splash_screen.appear = function() {
  this.create();
  this.visible_p = true;
};
splash_screen.disappear = function() {
  this.visible_p = false;
  this.free();
}
splash_screen.appear();

////////////////////////////////////////////
// Initial Paramater Manager
////////////////////////////////////////////
var BRW_PRM_RENDERING_W    = 1;
var BRW_PRM_RENDERING_H    = 2;
var BRW_PRM_MODE           = 3;
var BRW_PRM_KEYBOARD       = 4;
var BRW_PRM_KEYBOARD_CL    = 5;
var BRW_PRM_USER_AGENT     = 6;
var BRW_PRM_CONSOLE_LOG    = 7;
var BRW_PRM_ALLOWED_DOMAIN = 8;
var BRW_PRM_SPATIAL_NAVIGATION = 9;
var BRW_PRM_DRAW_TYPE      = 10;
var BRW_PRM_PICTURE_QUALITY = 11;
var BRW_PRM_AUDIO_OUTPUT_BITSTREAM = 12;
var BRW_PRM_KEY_REPEAT     = 13;
var BRW_PRM_WITH_CLIENT_CERT= 14;
var BRW_PRM_DIAL_NAME      = 15;
var BRW_PRM_SPLASH_IMAGE   = 16;
var BRW_PRM_RUNTIMEFEATURES= 17;
var BRW_PRM_PROFILE        = 18;

var brw_param = {};
brw_param.init = function(){
  this.rendering_w = 1920;
  this.rendering_h = 1080;
  this.mode = "free";
  this.keyboard = false;
  this.keyboard_cl = "WHITE";
  this.user_agent = "";
  this.console_log = false;
  this.allowed_domain = null;
  this.spatial_navigation = false;
  this.draw_type = INSCRIBED;
  this.picture_quality = null;
  this.audio_output_bitstream = false;
  this.key_repeat = false;
  this.with_client_cert = false;
  this.dial_name = null;
  this.splash_image = "";
  this.profile = "sta";
};

brw_param.file_read = function(){
  var data;
  var self = this;
  var path_init;
  if (app_info && app_info.init_json) {
    path_init = app_info.init_json;
  } else if (app_info && app_info.url) {
    path_init = app_info.url.substring(0, app_info.url.lastIndexOf("/")) +"/init.json";
  } else if (partner_info && partner_info.init_json) {
    path_init = partner_info.init_json;
  } else if (partner_info && partner_info.url) {
    path_init = partner_info.url.match("^.*/")[0] + "init.json";
  } else {
    path_init = "http://" + pb.server_name + "/sdkhtml/init.json";
  }

  var req =
  {
    url   :path_init,
    method:"GET",
    sync  :false,
    onload:function(result, header, body){
      brw_param.file_read_cb(result, header, body);
    },
  };
  data = http_request( req );
  return data;
};

brw_param.file_read_cb = function(result, header, body){
  var data;
  if(result == 200){
    try{
      data = eval( "( "+body+" );" );
      brw_param.set_data(data);
      if(brw_param.get_data(BRW_PRM_KEYBOARD))
        prepare_package("pkg_keyboard");
      if(brw_param.get_data(BRW_PRM_CONSOLE_LOG)){
        if (!app_info) {
          require("console");
          var server_name = pb.server_name;
          if (partner_info && partner_info.console_path) {
            server_name = partner_info.console_path;
          } else if (partner_info && partner_info.url) {
            server_name = partner_info.url.match("^.*/")[0];
          }
          remote_console.set_path(server_name);
          remote_console.start();
        }
      }
      
      // splash iamge
      var splash = brw_param.get_data(BRW_PRM_SPLASH_IMAGE);
      if (splash && splash_image.src != splash) {
        splash_image.src = splash;
      }

      // draw mode support
      if(brw_video_box){
        brw_video_box.draw_type = brw_param.get_data(BRW_PRM_DRAW_TYPE);
      }
      // Picture quality set default level
      if (system.picture_quality && system.picture_quality.set_default_level) {
        if (this.picture_quality != null) {
          system.picture_quality.set_default_level (this.picture_quality);
          console.log("[picture_quality] set default level: " + this.picture_quality);
        }
      }
      // Audio output set bitstream on SPDIF
      if (this.audio_output_bitstream) {
        console.log("[audio_output_bitstream] enable");
	try {
	  system.sound_quality.set_audio_out_format(SQ_AUDIO_OUT_BITSTREAM);
	}catch(e){
	  var player = new MoviePlayer2({});
	  player.connect(VideoDev,AudioDev);
	  player.set_audio_out_format(player.AUDIO_OUT_BITSTREAM);
	  player.disconnect();
	}
      }
      // Key repeat settings
      pb.set_key_repeat(brw_param.get_data(BRW_PRM_KEY_REPEAT));
    }catch( e ){
      console.log("[brw_param.file_read_cb]fail");
    }
  }

  // extensions
  try {
    var opt = [];
    if (app_info && app_info.extensions) {
      opt = app_info.extensions.split(",");
    }
    else if (_uri.match("sdkhtml/main.js")) {
      var ext = _uri.match("[\?&]extensions=([^&]+)");
      if (ext && ext.length > 1) {
        opt = decodeURIComponent(ext[1]).split(",");
      }
    }
  } catch(e) {
    console.log("extensions error:"+e);
  }
  pb.set_extensions(opt);

  // runtimefeatures
  try {
    var opt = [];
    if (app_info && app_info.runtimefeatures) {
      opt = app_info.runtimefeatures.split(",");
    }
    else if (_uri.match("sdkhtml/main.js")) {
      var ext = _uri.match("[\?&]runtimefeatures=([^&]+)");
      if (ext && ext.length > 1) {
        opt = decodeURIComponent(ext[1]).split(",");
      }
    }
    var p = brw_param.get_data(BRW_PRM_RUNTIMEFEATURES);
    if (p) {
      opt = opt.concat(p);
    }
  } catch(e) {
    console.log("runtimefeatures error:"+e);
  }
  pb.set_runtimefeatures(opt);

  // launch
  var launch_arg = {width:1920, height:1080, "is_fullscreen_available":false};

  // check for newarch and hbbtv profile
  if (brw_param.get_data(BRW_PRM_PROFILE) == "hbbtv" &&
        (system.product.match("14MT5591")
        || system.product.match("14PRO4")
        || system.product.match("14SLD8A")
        || system.product.match("15SLD8A")
        || system.product.match("16SLD8A"))) {
    console.log("Newarch and profile is hbbtv");
    handle_videobox_ev = videobox_no_transform;
    launch_arg = {width:1280, height:720, "is_fullscreen_available":false};
  }

  var extensions = pb.get_extensions();
  if (extensions)
  {
    if (extensions.indexOf("amazon") != -1)
      launch_arg["with_background"] = false;
  }
  if (app_info)
  {
    if (isBoolean (app_info.with_background))
      launch_arg["with_background"] = app_info.with_background;
  }
  ebus.pbrowser[0].launch(launch_arg);
  input_dev.set_move_mode(brw_param.get_data(BRW_PRM_MODE));
};

brw_param.set_data = function(data){
  this.rendering_w = data.rendering_size.width ? data.rendering_size.width : 1920;
  this.rendering_h = data.rendering_size.height ? data.rendering_size.height : 1080;
  this.mode = data.mode ? data.mode : "free";
  this.keyboard = data.keyboard.use ? data.keyboard.use : false;
  this.keyboard_cl = data.keyboard.color ? data.keyboard.color : "WHITE";
  this.user_agent = data.user_agent ? data.user_agent : "";
  this.console_log = data.console_log ? data.console_log : false;
  this.allowed_domain = data.allowed_domain ? data.allowed_domain : null;
  if((this.allowed_domain) && (this.allowed_domain.length == 0)) this.allowed_domain = null;
  this.spatial_navigation = data.spatial_navigation ? data.spatial_navigation : false;
  this.draw_type = data.draw_type ? data.draw_type : INSCRIBED;
  if (system.picture_quality && system.picture_quality.set_default_level) {
    if(data.picture_quality == "PQ_LEVEL_LOW")
      this.picture_quality = PQ_LEVEL_LOW;
    else if(data.picture_quality == "PQ_LEVEL_HIGH")
      this.picture_quality = PQ_LEVEL_HIGH;
  }
  this.audio_output_bitstream = data.audio_output_bitstream ? data.audio_output_bitstream : false;
  this.key_repeat = data.key_repeat ? data.key_repeat : false;
  this.with_client_cert = data.with_client_cert ? data.with_client_cert : false;
  this.dial_name = data.dial_name ? data.dial_name : null;
  this.splash_image = data.splash_image ? data.splash_image : "";
  this.runtimefeatures = data.runtimefeatures ? data.runtimefeatures : null;
  if (data.profile) {
    console.log("Profile read:" + data.profile);
    switch (data.profile.toLowerCase()) {
      case "hbbtv":
        this.profile = "hbbtv";
        break;
      default:
        this.profile = "sta";
    }
    console.log("Profile set:" + this.profile);
  }
};

brw_param.get_data = function(kind){
  var ret_val;
  switch(kind){
    case BRW_PRM_RENDERING_W:
      ret_val = this.rendering_w;
      break;
    case BRW_PRM_RENDERING_H:
      ret_val = this.rendering_h;
      break;
    case BRW_PRM_MODE:
      ret_val = this.mode;
      break;
    case BRW_PRM_KEYBOARD:
      ret_val = this.keyboard;
      break;
    case BRW_PRM_KEYBOARD_CL:
      ret_val = this.keyboard_cl;
      break;
    case BRW_PRM_USER_AGENT:
      ret_val = this.user_agent;
      if(app_info && app_info.ua_supplement) {
        ret_val += app_info.ua_supplement;
      }
      break;
    case BRW_PRM_CONSOLE_LOG:
      ret_val = this.console_log;
      break;
    case BRW_PRM_ALLOWED_DOMAIN:
      ret_val = this.allowed_domain;
      break;
    // spatial_navigation support
    case BRW_PRM_SPATIAL_NAVIGATION:
      ret_val = this.spatial_navigation;
      break;
    // draw mode support
    case BRW_PRM_DRAW_TYPE:
      ret_val = this.draw_type;
      break;
    case BRW_PRM_PICTURE_QUALITY:
      ret_val = this.picture_quality;
      break;
    case BRW_PRM_AUDIO_OUTPUT_BITSTREAM:
      ret_val = this.audio_output_bitstream;
      break;
    case BRW_PRM_KEY_REPEAT:
      ret_val = this.key_repeat;
      break;    
    case BRW_PRM_WITH_CLIENT_CERT:
      ret_val = this.with_client_cert;
      break;    
    case BRW_PRM_DIAL_NAME:
      ret_val = (this.dial_name);
      if (!ret_val && app_info && app_info.dial_name)
        ret_val = app_info.dial_name;
      break;
    case BRW_PRM_SPLASH_IMAGE:
      ret_val = this.splash_image;
      break;
    case BRW_PRM_RUNTIMEFEATURES:
      ret_val = this.runtimefeatures;
      break;
    case BRW_PRM_PROFILE:
      ret_val = this.profile;
    default:
      break;
  }
  return ret_val;
};

var appli_start = function(obj){
  set_screen_mode(OSD_ONLY_MODE);
  brw_win.src = ebus.pbrowser[0].pixmap;
  set_cursor(sobj, pb);
  brw_param.init();
  pb.browser_init();
  brw_param.file_read();
  if(set_pointer_hit_symbol) set_pointer_hit_symbol("action");
  if(ebus.mouse) add_event_hook(ebus.mouse, pb.mouse_hook);
  if(ebus.mouse) ebus.mouse.set_callback_symbol("click", "action");
  complete_on_stage(obj);
  enable_keyhook = true;
};

var common_out_hook = function() {
  ebus.pbrowser[0].request(false, null, pb.WINDOW_CLOSE);
  exit_appli(0);
};

var brw_win = new gwindow({width:1920, height:1080});
var Cursor = new pkg_parts.cursor_item({});

var sobj = stage({
  symbol: "sdkhtml",
  in:
  [
    {
	  from:["default"],
	  hook:appli_start
    }
  ],
  out:
  [
    {
      from:["default"],
      hook: function(){
        complete_off_stage(this);
	  }
    }
  ],
  bg_image:[
    new gbox({width:1920, height:1080, color:[32,32,32,255]})
  ],
  components:[
    brw_video = new container({
	  translate: [0, 0, 0],
	  components:[
        brw_video_box = new videobox({"width":1920, "height":1080,
                                       "overscan": false,
                                       "draw_type": INSCRIBED,
                                       "h_reverse": false,
                                       "translate": [0, 0, 0],
                                       "color": [255, 255, 255, 0],
                                       "visible_p": false})
	  ]
    }),
    brw_win,
    hide_panel,
    error_popup,
    Cursor,
    sft_keyboard,
    splash_screen,
  ],
  key_hook: function(up_down, key){
    if(up_down == KEY_PRESS){
      if((key == TXK_UP) || (key == TXK_DOWN)
      || (key == TXK_LEFT) || (key == TXK_RIGHT)){
        if(input_dev.get_pointer_status()){
          input_dev.pointer_disappear();
        }
      }
    }

    switch(key) {
    case TXK_HOME:
      common_out_hook();
      return true;
    };

    if(this.cursor && this.cursor.key_hook && this.cursor.key_hook(up_down,key)){
      force_redraw();
      return true;
    }
    return true;
  }
});

add_event_hook (ebus.pbrowser[0], pb.event_hook);

ready_appli();

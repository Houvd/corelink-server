/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	function webpackJsonpCallback(data) {
/******/ 		var chunkIds = data[0];
/******/ 		var moreModules = data[1];
/******/ 		var executeModules = data[2];
/******/
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0, resolves = [];
/******/ 		for(;i < chunkIds.length; i++) {
/******/ 			chunkId = chunkIds[i];
/******/ 			if(Object.prototype.hasOwnProperty.call(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 				resolves.push(installedChunks[chunkId][0]);
/******/ 			}
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules) {
/******/ 			if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
/******/ 				modules[moduleId] = moreModules[moduleId];
/******/ 			}
/******/ 		}
/******/ 		if(parentJsonpFunction) parentJsonpFunction(data);
/******/
/******/ 		while(resolves.length) {
/******/ 			resolves.shift()();
/******/ 		}
/******/
/******/ 		// add entry modules from loaded chunk to deferred list
/******/ 		deferredModules.push.apply(deferredModules, executeModules || []);
/******/
/******/ 		// run deferred modules when all chunks ready
/******/ 		return checkDeferredModules();
/******/ 	};
/******/ 	function checkDeferredModules() {
/******/ 		var result;
/******/ 		for(var i = 0; i < deferredModules.length; i++) {
/******/ 			var deferredModule = deferredModules[i];
/******/ 			var fulfilled = true;
/******/ 			for(var j = 1; j < deferredModule.length; j++) {
/******/ 				var depId = deferredModule[j];
/******/ 				if(installedChunks[depId] !== 0) fulfilled = false;
/******/ 			}
/******/ 			if(fulfilled) {
/******/ 				deferredModules.splice(i--, 1);
/******/ 				result = __webpack_require__(__webpack_require__.s = deferredModule[0]);
/******/ 			}
/******/ 		}
/******/
/******/ 		return result;
/******/ 	}
/******/
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// object to store loaded CSS chunks
/******/ 	var installedCssChunks = {
/******/ 		"app": 0
/******/ 	}
/******/
/******/ 	// object to store loaded and loading chunks
/******/ 	// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 	// Promise = chunk loading, 0 = chunk loaded
/******/ 	var installedChunks = {
/******/ 		"app": 0
/******/ 	};
/******/
/******/ 	var deferredModules = [];
/******/
/******/ 	// script path function
/******/ 	function jsonpScriptSrc(chunkId) {
/******/ 		return __webpack_require__.p + "js/" + ({"about":"about"}[chunkId]||chunkId) + "." + {"about":"827d54f5"}[chunkId] + ".js"
/******/ 	}
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/ 	// This file contains only the entry chunk.
/******/ 	// The chunk loading function for additional chunks
/******/ 	__webpack_require__.e = function requireEnsure(chunkId) {
/******/ 		var promises = [];
/******/
/******/
/******/ 		// mini-css-extract-plugin CSS loading
/******/ 		var cssChunks = {"about":1};
/******/ 		if(installedCssChunks[chunkId]) promises.push(installedCssChunks[chunkId]);
/******/ 		else if(installedCssChunks[chunkId] !== 0 && cssChunks[chunkId]) {
/******/ 			promises.push(installedCssChunks[chunkId] = new Promise(function(resolve, reject) {
/******/ 				var href = "css/" + ({"about":"about"}[chunkId]||chunkId) + "." + {"about":"b8016888"}[chunkId] + ".css";
/******/ 				var fullhref = __webpack_require__.p + href;
/******/ 				var existingLinkTags = document.getElementsByTagName("link");
/******/ 				for(var i = 0; i < existingLinkTags.length; i++) {
/******/ 					var tag = existingLinkTags[i];
/******/ 					var dataHref = tag.getAttribute("data-href") || tag.getAttribute("href");
/******/ 					if(tag.rel === "stylesheet" && (dataHref === href || dataHref === fullhref)) return resolve();
/******/ 				}
/******/ 				var existingStyleTags = document.getElementsByTagName("style");
/******/ 				for(var i = 0; i < existingStyleTags.length; i++) {
/******/ 					var tag = existingStyleTags[i];
/******/ 					var dataHref = tag.getAttribute("data-href");
/******/ 					if(dataHref === href || dataHref === fullhref) return resolve();
/******/ 				}
/******/ 				var linkTag = document.createElement("link");
/******/ 				linkTag.rel = "stylesheet";
/******/ 				linkTag.type = "text/css";
/******/ 				linkTag.onload = resolve;
/******/ 				linkTag.onerror = function(event) {
/******/ 					var request = event && event.target && event.target.src || fullhref;
/******/ 					var err = new Error("Loading CSS chunk " + chunkId + " failed.\n(" + request + ")");
/******/ 					err.code = "CSS_CHUNK_LOAD_FAILED";
/******/ 					err.request = request;
/******/ 					delete installedCssChunks[chunkId]
/******/ 					linkTag.parentNode.removeChild(linkTag)
/******/ 					reject(err);
/******/ 				};
/******/ 				linkTag.href = fullhref;
/******/
/******/ 				var head = document.getElementsByTagName("head")[0];
/******/ 				head.appendChild(linkTag);
/******/ 			}).then(function() {
/******/ 				installedCssChunks[chunkId] = 0;
/******/ 			}));
/******/ 		}
/******/
/******/ 		// JSONP chunk loading for javascript
/******/
/******/ 		var installedChunkData = installedChunks[chunkId];
/******/ 		if(installedChunkData !== 0) { // 0 means "already installed".
/******/
/******/ 			// a Promise means "currently loading".
/******/ 			if(installedChunkData) {
/******/ 				promises.push(installedChunkData[2]);
/******/ 			} else {
/******/ 				// setup Promise in chunk cache
/******/ 				var promise = new Promise(function(resolve, reject) {
/******/ 					installedChunkData = installedChunks[chunkId] = [resolve, reject];
/******/ 				});
/******/ 				promises.push(installedChunkData[2] = promise);
/******/
/******/ 				// start chunk loading
/******/ 				var script = document.createElement('script');
/******/ 				var onScriptComplete;
/******/
/******/ 				script.charset = 'utf-8';
/******/ 				script.timeout = 120;
/******/ 				if (__webpack_require__.nc) {
/******/ 					script.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 				script.src = jsonpScriptSrc(chunkId);
/******/
/******/ 				// create error before stack unwound to get useful stacktrace later
/******/ 				var error = new Error();
/******/ 				onScriptComplete = function (event) {
/******/ 					// avoid mem leaks in IE.
/******/ 					script.onerror = script.onload = null;
/******/ 					clearTimeout(timeout);
/******/ 					var chunk = installedChunks[chunkId];
/******/ 					if(chunk !== 0) {
/******/ 						if(chunk) {
/******/ 							var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 							var realSrc = event && event.target && event.target.src;
/******/ 							error.message = 'Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')';
/******/ 							error.name = 'ChunkLoadError';
/******/ 							error.type = errorType;
/******/ 							error.request = realSrc;
/******/ 							chunk[1](error);
/******/ 						}
/******/ 						installedChunks[chunkId] = undefined;
/******/ 					}
/******/ 				};
/******/ 				var timeout = setTimeout(function(){
/******/ 					onScriptComplete({ type: 'timeout', target: script });
/******/ 				}, 120000);
/******/ 				script.onerror = script.onload = onScriptComplete;
/******/ 				document.head.appendChild(script);
/******/ 			}
/******/ 		}
/******/ 		return Promise.all(promises);
/******/ 	};
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// on error function for async loading
/******/ 	__webpack_require__.oe = function(err) { console.error(err); throw err; };
/******/
/******/ 	var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
/******/ 	var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 	jsonpArray.push = webpackJsonpCallback;
/******/ 	jsonpArray = jsonpArray.slice();
/******/ 	for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
/******/ 	var parentJsonpFunction = oldJsonpFunction;
/******/
/******/
/******/ 	// add entry module to deferred list
/******/ 	deferredModules.push([0,"chunk-vendors"]);
/******/ 	// run deferred modules when ready
/******/ 	return checkDeferredModules();
/******/ })
/************************************************************************/
/******/ ({

/***/ 0:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__("56d7");


/***/ }),

/***/ "034f":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var _node_modules_mini_css_extract_plugin_dist_loader_js_ref_6_oneOf_1_0_node_modules_css_loader_dist_cjs_js_ref_6_oneOf_1_1_node_modules_vue_loader_lib_loaders_stylePostLoader_js_node_modules_postcss_loader_src_index_js_ref_6_oneOf_1_2_node_modules_cache_loader_dist_cjs_js_ref_0_0_node_modules_vue_loader_lib_index_js_vue_loader_options_App_vue_vue_type_style_index_0_lang_css___WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("85ec");
/* harmony import */ var _node_modules_mini_css_extract_plugin_dist_loader_js_ref_6_oneOf_1_0_node_modules_css_loader_dist_cjs_js_ref_6_oneOf_1_1_node_modules_vue_loader_lib_loaders_stylePostLoader_js_node_modules_postcss_loader_src_index_js_ref_6_oneOf_1_2_node_modules_cache_loader_dist_cjs_js_ref_0_0_node_modules_vue_loader_lib_index_js_vue_loader_options_App_vue_vue_type_style_index_0_lang_css___WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_mini_css_extract_plugin_dist_loader_js_ref_6_oneOf_1_0_node_modules_css_loader_dist_cjs_js_ref_6_oneOf_1_1_node_modules_vue_loader_lib_loaders_stylePostLoader_js_node_modules_postcss_loader_src_index_js_ref_6_oneOf_1_2_node_modules_cache_loader_dist_cjs_js_ref_0_0_node_modules_vue_loader_lib_index_js_vue_loader_options_App_vue_vue_type_style_index_0_lang_css___WEBPACK_IMPORTED_MODULE_0__);
/* unused harmony reexport * */


/***/ }),

/***/ "1a86":
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__.p + "img/Logo.1ab99ef0.svg";

/***/ }),

/***/ "362c":
/***/ (function(module, exports, __webpack_require__) {

// extracted by mini-css-extract-plugin

/***/ }),

/***/ "5524":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var _node_modules_mini_css_extract_plugin_dist_loader_js_ref_6_oneOf_1_0_node_modules_css_loader_dist_cjs_js_ref_6_oneOf_1_1_node_modules_vue_loader_lib_loaders_stylePostLoader_js_node_modules_postcss_loader_src_index_js_ref_6_oneOf_1_2_node_modules_cache_loader_dist_cjs_js_ref_0_0_node_modules_vue_loader_lib_index_js_vue_loader_options_Corelink_vue_vue_type_style_index_0_lang_css___WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("362c");
/* harmony import */ var _node_modules_mini_css_extract_plugin_dist_loader_js_ref_6_oneOf_1_0_node_modules_css_loader_dist_cjs_js_ref_6_oneOf_1_1_node_modules_vue_loader_lib_loaders_stylePostLoader_js_node_modules_postcss_loader_src_index_js_ref_6_oneOf_1_2_node_modules_cache_loader_dist_cjs_js_ref_0_0_node_modules_vue_loader_lib_index_js_vue_loader_options_Corelink_vue_vue_type_style_index_0_lang_css___WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_mini_css_extract_plugin_dist_loader_js_ref_6_oneOf_1_0_node_modules_css_loader_dist_cjs_js_ref_6_oneOf_1_1_node_modules_vue_loader_lib_loaders_stylePostLoader_js_node_modules_postcss_loader_src_index_js_ref_6_oneOf_1_2_node_modules_cache_loader_dist_cjs_js_ref_0_0_node_modules_vue_loader_lib_index_js_vue_loader_options_Corelink_vue_vue_type_style_index_0_lang_css___WEBPACK_IMPORTED_MODULE_0__);
/* unused harmony reexport * */


/***/ }),

/***/ "56d7":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXTERNAL MODULE: ./node_modules/core-js/modules/es.array.iterator.js
var es_array_iterator = __webpack_require__("e260");

// EXTERNAL MODULE: ./node_modules/core-js/modules/es.promise.js
var es_promise = __webpack_require__("e6cf");

// EXTERNAL MODULE: ./node_modules/core-js/modules/es.object.assign.js
var es_object_assign = __webpack_require__("cca6");

// EXTERNAL MODULE: ./node_modules/core-js/modules/es.promise.finally.js
var es_promise_finally = __webpack_require__("a79d");

// EXTERNAL MODULE: ./node_modules/vue/dist/vue.runtime.esm.js
var vue_runtime_esm = __webpack_require__("2b0e");

// CONCATENATED MODULE: ./node_modules/cache-loader/dist/cjs.js?{"cacheDirectory":"node_modules/.cache/vue-loader","cacheIdentifier":"e605ad86-vue-loader-template"}!./node_modules/vue-loader/lib/loaders/templateLoader.js??vue-loader-options!./node_modules/cache-loader/dist/cjs.js??ref--0-0!./node_modules/vue-loader/lib??vue-loader-options!./src/App.vue?vue&type=template&id=397c1b63&
var Appvue_type_template_id_397c1b63_render = function () {var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return _c('div',{attrs:{"id":"app"}},[_c('login',[_vm._v("{connection()}")]),_c('div',{attrs:{"id":"nav"}},[_c('router-link',{attrs:{"to":"/"}},[_vm._v("Home")]),_vm._v(" | "),_c('router-link',{attrs:{"to":"/about"}},[_vm._v("About")])],1),_c('router-view')],1)}
var staticRenderFns = []


// CONCATENATED MODULE: ./src/App.vue?vue&type=template&id=397c1b63&

// CONCATENATED MODULE: ./node_modules/cache-loader/dist/cjs.js?{"cacheDirectory":"node_modules/.cache/vue-loader","cacheIdentifier":"e605ad86-vue-loader-template"}!./node_modules/vue-loader/lib/loaders/templateLoader.js??vue-loader-options!./node_modules/cache-loader/dist/cjs.js??ref--0-0!./node_modules/vue-loader/lib??vue-loader-options!./src/components/login.vue?vue&type=template&id=27ba3f0c&scoped=true&
var loginvue_type_template_id_27ba3f0c_scoped_true_render = function () {var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return _c('div')}
var loginvue_type_template_id_27ba3f0c_scoped_true_staticRenderFns = []


// CONCATENATED MODULE: ./src/components/login.vue?vue&type=template&id=27ba3f0c&scoped=true&

// CONCATENATED MODULE: ./node_modules/cache-loader/dist/cjs.js??ref--12-0!./node_modules/thread-loader/dist/cjs.js!./node_modules/babel-loader/lib!./node_modules/cache-loader/dist/cjs.js??ref--0-0!./node_modules/vue-loader/lib??vue-loader-options!./src/components/login.vue?vue&type=script&lang=js&
//
//
//
//
//
//
//

/*global corelink*/
/* harmony default export */ var loginvue_type_script_lang_js_ = ({
  name: 'login',
  method: {
    connection: function connection() {
      console.log("vsdfbjhbfvjdhbfvhbhfvjbhjfbhjb");
      var token = localStorage.getItem('jwt');
      corelink.connect({
        token: token
      }, {
        ControlIP: this.host,
        ControlPort: parseInt(this.port)
      }).then(function () {
        console.log('voildaaaaaa');
      }).catch(function (e) {
        return console.log(e);
      });
    },
    mounted: function mounted() {
      console.log("vsdfbjhbfvjdhbfvhbhfvjbhjfbhjb");
      this.connection();
    },
    commuted: function commuted() {
      console.log("vsdfbjhbfvjdhbfvhbhfvjbhjfbhjb");
      this.connection();
    }
  }
});
// CONCATENATED MODULE: ./src/components/login.vue?vue&type=script&lang=js&
 /* harmony default export */ var components_loginvue_type_script_lang_js_ = (loginvue_type_script_lang_js_); 
// EXTERNAL MODULE: ./node_modules/vue-loader/lib/runtime/componentNormalizer.js
var componentNormalizer = __webpack_require__("2877");

// CONCATENATED MODULE: ./src/components/login.vue





/* normalize component */

var component = Object(componentNormalizer["a" /* default */])(
  components_loginvue_type_script_lang_js_,
  loginvue_type_template_id_27ba3f0c_scoped_true_render,
  loginvue_type_template_id_27ba3f0c_scoped_true_staticRenderFns,
  false,
  null,
  "27ba3f0c",
  null
  
)

/* harmony default export */ var login = (component.exports);
// CONCATENATED MODULE: ./node_modules/cache-loader/dist/cjs.js??ref--12-0!./node_modules/thread-loader/dist/cjs.js!./node_modules/babel-loader/lib!./node_modules/cache-loader/dist/cjs.js??ref--0-0!./node_modules/vue-loader/lib??vue-loader-options!./src/App.vue?vue&type=script&lang=js&
//
//
//
//
//
//
//
//
//
//
//

/* harmony default export */ var Appvue_type_script_lang_js_ = ({
  name: 'App',
  components: {
    login: login
  }
});
// CONCATENATED MODULE: ./src/App.vue?vue&type=script&lang=js&
 /* harmony default export */ var src_Appvue_type_script_lang_js_ = (Appvue_type_script_lang_js_); 
// EXTERNAL MODULE: ./src/App.vue?vue&type=style&index=0&lang=css&
var Appvue_type_style_index_0_lang_css_ = __webpack_require__("034f");

// CONCATENATED MODULE: ./src/App.vue






/* normalize component */

var App_component = Object(componentNormalizer["a" /* default */])(
  src_Appvue_type_script_lang_js_,
  Appvue_type_template_id_397c1b63_render,
  staticRenderFns,
  false,
  null,
  null,
  null
  
)

/* harmony default export */ var App = (App_component.exports);
// EXTERNAL MODULE: ./node_modules/vue-plugin-load-script/index.js
var vue_plugin_load_script = __webpack_require__("67b0");

// EXTERNAL MODULE: ./node_modules/vuelidate/lib/index.js
var lib = __webpack_require__("1dce");
var lib_default = /*#__PURE__*/__webpack_require__.n(lib);

// EXTERNAL MODULE: ./node_modules/vue-cookies/vue-cookies.js
var vue_cookies = __webpack_require__("2b27");
var vue_cookies_default = /*#__PURE__*/__webpack_require__.n(vue_cookies);

// EXTERNAL MODULE: ./node_modules/vue-router/dist/vue-router.esm.js
var vue_router_esm = __webpack_require__("8c4f");

// EXTERNAL MODULE: ./node_modules/core-js/modules/es.object.to-string.js
var es_object_to_string = __webpack_require__("d3b7");

// CONCATENATED MODULE: ./node_modules/cache-loader/dist/cjs.js?{"cacheDirectory":"node_modules/.cache/vue-loader","cacheIdentifier":"e605ad86-vue-loader-template"}!./node_modules/vue-loader/lib/loaders/templateLoader.js??vue-loader-options!./node_modules/cache-loader/dist/cjs.js??ref--0-0!./node_modules/vue-loader/lib??vue-loader-options!./src/views/Home.vue?vue&type=template&id=1ac133d1&
var Homevue_type_template_id_1ac133d1_render = function () {var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return _c('div',{staticClass:"home"},[_c('img',{attrs:{"alt":"Vue logo","src":__webpack_require__("1a86")}}),_c('HelloWorld',{attrs:{"msg":"Welcome to Corelink: Real Time Research Networking"}}),_c('Corelink')],1)}
var Homevue_type_template_id_1ac133d1_staticRenderFns = []


// CONCATENATED MODULE: ./src/views/Home.vue?vue&type=template&id=1ac133d1&

// CONCATENATED MODULE: ./node_modules/cache-loader/dist/cjs.js?{"cacheDirectory":"node_modules/.cache/vue-loader","cacheIdentifier":"e605ad86-vue-loader-template"}!./node_modules/vue-loader/lib/loaders/templateLoader.js??vue-loader-options!./node_modules/cache-loader/dist/cjs.js??ref--0-0!./node_modules/vue-loader/lib??vue-loader-options!./src/components/HelloWorld.vue?vue&type=template&id=4b042176&scoped=true&
var HelloWorldvue_type_template_id_4b042176_scoped_true_render = function () {var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return _c('div',{staticClass:"hello"},[_c('h1',[_vm._v(_vm._s(_vm.msg))])])}
var HelloWorldvue_type_template_id_4b042176_scoped_true_staticRenderFns = []


// CONCATENATED MODULE: ./src/components/HelloWorld.vue?vue&type=template&id=4b042176&scoped=true&

// CONCATENATED MODULE: ./node_modules/cache-loader/dist/cjs.js??ref--12-0!./node_modules/thread-loader/dist/cjs.js!./node_modules/babel-loader/lib!./node_modules/cache-loader/dist/cjs.js??ref--0-0!./node_modules/vue-loader/lib??vue-loader-options!./src/components/HelloWorld.vue?vue&type=script&lang=js&
//
//
//
//
//
//
//
/* harmony default export */ var HelloWorldvue_type_script_lang_js_ = ({
  name: 'HelloWorld',
  props: {
    msg: String
  }
});
// CONCATENATED MODULE: ./src/components/HelloWorld.vue?vue&type=script&lang=js&
 /* harmony default export */ var components_HelloWorldvue_type_script_lang_js_ = (HelloWorldvue_type_script_lang_js_); 
// EXTERNAL MODULE: ./src/components/HelloWorld.vue?vue&type=style&index=0&id=4b042176&scoped=true&lang=css&
var HelloWorldvue_type_style_index_0_id_4b042176_scoped_true_lang_css_ = __webpack_require__("ab90");

// CONCATENATED MODULE: ./src/components/HelloWorld.vue






/* normalize component */

var HelloWorld_component = Object(componentNormalizer["a" /* default */])(
  components_HelloWorldvue_type_script_lang_js_,
  HelloWorldvue_type_template_id_4b042176_scoped_true_render,
  HelloWorldvue_type_template_id_4b042176_scoped_true_staticRenderFns,
  false,
  null,
  "4b042176",
  null
  
)

/* harmony default export */ var HelloWorld = (HelloWorld_component.exports);
// CONCATENATED MODULE: ./node_modules/cache-loader/dist/cjs.js?{"cacheDirectory":"node_modules/.cache/vue-loader","cacheIdentifier":"e605ad86-vue-loader-template"}!./node_modules/vue-loader/lib/loaders/templateLoader.js??vue-loader-options!./node_modules/cache-loader/dist/cjs.js??ref--0-0!./node_modules/vue-loader/lib??vue-loader-options!./src/components/Corelink.vue?vue&type=template&id=d0ca17dc&
var Corelinkvue_type_template_id_d0ca17dc_render = function () {var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return _c('div',[(!_vm.loggedIn)?_c('form',{attrs:{"id":"loginForm"},on:{"submit":function($event){$event.preventDefault();return _vm.submit($event)}}},[_c('div',{staticClass:"row"},[_c('div',{staticClass:"col-12 form-group"},[_vm._m(0),_c('input',{directives:[{name:"model",rawName:"v-model.trim",value:(_vm.$v.username.$model),expression:"$v.username.$model",modifiers:{"trim":true}}],staticClass:"form-control form-control-lg",class:{'is-invalid': _vm.validationStatus(_vm.$v.username)},attrs:{"type":"text"},domProps:{"value":(_vm.$v.username.$model)},on:{"input":function($event){if($event.target.composing){ return; }_vm.$set(_vm.$v.username, "$model", $event.target.value.trim())},"blur":function($event){return _vm.$forceUpdate()}}}),( !_vm.$v.username.required && _vm.$v.username)?_c('div',{staticClass:"invalid-feedback"},[_vm._v("The Username field is required.")]):_vm._e()]),_c('div',{staticClass:"col-12 form-group"},[_vm._m(1),_c('input',{directives:[{name:"model",rawName:"v-model.trim",value:(_vm.$v.password.$model),expression:"$v.password.$model",modifiers:{"trim":true}}],staticClass:"form-control form-control-lg",class:{'is-invalid': _vm.validationStatus(_vm.$v.password)},attrs:{"type":"password"},domProps:{"value":(_vm.$v.password.$model)},on:{"input":function($event){if($event.target.composing){ return; }_vm.$set(_vm.$v.password, "$model", $event.target.value.trim())},"blur":function($event){return _vm.$forceUpdate()}}}),(!_vm.$v.password.required)?_c('div',{staticClass:"invalid-feedback"},[_vm._v("The password field is required.")]):_vm._e()]),_c('div',{staticClass:"col-12 form-group"},[_vm._m(2),_c('select',{directives:[{name:"model",rawName:"v-model.trim",value:(_vm.$v.host.$model),expression:"$v.host.$model",modifiers:{"trim":true}}],staticClass:"form-control form-control-lg",class:{'is-invalid': _vm.validationStatus(_vm.$v.host)},on:{"change":function($event){var $$selectedVal = Array.prototype.filter.call($event.target.options,function(o){return o.selected}).map(function(o){var val = "_value" in o ? o._value : o.value;return val}); _vm.$set(_vm.$v.host, "$model", $event.target.multiple ? $$selectedVal : $$selectedVal[0])}}},[_c('option',{attrs:{"value":""}},[_vm._v("Select host")]),_vm._l((_vm.hostList),function(c){return _c('option',{key:c,domProps:{"value":c}},[_vm._v(_vm._s(c))])})],2),(!_vm.$v.host.required)?_c('div',{staticClass:"invalid-feedback"},[_vm._v("The host field is required.")]):_vm._e()]),_c('div',{staticClass:"col-12 form-group"},[_vm._m(3),_c('select',{directives:[{name:"model",rawName:"v-model.trim",value:(_vm.$v.port.$model),expression:"$v.port.$model",modifiers:{"trim":true}}],staticClass:"form-control form-control-lg",class:{'is-invalid': _vm.validationStatus(_vm.$v.port)},on:{"change":function($event){var $$selectedVal = Array.prototype.filter.call($event.target.options,function(o){return o.selected}).map(function(o){var val = "_value" in o ? o._value : o.value;return val}); _vm.$set(_vm.$v.port, "$model", $event.target.multiple ? $$selectedVal : $$selectedVal[0])}}},[_c('option',{attrs:{"value":""}},[_vm._v("Select port")]),_vm._l((_vm.portList),function(c){return _c('option',{key:c,domProps:{"value":c}},[_vm._v(_vm._s(c))])})],2),(!_vm.$v.port.required)?_c('div',{staticClass:"invalid-feedback"},[_vm._v("The port field is required.")]):_vm._e()]),_vm._m(4)])]):_vm._e(),(_vm.loggedIn)?_c('div',{attrs:{"id":"loggedIn"}},[_c('h2',[_vm._v(" voila logged in")]),_c('router-link',{attrs:{"to":"/dashboard"}},[_c('button',{staticClass:"btn btn-vue btn-lg col-4"},[_vm._v("Dashboard")])]),_c('router-link',{attrs:{"to":"/log"}},[_c('button',{staticClass:"btn btn-vue btn-lg col-4"},[_vm._v("Logs")])])],1):_vm._e()])}
var Corelinkvue_type_template_id_d0ca17dc_staticRenderFns = [function () {var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return _c('label',{staticClass:"col-form-label col-form-label-lg"},[_vm._v("Username"),_c('span',{staticClass:"text-danger"},[_vm._v("*")])])},function () {var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return _c('label',{staticClass:"col-form-label col-form-label-lg"},[_vm._v("Password "),_c('span',{staticClass:"text-danger"},[_vm._v("*")])])},function () {var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return _c('label',{staticClass:"col-form-label col-form-label-lg"},[_vm._v("host "),_c('span',{staticClass:"text-danger"},[_vm._v("*")])])},function () {var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return _c('label',{staticClass:"col-form-label col-form-label-lg"},[_vm._v("port "),_c('span',{staticClass:"text-danger"},[_vm._v("*")])])},function () {var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return _c('div',{staticClass:"col-12 form-group text-center"},[_c('button',{staticClass:"btn btn-vue btn-lg col-4"},[_vm._v("Login")])])}]


// CONCATENATED MODULE: ./src/components/Corelink.vue?vue&type=template&id=d0ca17dc&

// EXTERNAL MODULE: ./node_modules/vuelidate/lib/validators/index.js
var validators = __webpack_require__("b5ae");

// CONCATENATED MODULE: ./node_modules/cache-loader/dist/cjs.js??ref--12-0!./node_modules/thread-loader/dist/cjs.js!./node_modules/babel-loader/lib!./node_modules/cache-loader/dist/cjs.js??ref--0-0!./node_modules/vue-loader/lib??vue-loader-options!./src/components/Corelink.vue?vue&type=script&lang=js&
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//

/*global corelink*/

/* harmony default export */ var Corelinkvue_type_script_lang_js_ = ({
  name: 'Corelink',
  data: function data() {
    return {
      username: '',
      password: '',
      port: '',
      host: '',
      hostList: ['127.0.0.1', 'corelink.hpc.nyu.edu'],
      portList: ['20012'],
      loggedIn: false
    };
  },
  validations: {
    username: {
      required: validators["required"]
    },
    port: {
      required: validators["required"]
    },
    host: {
      required: validators["required"]
    },
    password: {
      required: validators["required"]
    }
  },
  methods: {
    connection: function connection() {
      var _this = this;

      corelink.connect({
        username: this.username,
        password: this.password
      }, {
        ControlIP: this.host,
        ControlPort: parseInt(this.port)
      }).then(function (res) {
        if (res && document.querySelector("#loginForm")) {
          _this.$session.start();

          _this.$session.set('jwt', res);

          localStorage.setItem('jwt', res);
          localStorage.setItem('host', _this.host);
          localStorage.setItem('port', _this.port);
          var data = localStorage.getItem('jwt');
          alert(data);
          console.log(data);
          _this.loggedIn = true;
        }
      }).catch(function (e) {
        return console.log(e);
      });
    },
    logout: function logout() {
      this.$session.destroy();
    },
    validationStatus: function validationStatus(validation) {
      return typeof validation != "undefined" ? validation.$error : false;
    },
    submit: function submit() {
      if (this.$v.$invalid || this.$v.$error) {
        console.log(this.$v);
        return false;
      }

      this.$v.$touch();
      console.log(this.$v);
      if (this.$v.$pendding || this.$v.$error) return;
      this.connection();
      return;
    }
  },
  mounted: function mounted() {
    if (this.$session.exists()) {
      this.$session.destroy();
      alert("cbbcncbn");
      this.loggedIn = true;
    }
  }
});
// CONCATENATED MODULE: ./src/components/Corelink.vue?vue&type=script&lang=js&
 /* harmony default export */ var components_Corelinkvue_type_script_lang_js_ = (Corelinkvue_type_script_lang_js_); 
// EXTERNAL MODULE: ./src/components/Corelink.vue?vue&type=style&index=0&lang=css&
var Corelinkvue_type_style_index_0_lang_css_ = __webpack_require__("5524");

// CONCATENATED MODULE: ./src/components/Corelink.vue






/* normalize component */

var Corelink_component = Object(componentNormalizer["a" /* default */])(
  components_Corelinkvue_type_script_lang_js_,
  Corelinkvue_type_template_id_d0ca17dc_render,
  Corelinkvue_type_template_id_d0ca17dc_staticRenderFns,
  false,
  null,
  null,
  null
  
)

/* harmony default export */ var Corelink = (Corelink_component.exports);
// CONCATENATED MODULE: ./node_modules/cache-loader/dist/cjs.js??ref--12-0!./node_modules/thread-loader/dist/cjs.js!./node_modules/babel-loader/lib!./node_modules/cache-loader/dist/cjs.js??ref--0-0!./node_modules/vue-loader/lib??vue-loader-options!./src/views/Home.vue?vue&type=script&lang=js&
//
//
//
//
//
//
//
//
// @ is an alias to /src


/* harmony default export */ var Homevue_type_script_lang_js_ = ({
  name: 'Home',
  components: {
    HelloWorld: HelloWorld,
    Corelink: Corelink
  }
});
// CONCATENATED MODULE: ./src/views/Home.vue?vue&type=script&lang=js&
 /* harmony default export */ var views_Homevue_type_script_lang_js_ = (Homevue_type_script_lang_js_); 
// CONCATENATED MODULE: ./src/views/Home.vue





/* normalize component */

var Home_component = Object(componentNormalizer["a" /* default */])(
  views_Homevue_type_script_lang_js_,
  Homevue_type_template_id_1ac133d1_render,
  Homevue_type_template_id_1ac133d1_staticRenderFns,
  false,
  null,
  null,
  null
  
)

/* harmony default export */ var Home = (Home_component.exports);
// CONCATENATED MODULE: ./src/router/index.js




vue_runtime_esm["a" /* default */].use(vue_router_esm["a" /* default */]);
var routes = [{
  path: '/',
  name: 'Home',
  component: Home
}, {
  path: '/about',
  name: 'About',
  // route level code-splitting
  // this generates a separate chunk (about.[hash].js) for this route
  // which is lazy-loaded when the route is visited.
  component: function component() {
    return __webpack_require__.e(/* import() | about */ "about").then(__webpack_require__.bind(null, "f820"));
  }
}, {
  path: '/log',
  name: 'log for the server',
  // route level code-splitting
  // this generates a separate chunk (about.[hash].js) for this route
  // which is lazy-loaded when the route is visited.
  component: function component() {
    return __webpack_require__.e(/* import() | about */ "about").then(__webpack_require__.bind(null, "f836"));
  }
}, {
  path: '/dashboard',
  name: 'Logged  in User',
  // route level code-splitting
  // this generates a separate chunk (about.[hash].js) for this route
  // which is lazy-loaded when the route is visited.
  component: function component() {
    return __webpack_require__.e(/* import() | about */ "about").then(__webpack_require__.bind(null, "7277"));
  }
}];
var router = new vue_router_esm["a" /* default */]({
  mode: 'history',
  base: "",
  routes: routes
});
/* harmony default export */ var src_router = (router);
// EXTERNAL MODULE: ./node_modules/vue-session/index.js
var vue_session = __webpack_require__("0628");
var vue_session_default = /*#__PURE__*/__webpack_require__.n(vue_session);

// CONCATENATED MODULE: ./src/main.js












vue_runtime_esm["a" /* default */].use(vue_session_default.a);
vue_runtime_esm["a" /* default */].use(vue_cookies_default.a);
vue_runtime_esm["a" /* default */].use(vue_plugin_load_script["a" /* default */]);
vue_runtime_esm["a" /* default */].use(lib_default.a);
vue_runtime_esm["a" /* default */].use(vue_router_esm["a" /* default */]);
vue_runtime_esm["a" /* default */].config.productionTip = false;
new vue_runtime_esm["a" /* default */]({
  router: src_router,
  render: function render(h) {
    return h(App);
  }
}).$mount('#app');

/***/ }),

/***/ "80b3":
/***/ (function(module, exports, __webpack_require__) {

// extracted by mini-css-extract-plugin

/***/ }),

/***/ "85ec":
/***/ (function(module, exports, __webpack_require__) {

// extracted by mini-css-extract-plugin

/***/ }),

/***/ "ab90":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var _node_modules_mini_css_extract_plugin_dist_loader_js_ref_6_oneOf_1_0_node_modules_css_loader_dist_cjs_js_ref_6_oneOf_1_1_node_modules_vue_loader_lib_loaders_stylePostLoader_js_node_modules_postcss_loader_src_index_js_ref_6_oneOf_1_2_node_modules_cache_loader_dist_cjs_js_ref_0_0_node_modules_vue_loader_lib_index_js_vue_loader_options_HelloWorld_vue_vue_type_style_index_0_id_4b042176_scoped_true_lang_css___WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("80b3");
/* harmony import */ var _node_modules_mini_css_extract_plugin_dist_loader_js_ref_6_oneOf_1_0_node_modules_css_loader_dist_cjs_js_ref_6_oneOf_1_1_node_modules_vue_loader_lib_loaders_stylePostLoader_js_node_modules_postcss_loader_src_index_js_ref_6_oneOf_1_2_node_modules_cache_loader_dist_cjs_js_ref_0_0_node_modules_vue_loader_lib_index_js_vue_loader_options_HelloWorld_vue_vue_type_style_index_0_id_4b042176_scoped_true_lang_css___WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_mini_css_extract_plugin_dist_loader_js_ref_6_oneOf_1_0_node_modules_css_loader_dist_cjs_js_ref_6_oneOf_1_1_node_modules_vue_loader_lib_loaders_stylePostLoader_js_node_modules_postcss_loader_src_index_js_ref_6_oneOf_1_2_node_modules_cache_loader_dist_cjs_js_ref_0_0_node_modules_vue_loader_lib_index_js_vue_loader_options_HelloWorld_vue_vue_type_style_index_0_id_4b042176_scoped_true_lang_css___WEBPACK_IMPORTED_MODULE_0__);
/* unused harmony reexport * */


/***/ })

/******/ });
//# sourceMappingURL=app.183b1674.js.map
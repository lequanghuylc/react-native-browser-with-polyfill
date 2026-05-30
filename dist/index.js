var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// src/createBrowser.jsx
var require_createBrowser = __commonJS({
  "src/createBrowser.jsx"(exports2, module2) {
    function createBrowser2({ Webview, React, ReactNative }) {
      const { useState, useRef, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } = React;
      const { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, StatusBar, Platform } = ReactNative;
      function useWebViewConsole() {
        const [logs, setLogs] = useState([]);
        const addLog = useCallback((type, message) => {
          const timestamp = (/* @__PURE__ */ new Date()).toLocaleTimeString();
          setLogs((prev) => [...prev, { type, message, timestamp, id: Date.now() + Math.random() }]);
        }, []);
        const clearLogs = useCallback(() => {
          setLogs([]);
        }, []);
        const handleWebViewMessage = useCallback((event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data && data.__console) {
              addLog(data.type || "log", data.message || "");
            }
          } catch (_) {
          }
        }, [addLog]);
        return { logs, addLog, clearLogs, handleWebViewMessage };
      }
      const CONSOLE_INTERCEPT = `(function(){
    var oL=console.log,oW=console.warn,oE=console.error;
    function s(t,a){try{var m=Array.prototype.slice.call(a).map(function(x){
    if(typeof x==="object"){try{return JSON.stringify(x)}catch(e){return String(x)}}
    return String(x)}).join(" ");
    if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(
    JSON.stringify({__console:true,type:t,message:m}))}catch(e){}}
    console.log=function(){s("log",arguments);oL.apply(console,arguments)};
    console.warn=function(){s("warn",arguments);oW.apply(console,arguments)};
    console.error=function(){s("error",arguments);oE.apply(console,arguments)}})();`;
      function DevBar({ webViewRef, logs, clearLogs, currentUrl }) {
        const [expanded, setExpanded] = useState(false);
        const [showConsole, setShowConsole] = useState(false);
        const [urlInput, setUrlInput] = useState(currentUrl || "");
        const consoleScrollRef = useRef(null);
        useEffect(() => {
          setUrlInput(currentUrl || "");
        }, [currentUrl]);
        const handleGo = () => {
          let url = urlInput.trim();
          if (url && !url.startsWith("http")) url = "https://" + url;
          if (url && webViewRef.current) webViewRef.current.loadUrl(url);
        };
        if (!expanded) {
          return /* @__PURE__ */ React.createElement(TouchableOpacity, { style: styles.toggleBtn, onPress: () => setExpanded(true), activeOpacity: 0.7 }, /* @__PURE__ */ React.createElement(Text, { style: styles.toggleText }, "\u{1F6E0}"));
        }
        return /* @__PURE__ */ React.createElement(View, { style: styles.devbarContainer }, /* @__PURE__ */ React.createElement(View, { style: styles.devbarHeader }, /* @__PURE__ */ React.createElement(Text, { style: styles.devbarTitle }, "\u{1F527} Dev Toolbar"), /* @__PURE__ */ React.createElement(TouchableOpacity, { onPress: () => setExpanded(false) }, /* @__PURE__ */ React.createElement(Text, { style: styles.devbarClose }, "\u2715"))), /* @__PURE__ */ React.createElement(View, { style: styles.urlRow }, /* @__PURE__ */ React.createElement(
          TextInput,
          {
            style: styles.urlInput,
            value: urlInput,
            onChangeText: setUrlInput,
            onSubmitEditing: handleGo,
            placeholder: "Enter URL...",
            placeholderTextColor: "#888",
            autoCapitalize: "none",
            autoCorrect: false,
            keyboardType: "url",
            returnKeyType: "go"
          }
        ), /* @__PURE__ */ React.createElement(TouchableOpacity, { style: styles.goBtn, onPress: handleGo }, /* @__PURE__ */ React.createElement(Text, { style: styles.goBtnText }, "Go"))), /* @__PURE__ */ React.createElement(Text, { style: styles.currentUrl, numberOfLines: 1 }, currentUrl), /* @__PURE__ */ React.createElement(View, { style: styles.btnRow }, [
          ["\u2190 Back", () => webViewRef.current?.goBack()],
          ["\u2192 Fwd", () => webViewRef.current?.goForward()],
          ["\u21BB Reload", () => webViewRef.current?.reload()],
          ["\u{1F5D1} Clear", () => webViewRef.current?.clearCache?.()],
          ["\u{1F4CB} Console", () => setShowConsole((v) => !v)]
        ].map(([label, onPress]) => /* @__PURE__ */ React.createElement(TouchableOpacity, { key: label, style: [styles.navBtn, label.includes("Console") && showConsole && styles.navBtnActive], onPress }, /* @__PURE__ */ React.createElement(Text, { style: styles.navBtnText }, label)))), showConsole && /* @__PURE__ */ React.createElement(View, { style: styles.consolePanel }, /* @__PURE__ */ React.createElement(View, { style: styles.consoleHeader }, /* @__PURE__ */ React.createElement(Text, { style: styles.consoleTitle }, "Console (", logs.length, ")"), /* @__PURE__ */ React.createElement(TouchableOpacity, { onPress: clearLogs }, /* @__PURE__ */ React.createElement(Text, { style: styles.consoleClear }, "Clear"))), /* @__PURE__ */ React.createElement(
          ScrollView,
          {
            ref: consoleScrollRef,
            style: styles.consoleScroll,
            onContentSizeChange: () => consoleScrollRef.current?.scrollToEnd({ animated: true })
          },
          logs.length === 0 ? /* @__PURE__ */ React.createElement(Text, { style: styles.consoleEmpty }, "No messages yet.") : logs.map((log, i) => /* @__PURE__ */ React.createElement(View, { key: i, style: styles.logEntry }, /* @__PURE__ */ React.createElement(Text, { style: [styles.logType, { color: log.type === "error" ? "#F44336" : log.type === "warn" ? "#FF9800" : "#4CAF50" }] }, "[", log.type, "]"), /* @__PURE__ */ React.createElement(Text, { style: styles.logTime }, log.timestamp), /* @__PURE__ */ React.createElement(Text, { style: styles.logMsg, selectable: true }, log.message)))
        )));
      }
      const WebViewScreen = forwardRef(function WebViewScreen2(props, ref) {
        const { initialUrl, onUrlChange, onMessage, polyfillScript, keyboardScript } = props;
        const webViewRef = useRef(null);
        const [currentUrl, setCurrentUrl] = useState(initialUrl || "https://browserleaks.com/js");
        const injectedJS = useMemo(() => {
          const parts = [CONSOLE_INTERCEPT];
          if (polyfillScript) parts.push(polyfillScript);
          if (keyboardScript) parts.push(keyboardScript);
          return parts.join("\n");
        }, [polyfillScript, keyboardScript]);
        useImperativeHandle(ref, () => ({
          goBack: () => webViewRef.current?.goBack(),
          goForward: () => webViewRef.current?.goForward(),
          reload: () => webViewRef.current?.reload(),
          loadUrl: (url) => {
            const newUrl = url.startsWith("http") ? url : "https://" + url;
            setCurrentUrl(newUrl);
            onUrlChange?.(newUrl);
            webViewRef.current?.injectJavaScript("window.location.href=" + JSON.stringify(newUrl) + ";true;");
          },
          clearCache: () => {
            webViewRef.current?.injectJavaScript("if(window.caches){caches.keys().then(function(n){for(var i=0;i<n.length;i++)caches.delete(n[i])})}true;");
          }
        }));
        return /* @__PURE__ */ React.createElement(
          Webview,
          {
            ref: webViewRef,
            source: { uri: currentUrl },
            injectedJavaScriptBeforeContentLoaded: injectedJS,
            onMessage,
            onNavigationStateChange: (nav) => {
              setCurrentUrl(nav.url);
              onUrlChange?.(nav.url);
            },
            javaScriptEnabled: true,
            domStorageEnabled: true,
            startInLoadingState: true,
            allowsInlineMediaPlayback: true,
            applicationNameForUserAgent: "ExpoBrowser/1.0",
            style: { flex: 1 }
          }
        );
      });
      function Browser({ initialUrl, polyfillScript, keyboardScript }) {
        const webViewRef = useRef(null);
        const { logs, clearLogs, handleWebViewMessage } = useWebViewConsole();
        const [currentUrl, setCurrentUrl] = useState(initialUrl || "https://browserleaks.com/js");
        return /* @__PURE__ */ React.createElement(View, { style: { flex: 1, backgroundColor: "#000" } }, /* @__PURE__ */ React.createElement(StatusBar, { barStyle: "light-content", backgroundColor: "#000" }), /* @__PURE__ */ React.createElement(
          WebViewScreen,
          {
            ref: webViewRef,
            initialUrl,
            onUrlChange: setCurrentUrl,
            onMessage: handleWebViewMessage,
            polyfillScript,
            keyboardScript
          }
        ), /* @__PURE__ */ React.createElement(
          DevBar,
          {
            webViewRef,
            logs,
            clearLogs,
            currentUrl
          }
        ));
      }
      const styles = StyleSheet.create({
        toggleBtn: { position: "absolute", bottom: 20, right: 20, width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(30,30,30,0.9)", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#4CAF50", elevation: 8 },
        toggleText: { fontSize: 22 },
        devbarContainer: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(30,30,30,0.95)", borderTopLeftRadius: 12, borderTopRightRadius: 12, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4, borderWidth: 1, borderColor: "#444", borderBottomWidth: 0 },
        devbarHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
        devbarTitle: { color: "#fff", fontSize: 14, fontWeight: "bold" },
        devbarClose: { color: "#aaa", fontSize: 18, fontWeight: "bold", padding: 4 },
        urlRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
        urlInput: { flex: 1, backgroundColor: "#333", color: "#fff", fontSize: 12, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: "#555" },
        goBtn: { marginLeft: 6, backgroundColor: "#4CAF50", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
        goBtnText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
        currentUrl: { color: "#888", fontSize: 10, marginBottom: 6 },
        btnRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 6 },
        navBtn: { backgroundColor: "#444", paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, marginRight: 4, marginBottom: 4 },
        navBtnActive: { backgroundColor: "#1976D2" },
        navBtnText: { color: "#fff", fontSize: 11 },
        consolePanel: { maxHeight: 200, marginTop: 4, borderTopWidth: 1, borderTopColor: "#444", paddingTop: 4 },
        consoleHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
        consoleTitle: { color: "#aaa", fontSize: 12, fontWeight: "bold" },
        consoleClear: { color: "#F44336", fontSize: 12, fontWeight: "bold" },
        consoleScroll: { maxHeight: 160, backgroundColor: "#1a1a1a", borderRadius: 4, padding: 4 },
        consoleEmpty: { color: "#666", fontSize: 11, fontStyle: "italic", padding: 8 },
        logEntry: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", marginBottom: 2, paddingVertical: 2, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#333" },
        logType: { fontSize: 10, fontWeight: "bold", marginRight: 4 },
        logTime: { color: "#666", fontSize: 9, marginRight: 6, marginTop: 1 },
        logMsg: { color: "#ddd", fontSize: 10, flex: 1 }
      });
      return { Browser, WebViewScreen, DevBar, useWebViewConsole };
    }
    module2.exports = createBrowser2;
    module2.exports.default = createBrowser2;
  }
});

// index.js
var createBrowser = require_createBrowser();
module.exports = createBrowser;
module.exports.default = createBrowser;
module.exports.createBrowser = createBrowser;

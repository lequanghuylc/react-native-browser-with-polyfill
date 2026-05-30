/**
 * createBrowser — factory that accepts peer dependencies via DI
 *
 * Usage:
 *   import createBrowser from "expo-browser";
 *   import Webview from "react-native-webview";
 *   import * as React from "react";
 *   import * as ReactNative from "react-native";
 *
 *   const { Browser, useWebViewConsole } = createBrowser({
 *     Webview, React, ReactNative,
 *   });
 */

function createBrowser({ Webview, React, ReactNative }) {
  const { useState, useRef, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } = React;
  const { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, StatusBar, Platform } = ReactNative;

  // ── Console Hook ───────────────────────────────────────────────
  function useWebViewConsole() {
    const [logs, setLogs] = useState([]);

    const addLog = useCallback((type, message) => {
      const timestamp = new Date().toLocaleTimeString();
      setLogs((prev) => [...prev, { type, message, timestamp, id: Date.now() + Math.random() }]);
    }, []);

    const clearLogs = useCallback(() => { setLogs([]); }, []);

    const handleWebViewMessage = useCallback((event) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data && data.__console) {
          addLog(data.type || "log", data.message || "");
        }
      } catch (_) {}
    }, [addLog]);

    return { logs, addLog, clearLogs, handleWebViewMessage };
  }

  // ── Console Intercept Script ───────────────────────────────────
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

  // ── DevBar Component ───────────────────────────────────────────
  function DevBar({ webViewRef, logs, clearLogs, currentUrl }) {
    const [expanded, setExpanded] = useState(false);
    const [showConsole, setShowConsole] = useState(false);
    const [urlInput, setUrlInput] = useState(currentUrl || "");
    const consoleScrollRef = useRef(null);

    useEffect(() => { setUrlInput(currentUrl || ""); }, [currentUrl]);

    const handleGo = () => {
      let url = urlInput.trim();
      if (url && !url.startsWith("http")) url = "https://" + url;
      if (url && webViewRef.current) webViewRef.current.loadUrl(url);
    };

    if (!expanded) {
      return (
        <TouchableOpacity style={styles.toggleBtn} onPress={() => setExpanded(true)} activeOpacity={0.7}>
          <Text style={styles.toggleText}>🛠</Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.devbarContainer}>
        <View style={styles.devbarHeader}>
          <Text style={styles.devbarTitle}>🔧 Dev Toolbar</Text>
          <TouchableOpacity onPress={() => setExpanded(false)}>
            <Text style={styles.devbarClose}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.urlRow}>
          <TextInput
            style={styles.urlInput}
            value={urlInput}
            onChangeText={setUrlInput}
            onSubmitEditing={handleGo}
            placeholder="Enter URL..."
            placeholderTextColor="#888"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
          />
          <TouchableOpacity style={styles.goBtn} onPress={handleGo}>
            <Text style={styles.goBtnText}>Go</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.currentUrl} numberOfLines={1}>{currentUrl}</Text>

        <View style={styles.btnRow}>
          {[
            ["← Back", () => webViewRef.current?.goBack()],
            ["→ Fwd", () => webViewRef.current?.goForward()],
            ["↻ Reload", () => webViewRef.current?.reload()],
            ["🗑 Clear", () => webViewRef.current?.clearCache?.()],
            ["📋 Console", () => setShowConsole(v => !v)],
          ].map(([label, onPress]) => (
            <TouchableOpacity key={label} style={[styles.navBtn, label.includes("Console") && showConsole && styles.navBtnActive]} onPress={onPress}>
              <Text style={styles.navBtnText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {showConsole && (
          <View style={styles.consolePanel}>
            <View style={styles.consoleHeader}>
              <Text style={styles.consoleTitle}>Console ({logs.length})</Text>
              <TouchableOpacity onPress={clearLogs}>
                <Text style={styles.consoleClear}>Clear</Text>
              </TouchableOpacity>
            </View>
            <ScrollView ref={consoleScrollRef} style={styles.consoleScroll}
              onContentSizeChange={() => consoleScrollRef.current?.scrollToEnd({ animated: true })}>
              {logs.length === 0 ? (
                <Text style={styles.consoleEmpty}>No messages yet.</Text>
              ) : (
                logs.map((log, i) => (
                  <View key={i} style={styles.logEntry}>
                    <Text style={[styles.logType, { color: log.type === "error" ? "#F44336" : log.type === "warn" ? "#FF9800" : "#4CAF50" }]}>
                      [{log.type}]
                    </Text>
                    <Text style={styles.logTime}>{log.timestamp}</Text>
                    <Text style={styles.logMsg} selectable>{log.message}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        )}
      </View>
    );
  }

  // ── WebViewScreen Component ────────────────────────────────────
  const WebViewScreen = forwardRef(function WebViewScreen(props, ref) {
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
      },
    }));

    return (
      <Webview
        ref={webViewRef}
        source={{ uri: currentUrl }}
        injectedJavaScriptBeforeContentLoaded={injectedJS}
        onMessage={onMessage}
        onNavigationStateChange={(nav) => {
          setCurrentUrl(nav.url);
          onUrlChange?.(nav.url);
        }}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        allowsInlineMediaPlayback
        applicationNameForUserAgent="ExpoBrowser/1.0"
        style={{ flex: 1 }}
      />
    );
  });

  // ── Browser (main component) ───────────────────────────────────
  function Browser({ initialUrl, polyfillScript, keyboardScript }) {
    const webViewRef = useRef(null);
    const { logs, clearLogs, handleWebViewMessage } = useWebViewConsole();
    const [currentUrl, setCurrentUrl] = useState(initialUrl || "https://browserleaks.com/js");

    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <WebViewScreen
          ref={webViewRef}
          initialUrl={initialUrl}
          onUrlChange={setCurrentUrl}
          onMessage={handleWebViewMessage}
          polyfillScript={polyfillScript}
          keyboardScript={keyboardScript}
        />
        <DevBar
          webViewRef={webViewRef}
          logs={logs}
          clearLogs={clearLogs}
          currentUrl={currentUrl}
        />
      </View>
    );
  }

  // ── Styles ─────────────────────────────────────────────────────
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
    logMsg: { color: "#ddd", fontSize: 10, flex: 1 },
  });

  return { Browser, WebViewScreen, DevBar, useWebViewConsole };
}

module.exports = createBrowser;
module.exports.default = createBrowser;

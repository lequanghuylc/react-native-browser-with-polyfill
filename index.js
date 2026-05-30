/**
 * expo-browser — Polyfill-injecting WebView browser for React Native / Expo
 *
 * Usage:
 *   import createBrowser from "expo-browser";
 *   import Webview from "react-native-webview";
 *   import * as React from "react";
 *   import * as ReactNative from "react-native";
 *
 *   // Optional: import polyfill scripts as strings
 *   import polyfillScript from "expo-browser/src/polyfills/ipados15-polyfill";
 *   import keyboardScript from "expo-browser/src/polyfills/dev-keyboard-bar";
 *
 *   const { Browser } = createBrowser({ Webview, React, ReactNative });
 *
 *   export default function App() {
 *     return (
 *       <Browser
 *         initialUrl="https://browserleaks.com/js"
 *         polyfillScript={polyfillScript}
 *         keyboardScript={keyboardScript}
 *       />
 *     );
 *   }
 */
const createBrowser = require("./src/createBrowser");
module.exports = createBrowser;
module.exports.default = createBrowser;
module.exports.createBrowser = createBrowser;

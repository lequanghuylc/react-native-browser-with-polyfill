# expo-browser

A dependency-injected WebView browser for React Native / Expo that injects Safari 15 polyfills and a floating keyboard dev toolbar.

Works with **Expo Go**, **Expo Snack**, and any React Native version — no native linking required.

## Why DI?

Expo SDK versions change frequently and break native module imports. By accepting `React`, `ReactNative`, and `Webview` as parameters, this library works with **any** SDK version without version conflicts.

## Install

```bash
npm install expo-browser react-native-webview
```

## Quick Start

```jsx
import createBrowser from "expo-browser";
import Webview from "react-native-webview";
import * as React from "react";
import * as ReactNative from "react-native";

const { Browser } = createBrowser({ Webview, React, ReactNative });

export default function App() {
  return <Browser initialUrl="https://browserleaks.com/js" />;
}
```

## With Polyfills

```jsx
import createBrowser from "expo-browser";
import Webview from "react-native-webview";
import * as React from "react";
import * as ReactNative from "react-native";
import polyfillScript from "expo-browser/src/polyfills/ipados15-polyfill";
import keyboardScript from "expo-browser/src/polyfills/dev-keyboard-bar";

const { Browser } = createBrowser({ Webview, React, ReactNative });

export default function App() {
  return (
    <Browser
      initialUrl="https://browserleaks.com/js"
      polyfillScript={polyfillScript}
      keyboardScript={keyboardScript}
    />
  );
}
```

## API

### `createBrowser({ Webview, React, ReactNative })`

Returns:

| Export | Description |
|--------|-------------|
| `Browser` | Main component (WebView + DevBar) |
| `WebViewScreen` | Just the WebView with polyfill injection |
| `DevBar` | Just the floating toolbar |
| `useWebViewConsole` | Hook for console message capture |

### `<Browser />` Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialUrl` | string | `browserleaks.com/js` | Starting URL |
| `polyfillScript` | string | — | JS polyfill code to inject before page load |
| `keyboardScript` | string | — | Keyboard toolbar code to inject |

### `useWebViewConsole()`

Returns `{ logs, addLog, clearLogs, handleWebViewMessage }` — use with `onMessage` prop.

## Included Polyfills

**ipados15-polyfill.js** (65KB) — Safari 15.x polyfill suite:
- globalThis, Object.hasOwn, Array.at, findLast/findLastIndex
- structuredClone, Promise.withResolvers, crypto.randomUUID
- URL.canParse, AbortSignal.timeout, AggregateError
- CSS: :has(), @container, oklch/oklab, color-mix, nesting, viewport units

**dev-keyboard-bar.js** (23KB) — Floating keyboard toolbar:
- Esc, Ctrl, Alt, Tab, arrow keys, F1-F12
- Useful on iPad where physical keyboard shortcuts don't work in WebView

## Architecture

```
expo-browser/
  index.js                — entry point (re-exports createBrowser)
  src/
    createBrowser.jsx     — factory: Browser, WebViewScreen, DevBar, hook
    polyfills/
      ipados15-polyfill.js  — Safari 15 JS+CSS polyfill suite
      dev-keyboard-bar.js   — floating keyboard toolbar
```

## License

MIT

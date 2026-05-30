# react-native-browser-with-polyfill

A polyfill-injecting WebView browser component for React Native and Expo, built with a dependency injection pattern so it works across any SDK version.

## Why Dependency Injection?

Expo SDK versions change frequently, and native module import paths shift between versions. Hardcoding imports of `react-native`, `react`, or `react-native-webview` causes build failures when your SDK version doesn't match.

This library sidesteps the problem entirely: instead of importing modules internally, `createBrowser()` accepts `React`, `ReactNative`, and `Webview` as parameters. The same package works with Expo SDK 45, SDK 50, or any version in between.

## Install

Choose one of these two methods:

```bash
# Install from npm
npm install react-native-browser-with-polyfill
```

```bash
# Install directly from GitHub (unpublished / bleeding-edge)
npm install github:lequanghuylc/react-native-browser-with-polyfill
```

### Using in Expo Snack

In Expo Snack, you don't run `npm install`. Instead, edit `package.json` directly and add the dependency:

```json
{
  "dependencies": {
    "react-native-webview": "^13.0.0",
    "react-native-browser-with-polyfill": "github:lequanghuylc/react-native-browser-with-polyfill"
  }
}
```

Expo Snack will automatically install the package from GitHub when you save.

## Quick Start

### Basic Usage (without polyfills)

Copy-paste ready for [Expo Snack](https://snack.expo.dev/):

```jsx
import createBrowser from 'react-native-browser-with-polyfill';
import Webview from 'react-native-webview';
import * as React from 'react';
import * as ReactNative from 'react-native';

const { Browser } = createBrowser({ Webview, React, ReactNative });

export default function App() {
  return <Browser initialUrl="https://browserleaks.com/js" />;
}
```

### With Polyfills (iPadOS 15 + Dev Keyboard Bar)

```jsx
import createBrowser from 'react-native-browser-with-polyfill';
import Webview from 'react-native-webview';
import * as React from 'react';
import * as ReactNative from 'react-native';
import polyfillScript from 'react-native-browser-with-polyfill/src/polyfills/ipados15-polyfill';
import keyboardScript from 'react-native-browser-with-polyfill/src/polyfills/dev-keyboard-bar';

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

Creates a browser instance with dependency-injected modules.

**Parameters:**

| Param        | Type         | Description                         |
| ------------ | ------------ | ----------------------------------- |
| `Webview`    | Component    | `react-native-webview` WebView      |
| `React`      | Module       | `react` (use `import * as React`)   |
| `ReactNative`| Module       | `react-native` (use `import * as ReactNative`) |

**Returns:**

```ts
{
  Browser,           // Main screen component
  WebViewScreen,     // Standalone WebView screen
  DevBar,            // Developer console bar
  useWebViewConsole  // Hook for the console log viewer
}
```

### `Browser` Props

| Prop             | Type     | Default | Description                               |
| ---------------- | -------- | ------- | ----------------------------------------- |
| `initialUrl`     | string   | `"about:blank"` | URL to load on first render         |
| `polyfillScript` | string   | `null`  | JavaScript to inject into every page (e.g. ipados15 polyfill) |
| `keyboardScript` | string   | `null`  | JavaScript to inject for the floating dev keyboard bar |

### `useWebViewConsole()` Hook

Returns an object you can use to read and display the WebView's console output:

```ts
{
  logs: Array<{ time: string; type: string; content: string }>,
  addLog: (log: { type: string; content: string }) => void,
  clearLogs: () => void,
  handleWebViewMessage: (event: any) => void
}
```

## Included Polyfills

### `src/polyfills/ipados15-polyfill.js`

Safari 15 / iPadOS 15 compatibility polyfills:
- `Promise.withResolvers` polyfill
- `DOMParser` polyfill
- `AbortController` / `AbortSignal` polyfill
- `URLPattern` polyfill

### `src/polyfills/dev-keyboard-bar.js`

Injects a floating toolbar at the bottom of the WebView that toggles a full-screen developer console overlay. Capture logs from the WebView and display them for debugging.

## Architecture

```
react-native-browser-with-polyfill/
├── index.js                    # Single entry point — exports createBrowser
├── package.json
├── README.md
└── src/
    ├── createBrowser.jsx       # DI factory — accepts React, ReactNative, Webview
    └── polyfills/
        ├── ipados15-polyfill.js   # Safari 15 compatibility shims
        └── dev-keyboard-bar.js    # Floating dev toolbar
```

The library is intentionally minimal — a single entry point, no bundler required. It works with Expo, bare React Native, or any React Native CLI project.

## License

MIT

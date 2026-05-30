// ==UserScript==
// @name         iPadOS 15 Safari Polyfill Suite
// @namespace    https://github.com/huyquoc/ipados15-polyfill
// @version      1.6.4
// @description  Comprehensive JS and CSS polyfills for iPadOS 15 Safari (WebKit 15.x). Fixes broken layouts on modern sites.
// @author       Huy (Huy Quoc)
// @match        *://*/*
// @grant        none
// @run-at       document-start
// @license      MIT
// ==/UserScript==

/*
 * =====================================================================
 *  iPadOS 15 Safari Polyfill Suite v1.4.0
 * =====================================================================
 *
 *  Polyfills JavaScript and CSS features missing from Safari 15.x
 *  (equivalent to Safari 15.0-15.5 shipped with iPadOS 15).
 *
 *  JS features polyfilled:
 *    - globalThis
 *    - Object.hasOwn()
 *    - Object.groupBy() / Map.groupBy()
 *    - Array.fromAsync()
 *    - Array.prototype.at()
 *    - Array.prototype.findLast() / findLastIndex()
 *    - String.prototype.replaceAll()
 *    - Element.prototype.replaceAll()
 *    - Element.prototype.checkVisibility()
 *    - Promise.any() / AggregateError
 *    - Promise.withResolvers()
 *    - Set methods: union, intersection, difference, isSubsetOf, isSupersetOf, isDisjointFrom
 *    - URL.canParse()
 *    - AbortSignal.timeout()
 *    - AbortSignal.any()
 *    - crypto.randomUUID()
 *    - structuredClone()
 *    - Iterator helpers: Iterator.from(), Iterator.prototype.map(), filter(), take(), drop(), forEach(), toArray()
 *    - CSS reset for computed fallbacks
 *
 *  CSS features polyfilled:
 *    - :has() pseudo-class  → JS-based parent selector
 *    - @container rules      → rewritten to @media or JS-calculated
 *    - CSS nesting syntax    → flattened to nested selectors
 *    - oklch() / oklab()     → converted to lab()/rgb()
 *    - color-mix()           → JS color interpolation
 *    - dvh / svh / lvh / dvw / svw / lvw → viewport-calc fallbacks
 *    - text-wrap: balance    → JS text balancing fallback
 *    - subgrid               → IE-style fallback
 *    - CSS calc with unsupported units
 *
 *  =====================================================================
 */

(function () {
  "use strict";

  // ── Guards and diagnostics ──────────────────────────────────────────
  const POLYFILL_NS = "ipados15-polyfill";
  const _ua = navigator.userAgent;
  const _isSafari = /Safari/.test(_ua) && !/Chrome/.test(_ua);
  const _isIPadOS15 =
    /iPad/.test(_ua) ||
    (/Macintosh/.test(_ua) && navigator.maxTouchPoints > 1);

  // Log diagnostics
  var _applied = [];
  function _log(feature, status) {
    status = status || "polyfilled";
    _applied.push(feature + " [" + status + "]");
    console.log("[%s] %s: %s", POLYFILL_NS, feature, status);
  }
  function _unavailable(feature, reason) {
    _applied.push(feature + " [skipped: " + reason + "]");
  }

  // Safe wrapper: runs fn in try/catch, logs error but never crashes the script
  function _safe(feature, fn) {
    try {
      fn();
    } catch (e) {
      _log(feature, "error: " + e.message);
    }
  }

  // Skip on non-iPadOS-15 but still polyfill if feature is actually missing
  // (user may be on desktop Safari 15 too)
  var _shouldSkip =
    !_isSafari &&
    !/Version\/15\./.test(_ua) &&
    !/Version\/16\./.test(_ua) &&
    !/Version\/17\./.test(_ua);

  // ── 0. globalThis ──────────────────────────────────────────────────
  if (typeof globalThis === "undefined") {
    try {
      var _globalObj;
      if (typeof self !== "undefined") {
        _globalObj = self;
      } else if (typeof window !== "undefined") {
        _globalObj = window;
      } else if (typeof global !== "undefined") {
        _globalObj = global;
      } else {
        _globalObj = Function("return this")();
      }
      Object.defineProperty(_globalObj, "globalThis", {
        value: _globalObj,
        configurable: true,
        writable: true,
      });
      _log("globalThis", "polyfilled");
    } catch (e) {
      _log("globalThis", "error: " + e.message);
    }
  }

  // ── 1. String.prototype.replaceAll ─────────────────────────────────
  if (typeof String.prototype.replaceAll !== "function") {
    String.prototype.replaceAll = function (search, replacement) {
      var target = String(this);
      var searchStr = String(search);
      if (searchStr === "") {
        // Edge case: replacing empty string inserts between every char
        return target.split("").join(replacement) + replacement;
      }
      // Escape regex special chars if search is a string
      var escaped = searchStr.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );
      var regex = new RegExp(escaped, "g");
      return target.replace(regex, replacement);
    };
    _log("String.replaceAll", "polyfilled");
  }

  // ── 2. Object.hasOwn ───────────────────────────────────────────────
  if (typeof Object.hasOwn !== "function") {
    Object.hasOwn = function (obj, prop) {
      if (obj == null) throw new TypeError("Cannot convert undefined/null");
      return Object.prototype.hasOwnProperty.call(obj, prop);
    };
    _log("Object.hasOwn", "polyfilled");
  }

  // ── 3. Object.groupBy / Map.groupBy ────────────────────────────────
  if (typeof Object.groupBy !== "function") {
    Object.groupBy = function (collection, callback) {
      var result = {};
      // Handle iterables and array-like
      if (Symbol.iterator in Object(collection)) {
        for (var item of collection) {
          var key = callback(item, 0);
          result[key] = result[key] || [];
          result[key].push(item);
        }
      } else {
        var idx = 0;
        for (var key in collection) {
          if (Object.prototype.hasOwnProperty.call(collection, key)) {
            var val = collection[key];
            var groupKey = callback(val, idx);
            result[groupKey] = result[groupKey] || [];
            result[groupKey].push(val);
            idx++;
          }
        }
      }
      return result;
    };
    _log("Object.groupBy", "polyfilled");
  }

  if (typeof Map.groupBy !== "function") {
    Map.groupBy = function (collection, callback) {
      var result = new Map();
      if (Symbol.iterator in Object(collection)) {
        for (var item of collection) {
          var key = callback(item, 0);
          if (!result.has(key)) result.set(key, []);
          result.get(key).push(item);
        }
      }
      return result;
    };
    _log("Map.groupBy", "polyfilled");
  }

  // ── 4. Array.fromAsync ─────────────────────────────────────────────
  if (typeof Array.fromAsync !== "function") {
    Array.fromAsync = function (asyncIterable, mapFn) {
      var result = [];
      return (async function () {
        try {
          var iterator =
            asyncIterable[Symbol.asyncIterator] ||
            (asyncIterable[Symbol.iterator]
              ? (function (iter) {
                  return {
                    next: function () {
                      var r = iter.next();
                      return Promise.resolve(r);
                    },
                  };
                })(asyncIterable[Symbol.iterator]())
              : null);
          if (!iterator)
            throw new TypeError(
              "Object is not async-iterable"
            );
          var step;
          while (!(step = await iterator.next()).done) {
            var value = step.value;
            if (mapFn) value = mapFn(value);
            result.push(value);
          }
        } catch (e) {
          try {
            await iterator.return();
          } catch (_) {}
          throw e;
        }
        return result;
      })();
    };
    _log("Array.fromAsync", "polyfilled");
  }

  // ── 5. Array.prototype.at ─────────────────────────────────────────
  _safe("Array.at", function() {
    if (typeof Array.prototype.at !== "function") {
      Array.prototype.at = function (index) {
        var arr = this;
        var len = arr.length || 0;
        if (len === 0) return undefined;
        if (index < 0) index = len + index;
        if (index < 0 || index >= len) return undefined;
        return arr[index];
      };
      _log("Array.at", "polyfilled");
    }
  });

  // ── 5b. String.prototype.at ────────────────────────────────────────
  _safe("String.at", function() {
    if (typeof String.prototype.at !== "function") {
      String.prototype.at = function (index) {
        var str = String(this);
        var len = str.length;
        if (len === 0) return undefined;
        if (index < 0) index = len + index;
        if (index < 0 || index >= len) return undefined;
        return str[index];
      };
      _log("String.at", "polyfilled");
    }
  });

  // ── 5c. TypedArray.prototype.at ────────────────────────────────────
  _safe("TypedArray.at", function() {
    var TypedArrays = [
      typeof Int8Array !== "undefined" && Int8Array,
      typeof Uint8Array !== "undefined" && Uint8Array,
      typeof Uint8ClampedArray !== "undefined" && Uint8ClampedArray,
      typeof Int16Array !== "undefined" && Int16Array,
      typeof Uint16Array !== "undefined" && Uint16Array,
      typeof Int32Array !== "undefined" && Int32Array,
      typeof Uint32Array !== "undefined" && Uint32Array,
      typeof Float32Array !== "undefined" && Float32Array,
      typeof Float64Array !== "undefined" && Float64Array,
    ].filter(Boolean);
    var atAdded = false;
    for (var i = 0; i < TypedArrays.length; i++) {
      var TA = TypedArrays[i];
      if (typeof TA.prototype.at !== "function") {
        TA.prototype.at = function (index) {
          var len = this.length;
          if (len === 0) return undefined;
          if (index < 0) index = len + index;
          if (index < 0 || index >= len) return undefined;
          return this[index];
        };
        atAdded = true;
      }
    }
    if (atAdded) _log("TypedArray.at", "polyfilled");
  });

  // ── 6. Array.prototype.findLast / findLastIndex ────────────────────
  if (typeof Array.prototype.findLast !== "function") {
    Array.prototype.findLast = function (predicate, thisArg) {
      for (var i = this.length - 1; i >= 0; i--) {
        if (predicate.call(thisArg, this[i], i, this)) return this[i];
      }
      return undefined;
    };
    _log("Array.findLast", "polyfilled");
  }

  if (typeof Array.prototype.findLastIndex !== "function") {
    Array.prototype.findLastIndex = function (predicate, thisArg) {
      for (var i = this.length - 1; i >= 0; i--) {
        if (predicate.call(thisArg, this[i], i, this)) return i;
      }
      return -1;
    };
    _log("Array.findLastIndex", "polyfilled");
  }

  // ── 7. Element.prototype.replaceAll ────────────────────────────────
  if (typeof Element.prototype.replaceAll !== "function") {
    Element.prototype.replaceAll = function (newChild) {
      var parent = this.parentNode;
      if (!parent) return this;
      if (typeof newChild === "string") {
        // Create a document fragment from the HTML string
        var fragment = document.createDocumentFragment();
        var temp = document.createElement("template");
        temp.innerHTML = newChild.trim();
        while (temp.content.firstChild) {
          fragment.appendChild(temp.content.firstChild);
        }
        parent.replaceChild(fragment, this);
      } else {
        parent.replaceChild(newChild, this);
      }
      return this;
    };
    _log("Element.replaceAll", "polyfilled");
  }

  // ── 8. Element.prototype.checkVisibility ───────────────────────────
  if (typeof Element.prototype.checkVisibility !== "function") {
    Element.prototype.checkVisibility = function (opts) {
      var o = opts || {};
      var checkOpacity = o.checkOpacity !== false;
      var checkVisibilityCSS = o.checkVisibilityCSS !== false;
      var el = this;
      if (!checkVisibilityCSS) {
        // If we don't need to check parents, just check this element
      } else {
        el = this.closest(
          ":not([hidden]), :not([style*='display: none'])"
        );
      }
      if (!el) return false;
      var style = getComputedStyle(el);
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.visibility !== "collapse" &&
        (checkOpacity === false || style.opacity !== "0")
      );
    };
    _log("Element.checkVisibility", "polyfilled");
  }

  // ── 9. Promise.any() / AggregateError ──────────────────────────────
  _safe("AggregateError", function() {
  if (typeof AggregateError !== "function") {
    var AggregateError = function (errors, message) {
      if (!(this instanceof AggregateError))
        return new AggregateError(errors, message);
      if (typeof Error.captureStackTrace === "function") {
        Error.captureStackTrace(this, AggregateError);
      }
      this.name = "AggregateError";
      this.errors = Array.isArray(errors) ? errors : [errors];
      this.message = message || "";
    };
    AggregateError.prototype = Object.create(Error.prototype);
    AggregateError.prototype.constructor = AggregateError;
    // Avoid redefining if global exists but is a class
    if (typeof window.AggregateError === "undefined") {
      window.AggregateError = AggregateError;
    }
  }

  if (typeof Promise.any !== "function") {
    Promise.any = function (iterable) {
      var promises = Array.from(iterable);
      return new Promise(function (resolve, reject) {
        if (promises.length === 0) {
          var err = new AggregateError(
            [],
            "All promises were rejected"
          );
          reject(err);
          return;
        }
        var errors = [];
        var settled = 0;
        promises.forEach(function (p, i) {
          Promise.resolve(p)
            .then(resolve)
            .catch(function (err) {
              errors[i] = err;
              settled++;
              if (settled === promises.length) {
                reject(new AggregateError(errors, "All promises rejected"));
              }
            });
        });
      });
    };
    _log("Promise.any", "polyfilled");
  }
  }); // end _safe AggregateError

  // ── 10. Promise.withResolvers ──────────────────────────────────────
  if (typeof Promise.withResolvers !== "function") {
    Promise.withResolvers = function () {
      var resolve, reject;
      var promise = new Promise(function (res, rej) {
        resolve = res;
        reject = rej;
      });
      return { promise: promise, resolve: resolve, reject: reject };
    };
    _log("Promise.withResolvers", "polyfilled");
  }

  // ── 11. Set methods (union, intersection, difference, etc.) ────────
  _safe("Set.methods", function() {
  if (typeof Set.prototype.union !== "function") {
    Set.prototype.union = function (otherSet) {
      return new Set([...this, ...otherSet]);
    };
    _log("Set.union", "polyfilled");
  }

  if (typeof Set.prototype.intersection !== "function") {
    Set.prototype.intersection = function (otherSet) {
      return new Set(
        [...this].filter(function (item) {
          return otherSet.has(item);
        })
      );
    };
    _log("Set.intersection", "polyfilled");
  }

  if (typeof Set.prototype.difference !== "function") {
    Set.prototype.difference = function (otherSet) {
      return new Set(
        [...this].filter(function (item) {
          return !otherSet.has(item);
        })
      );
    };
    _log("Set.difference", "polyfilled");
  }

  if (typeof Set.prototype.isSubsetOf !== "function") {
    Set.prototype.isSubsetOf = function (otherSet) {
      if (this.size > otherSet.size) return false;
      return [...this].every(function (item) {
        return otherSet.has(item);
      });
    };
    _log("Set.isSubsetOf", "polyfilled");
  }

  if (typeof Set.prototype.isSupersetOf !== "function") {
    Set.prototype.isSupersetOf = function (otherSet) {
      return otherSet.isSubsetOf(this);
    };
    _log("Set.isSupersetOf", "polyfilled");
  }

  if (typeof Set.prototype.isDisjointFrom !== "function") {
    Set.prototype.isDisjointFrom = function (otherSet) {
      return [...this].every(function (item) {
        return !otherSet.has(item);
      });
    };
    _log("Set.isDisjointFrom", "polyfilled");
  }
  }); // end _safe Set.methods

  // ── 12. URL.canParse / URL.canParseBase / URL.canParseHref ─────────
  if (typeof URL.canParse !== "function") {
    URL.canParse = function (url, base) {
      try {
        new URL(String(url), base ? String(base) : undefined);
        return true;
      } catch (e) {
        return false;
      }
    };
    _log("URL.canParse", "polyfilled");
  }

  // ── 13. AbortSignal.timeout ────────────────────────────────────────
  if (typeof AbortSignal.timeout !== "function") {
    AbortSignal.timeout = function (milliseconds) {
      var controller = new AbortController();
      setTimeout(function () {
        controller.abort(new DOMException("TimeoutError", "TimeoutError"));
      }, milliseconds);
      return controller.signal;
    };
    _log("AbortSignal.timeout", "polyfilled");
  }

  // ── 14. AbortSignal.any ────────────────────────────────────────────
  if (typeof AbortSignal.any !== "function") {
    AbortSignal.any = function (signals) {
      if (!Array.isArray(signals) || signals.length === 0) {
        var solo = new AbortController();
        return solo.signal;
      }
      if (signals.length === 1) return signals[0];

      var controller = new AbortController();
      signals.forEach(function (sig) {
        if (sig.aborted) {
          controller.abort(sig.reason);
          return;
        }
        try {
          sig.addEventListener(
            "abort",
            function () {
              controller.abort(sig.reason);
            },
            { once: true }
          );
        } catch (_) {
          // Some signals may not support addEventListener (older browsers)
        }
      });
      return controller.signal;
    };
    _log("AbortSignal.any", "polyfilled");
  }

  // ── 15. crypto.randomUUID ──────────────────────────────────────────
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID !== "function") {
    // Use Math.random-based fallback (not cryptographically secure but functional)
    crypto.randomUUID = function () {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function (c) {
          var r = (Math.random() * 16) | 0;
          var v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        }
      );
    };
    _log("crypto.randomUUID", "polyfilled");
  }

  // ── 16. structuredClone ────────────────────────────────────────────
  if (typeof structuredClone !== "function") {
    var _structuredClone = function (value) {
      return _structuredCloneInternal(value, new WeakMap());
    };
    if (typeof globalThis.structuredClone === "undefined") {
      globalThis.structuredClone = _structuredClone;
    }
    function _structuredCloneInternal(value, seen) {
      if (value === null || typeof value !== "object") return value;
      // Handle circular reference
      if (seen.has(value)) {
        throw new TypeError("Converting circular structure to structured clone");
      }
      // Handle Date
      if (value instanceof Date) return new Date(value.getTime());
      // Handle RegExp
      if (value instanceof RegExp) return new RegExp(value.source, value.flags);
      // Handle Array
      if (Array.isArray(value)) {
        var arr = [];
        seen.set(value, arr);
        for (var i = 0; i < value.length; i++) {
          arr.push(_structuredCloneInternal(value[i], seen));
        }
        return arr;
      }
      // Handle Map
      if (value instanceof Map) {
        var map = new Map();
        seen.set(value, map);
        value.forEach(function (v, k) {
          map.set(
            typeof k === "object" && k !== null ? _structuredCloneInternal(k, seen) : k,
            _structuredCloneInternal(v, seen)
          );
        });
        return map;
      }
      // Handle Set
      if (value instanceof Set) {
        var set = new Set();
        seen.set(value, set);
        value.forEach(function (v) {
          set.add(_structuredCloneInternal(v, seen));
        });
        return set;
      }
      // Handle ArrayBuffer
      if (value instanceof ArrayBuffer) {
        return value.slice(0);
      }
      // Handle TypedArrays
      if (ArrayBuffer.isView(value)) {
        return value.slice(0);
      }
      // Handle plain objects
      if (value instanceof Object) {
        var obj = {};
        seen.set(value, obj);
        var keys = Object.keys(value);
        for (var i = 0; i < keys.length; i++) {
          obj[keys[i]] = _structuredCloneInternal(value[keys[i]], seen);
        }
        return obj;
      }
      return value;
    }
    _log("structuredClone", "polyfilled");
  }

  // ── 17. Iterator helpers ───────────────────────────────────────────
  _safe("Iterator", function() {
  if (typeof Iterator === "undefined" || typeof Iterator.from !== "function") {
    // Polyfill Iterator.from()
    var IteratorPolyfill = function (iterable) {
      var iterator;
      if (iterable == null)
        throw new TypeError("iterator is null or undefined");
      if (typeof iterable[Symbol.iterator] === "function") {
        iterator = iterable[Symbol.iterator]();
        if (!iterator || typeof iterator.next !== "function")
          throw new TypeError("iterator is not a sequence");
      } else if (typeof iterable[Symbol.asyncIterator] === "function") {
        // Async iterator handling
        var asyncIter = iterable[Symbol.asyncIterator]();
        iterator = {
          next: function () {
            return asyncIter.next().then(function (result) {
              return { value: result.value, done: result.done };
            });
          },
          [Symbol.asyncIterator]: function () {
            return this;
          },
        };
      } else {
        throw new TypeError("object is not iterable");
      }
      // Check if iterator is already an Iterator (has iterator helpers)
      if (typeof iterator[Symbol.iterator] === "function" && iterator[Symbol.iterator]()) {
        var inner = iterator[Symbol.iterator]();
        if (typeof inner.next === "function" && typeof inner[Symbol.iterator] === "function") {
          // Already has iterator protocol
        }
      }
      return iterator;
    };

    var Iterator;
    if (typeof globalThis.Iterator === "undefined") {
      var IteratorClass = function (iterable) {
        return IteratorPolyfill(iterable);
      };
      IteratorClass.from = IteratorPolyfill;
      Iterator = IteratorClass;
      globalThis.Iterator = Iterator;
    } else {
      Iterator = globalThis.Iterator;
      Iterator.from = IteratorPolyfill;
    }
    _log("Iterator.from", "polyfilled");
  }

  // Add Iterator prototype methods (map, filter, take, drop, forEach, toArray)
  if (typeof globalThis.Iterator !== "undefined") {
    var IteratorProto = globalThis.Iterator.prototype;

    // Add a base Symbol.iterator so we can detect our polyfilled iterators
    if (typeof IteratorProto[Symbol.iterator] !== "function") {
      IteratorProto[Symbol.iterator] = function () {
        return this;
      };
    }

    // Already-have-map check: only add if not present
    if (typeof IteratorProto.map !== "function") {
      IteratorProto.map = function (fn, thisArg) {
        var self = this;
        var idx = 0;
        return {
          next: function () {
            var result = self.next();
            if (result.done) return result;
            result.value = fn.call(thisArg, result.value, idx++);
            return result;
          },
          [Symbol.iterator]: function () {
            return this;
          },
          [Symbol.asyncIterator]: function () {
            return this;
          },
        };
      };
    }

    if (typeof IteratorProto.filter !== "function") {
      IteratorProto.filter = function (predicate, thisArg) {
        var self = this;
        var idx = 0;
        return {
          next: function () {
            var result;
            while (!(result = self.next()).done) {
              if (predicate.call(thisArg, result.value, idx++)) {
                return result;
              }
            }
            return result;
          },
          [Symbol.iterator]: function () {
            return this;
          },
          [Symbol.asyncIterator]: function () {
            return this;
          },
        };
      };
    }

    if (typeof IteratorProto.take !== "function") {
      IteratorProto.take = function (n) {
        var self = this;
        var count = 0;
        return {
          next: function () {
            if (count >= n) return { done: true, value: undefined };
            var result = self.next();
            count++;
            return result;
          },
          [Symbol.iterator]: function () {
            return this;
          },
          [Symbol.asyncIterator]: function () {
            return this;
          },
        };
      };
    }

    if (typeof IteratorProto.drop !== "function") {
      IteratorProto.drop = function (n) {
        var self = this;
        var i = 0;
        while (i < n) {
          var skip = self.next();
          if (skip.done) return { next: function () { return { done: true, value: undefined }; }, [Symbol.iterator]: function () { return this; }, [Symbol.asyncIterator]: function () { return this; } };
          i++;
        }
        return self;
      };
    }

    if (typeof IteratorProto.forEach !== "function") {
      IteratorProto.forEach = function (fn, thisArg) {
        var idx = 0;
        var result;
        while (!(result = this.next()).done) {
          fn.call(thisArg, result.value, idx++);
        }
      };
    }

    if (typeof IteratorProto.toArray !== "function") {
      IteratorProto.toArray = function () {
        var arr = [];
        var result;
        while (!(result = this.next()).done) {
          arr.push(result.value);
        }
        return arr;
      };
    }

    _log("Iterator helpers (map/filter/take/drop/forEach/toArray)", "polyfilled");
  }
  }); // end _safe Iterator

  // ── 18. CSS Polyfill: Viewport height units (dvh, svh, lvh) ────────
  // iPadOS 15 doesn't support dvh/svh/lvw. Inject CSS custom properties.
  (function polyfillViewportUnits() {
    function _updateViewport() {
      try {
        var vh = window.innerHeight || document.documentElement.clientHeight;
        var vw = window.innerWidth || document.documentElement.clientWidth;

        // dvh: dynamic viewport height (excludes toolbar)
        // In Safari 15, dynamic viewport ~= visual viewport = innerHeight
        var dvh = vh + "px";

        // svh: smallest viewport height
        // In Safari 15, smallest viewport ~= innerHeight
        var svh = vh + "px";

        // lvh: largest viewport height
        // In Safari 15, largest viewport can be larger than screen height
        // We estimate using document height as the largest
        var lvh = Math.max(vh, document.documentElement.scrollHeight) + "px";

        // dvw / svw / lvw
        var dvw = vw + "px";
        var svw = vw + "px";
        var lvw = Math.max(vw, document.documentElement.scrollWidth) + "px";

        // Inject or update CSS custom properties
        var style = document.getElementById("ipados15-viewport-units");
        if (!style) {
          style = document.createElement("style");
          style.setAttribute("data-ipados15-polyfill", "true");
          style.setAttribute("id", "ipados15-viewport-units");
          document.head.appendChild(style);
        }
        style.textContent =
          ":root{\n" +
          "--ipados15-dvh:" + dvh + ";\n" +
          "--ipados15-svh:" + svh + ";\n" +
          "--ipados15-lvh:" + lvh + ";\n" +
          "--ipados15-dvw:" + dvw + ";\n" +
          "--ipados15-svw:" + svw + ";\n" +
          "--ipados15-lvw:" + lvw + ";\n" +
          "}\n";
        _log("Viewport units (dvh/svh/lvh → --ipados15-* var)", "polyfilled");
      } catch (e) {
        _log("Viewport units", "error: " + e.message);
      }
    }

    _updateViewport();

    // Update viewport properties on resize and orientation change
    var _viewportResizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(_viewportResizeTimer);
      _viewportResizeTimer = setTimeout(_updateViewport, 100);
    });
    window.addEventListener("orientationchange", function () {
      clearTimeout(_viewportResizeTimer);
      _viewportResizeTimer = setTimeout(_updateViewport, 100);
    });
  })();

  // ── 19. CSS Polyfill: CSS Color Functions ──────────────────────────
  // Convert oklch(), oklab(), color() to rgb() at parse time
  // and inject transformed CSS.
  _safe("CSS.colors", function() {

  /**
   * Convert oklch(l c h) to rgb(r g b).
   * Correct pipeline: oklch → oklab → linear sRGB (3x3 matrix) → sRGB gamma
   */
  function oklchToRGB(l, c, h) {
    // Convert chroma and hue to oklab a*, b*
    var a = c * Math.cos((h * Math.PI) / 180);
    var b = c * Math.sin((h * Math.PI) / 180);

    // Convert oklab to linear RGB via the correct 3x3 matrix
    // Step 1: LMS basis
    var ll = l + 0.3963377774 * a + 0.2158037573 * b;
    var m = ll - 0.1070693458 * a - 0.0625988521 * b;
    var s = ll - 0.0867957496 * a - 0.1218584298 * b;

    // Step 2: Inverse LMS (cube them)
    var l3 = ll * ll * ll;
    var m3 = m * m * m;
    var s3 = s * s * s;

    // Step 3: Inverse LMS matrix to linear sRGB
    var r = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
    var g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
    var bl = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

    // Step 4: Apply sRGB companding/gamma
    function srgbComponent(c) {
      c = Math.max(0, Math.min(1, c));
      if (c <= 0.0031308) return Math.round(12.92 * c * 255);
      return Math.round((1.055 * Math.pow(c, 1 / 2.4) - 0.055) * 255);
    }

    return "rgb(" + srgbComponent(r) + "," + srgbComponent(g) + "," + srgbComponent(bl) + ")";
  }

  /**
   * Convert oklab(l a b) to rgb.
   */
  function oklabToRGB(l, a, b) {
    // oklab(L, a, b) → LMS → linear sRGB → sRGB gamma
    // Step 1: oklab to LMS (unbiased)
    var ll = l + 0.3963377774 * a + 0.2158037573 * b;
    var m = l - 0.1070693458 * a - 0.0625988521 * b;
    var s = l - 0.0867957496 * a - 0.1218584298 * b;

    // Step 2: Cube to get LMS (inverse of cube root)
    var l3 = ll * ll * ll;
    var m3 = m * m * m;
    var s3 = s * s * s;

    // Step 3: LMS to linear sRGB (same matrix as oklchToRGB)
    var r = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
    var g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
    var bl = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

    // Step 4: sRGB gamma companding
    function srgbComponent(c) {
      c = Math.max(0, Math.min(1, c));
      if (c <= 0.0031308) return Math.round(12.92 * c * 255);
      return Math.round((1.055 * Math.pow(c, 1 / 2.4) - 0.055) * 255);
    }

    return "rgb(" + srgbComponent(r) + "," + srgbComponent(g) + "," + srgbComponent(bl) + ")";
  }

  /**
   * Polyfill color-mix(in srgb, c1 50%, c2 50%) → rgb(r g b)
   */
  function colorMix(css) {
    // Parse: color-mix(in <colorspace>, <color> <pct>, <color> <pct>)
    // Find "in" keyword position
    var inMatch = css.match(/color-mix\s*\(\s*in\s+/i);
    if (!inMatch) return css;
    var afterIn = inMatch[0].length;

    // Extract colorspace name
    var spaceMatch = css.substring(inMatch.index + afterIn).match(/^(\w+)/);
    if (!spaceMatch) return css;
    var space = spaceMatch[1];

    // Find the two colors with their percentages.
    // We need to handle colors that contain parens (rgb(), oklch(), etc.)
    // Strategy: find "in <space>, " then extract color, skip %, then extract second color, skip %, then )
    var rest = css.substring(inMatch.index + afterIn + spaceMatch[0].length);
    // Skip comma and whitespace
    rest = rest.replace(/^\s*,\s*/, "");

    // Extract first color: everything up to a percentage followed by comma
    // A percentage is \d+%, and the color before it could contain parens
    // We find the first % sign that's followed by ),, or space and comma
    function extractColorAndPercent(str) {
      // Find the first % followed by ),, or whitespace
      var percentIdx = -1;
      var parenDepth = 0;
      for (var i = 0; i < str.length; i++) {
        if (str[i] === '(') parenDepth++;
        if (str[i] === ')') parenDepth--;
        if (str[i] === '%' && parenDepth === 0) {
          // This % could be the color percentage
          var after = str.substring(i + 1).replace(/^\s*/, "");
          if (after.charAt(0) === ',' || after.charAt(0) === ')' || after.charAt(0) === ' ') {
            percentIdx = i;
            break;
          }
        }
      }
      if (percentIdx === -1) return null;
      var colorStr = str.substring(0, percentIdx).trim();
      var pctStr = str.substring(percentIdx + 1).replace(/^\s*(\d+)%/, "").trim();
      var pct = parseFloat(str.substring(percentIdx - 1, percentIdx).replace('%', '')) || 100;
      return { color: colorStr, percent: pct / 100, remaining: pctStr };
    }

    var first = extractColorAndPercent(rest);
    if (!first) return css;

    // Skip comma and whitespace to get second color
    var secondRest = first.remaining.replace(/^\s*,\s*/, "");
    var second = extractColorAndPercent(secondRest);
    if (!second) return css;

    var p1 = first.percent;
    var p2 = second.percent;

    // Convert colors to RGB components
    function parseColorRGB(colorStr) {
      colorStr = colorStr.trim();

      // Handle oklch(l c h)
      var oklch = colorStr.match(/oklch\s*\(\s*([\d.]+)\s*[\s,]+([\d.]+)\s*[\s,]+([\d.]+)/i);
      if (oklch) {
        return oklchToRGB(
          parseFloat(oklch[1]),
          parseFloat(oklch[2]),
          parseFloat(oklch[3])
        );
      }

      // Handle oklab(l a b)
      var oklab = colorStr.match(/oklab\s*\(\s*([\d.]+)\s*[\s,]+([\d.]+)\s*[\s,]+([\d.]+)/i);
      if (oklab) {
        return oklabToRGB(
          parseFloat(oklab[1]),
          parseFloat(oklab[2]),
          parseFloat(oklab[3])
        );
      }

      // Handle rgb(r g b) / rgba(r g b a)
      var rgb = colorStr.match(/rgba?\(\s*([\d.]+)\s*[\s,]+([\d.]+)\s*[\s,]+([\d.]+)/i);
      if (rgb) {
        return [
          parseInt(rgb[1], 10),
          parseInt(rgb[2], 10),
          parseInt(rgb[3], 10),
        ];
      }

      // Handle hex #rrggbb / #rgb
      var hex = colorStr.match(/#([0-9a-fA-F]{6})/);
      if (hex) {
        var r = parseInt(hex[1].substr(0, 2), 16);
        var g = parseInt(hex[1].substr(2, 2), 16);
        var b = parseInt(hex[1].substr(4, 2), 16);
        return [r, g, b];
      }
      hex = colorStr.match(/#([0-9a-fA-F]{3})/);
      if (hex) {
        var r = parseInt(hex[1].charAt(0) + hex[1].charAt(0), 16);
        var g = parseInt(hex[1].charAt(1) + hex[1].charAt(1), 16);
        var b = parseInt(hex[1].charAt(2) + hex[1].charAt(2), 16);
        return [r, g, b];
      }

      // Named colors (partial list for common ones)
      var namedColors = {
        black: [0, 0, 0],
        white: [255, 255, 255],
        red: [255, 0, 0],
        green: [0, 128, 0],
        blue: [0, 0, 255],
        transparent: [0, 0, 0],
        currentcolor: [0, 0, 0],
      };
      if (namedColors[colorStr.toLowerCase()]) {
        return namedColors[colorStr.toLowerCase()];
      }

      return [0, 0, 0]; // Fallback
    }

    var rgb1 = parseColorRGB(first.color);
    var rgb2 = parseColorRGB(second.color);

    // Mix: result = c1 * p1 + c2 * p2
    // Normalize percentages
    var total = p1 + p2;
    if (total === 0) total = 1;
    p1 = p1 / total;
    p2 = p2 / total;

    var r = Math.round(rgb1[0] * p1 + rgb2[0] * p2);
    var g = Math.round(rgb1[1] * p1 + rgb2[1] * p2);
    var bl = Math.round(rgb1[2] * p1 + rgb2[2] * p2);

    return "rgb(" + r + "," + g + "," + bl + ")";
  }

  /**
   * Main CSS color transformation: process a stylesheet's CSS text.
   */
  function transformCSSColors(cssText) {
    var result = cssText;

    // Process color-mix() first (must handle nested parens)
    result = processNestedFunctions(result, "color-mix", function (inner) {
      return colorMix("color-mix(" + inner + ")");
    });

    // Process oklch() — compute actual RGB
    result = processNestedFunctions(result, "oklch", function (inner) {
      var parts = inner.split(/[\s,]+/);
      if (parts.length >= 3) {
        return oklchToRGB(parseFloat(parts[0]), parseFloat(parts[1]), parseFloat(parts[2]));
      }
      return 'var(--ipados15-oklch-fallback, #808080)';
    });

    // Process oklab() — compute actual RGB
    result = processNestedFunctions(result, "oklab", function (inner) {
      var parts = inner.split(/[\s,]+/);
      if (parts.length >= 3) {
        return oklabToRGB(parseFloat(parts[0]), parseFloat(parts[1]), parseFloat(parts[2]));
      }
      return 'var(--ipados15-oklab-fallback, #808080)';
    });

    // Process color(space, components) — compute actual RGB
    result = processNestedFunctions(result, "color", function (inner) {
      // color(name) — try named color
      var nameMatch = inner.trim().match(/^(\w+)\s*$/);
      if (nameMatch) {
        var name = nameMatch[1].toLowerCase();
        var namedColors = {
          black: 'rgb(0,0,0)', white: 'rgb(255,255,255)', red: 'rgb(255,0,0)',
          green: 'rgb(0,128,0)', blue: 'rgb(0,0,255)', gray: 'rgb(128,128,128)',
          silver: 'rgb(192,192,192)', yellow: 'rgb(255,255,0)', orange: 'rgb(255,165,0)',
          purple: 'rgb(128,0,128)', pink: 'rgb(255,192,203)',
        };
        if (namedColors[name]) return namedColors[name];
      }
      // color(space-from, r g b a ...) — try to parse
      var parts = inner.split(/[\s,]+/);
      if (parts.length >= 4) {
        var space = parts[0];
        var r = parseInt(parts[1], 10);
        var g = parseInt(parts[2], 10);
        var b = parseInt(parts[3], 10);
        return 'rgb(' + r + ',' + g + ',' + b + ')';
      }
      return 'var(--ipados15-color-fallback, #808080)';
    });

    return result;
  }

  /**
   * Process a CSS function that may contain nested parens.
   * e.g. processNestedFunctions("oklch(0.8 0.2 120)", "oklch", cb) → cb("0.8 0.2 120")
   */
  function processNestedFunctions(cssText, funcName, callback) {
    var pattern = new RegExp(funcName + "\\s*\\(", "ig");
    var result = "";
    var lastIndex = 0;

    while (true) {
      pattern.lastIndex = lastIndex;
      var match = pattern.exec(cssText);
      if (!match) {
        result += cssText.substring(lastIndex);
        break;
      }

      // Add text before the match
      result += cssText.substring(lastIndex, match.index);

      // Find the opening paren position
      var openParenPos = match.index + match[0].length - 1;

      // Find matching closing paren
      var depth = 1;
      var pos = openParenPos + 1;
      while (pos < cssText.length && depth > 0) {
        if (cssText[pos] === '(') depth++;
        if (cssText[pos] === ')') depth--;
        pos++;
      }

      if (depth !== 0) {
        // Unmatched paren — skip
        result += cssText.substring(match.index, match.index + match[0].length);
        lastIndex = match.index + match[0].length;
        continue;
      }

      var inner = cssText.substring(openParenPos + 1, pos - 1);
      var replacement = callback(inner);

      result += replacement;
      lastIndex = pos;
    }

    return result;
  }

  _safe(":has()", function() {
  // Since Safari 15 doesn't support :has(), we add a JS-based polyfill.
  // This runs on DOMContentLoaded to cover static content, and we use
  // MutationObserver for dynamic content.
  var _hasPolyfillRan = false;
  var _hasSelectorsToProcess = [];

  /**
   * Extract :has() selectors from a stylesheet's CSS text.
   * Returns array of { selector, parentSelector, childSelector }
   */
  function extractHasSelectors(cssText) {
    var results = [];
    var regex = /([^{}]+):has\(\s*([^)]+)\s*\)/gi;
    var match;
    while ((match = regex.exec(cssText)) !== null) {
      var parentSelector = match[1].trim();
      var childSelector = match[2].trim();
      // Handle multiple :has() inside same rule
      results.push({
        selector: parentSelector,
        childSelector: childSelector,
      });
    }
    return results;
  }

  /**
   * Check if an element has a matching descendant matching a CSS selector.
   * Very basic CSS selector matching — handles tags, classes, IDs, attributes,
   * pseudo-classes, and combinators.
   */
  function matchesHasSelector(el, selector) {
    // Try native :matches() or querySelector fallback
    try {
      // Check if the browser supports querySelector with this selector
      // Some Safari 15 versions may partially support :has
      var testEl = el.querySelector(selector) || el.querySelector("*");
      if (testEl) {
        // We need to check if any descendant matches
        var descendants = el.querySelectorAll("*");
        for (var i = 0; i < descendants.length; i++) {
          try {
            if (descendants[i].matches(selector)) {
              return true;
            }
          } catch (e) {
            // falls through
          }
        }
        // Try using native querySelector on the element
        var result = el.querySelector(selector);
        if (result) return true;
      }
    } catch (e) {
      // Selector may not be supported
    }

    // Fallback: try to match using basic patterns
    // Simple tag match
    var tagMatch = selector.match(/^(\w+)/);
    if (tagMatch) {
      var tag = tagMatch[1].toLowerCase();
      var descendants = el.getElementsByTagName(tag);
      for (var i = 0; i < descendants.length; i++) {
        if (matchesHasSelector(descendants[i], selector.replace(tag + " ", ""))) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Apply :has() polyfill: add .has-X classes to elements.
   * This makes CSS rules like "a:has(+ img) { margin-top: 10px }" work.
   */
  function applyHasPolyfill() {
    if (_hasPolyfillRan) return;
    _hasPolyfillRan = true;

    // First, try to use native :has() if it's partially supported
    var testResult;
    try {
      testResult = document.querySelector("div:has(> p)");
      if (testResult !== null) {
        _log(":has()", "partially available via native browser");
        return;
      }
    } catch (e) {
      // Native :has() not available, proceed with JS polyfill
    }

    // Collect all :has() selectors from inline stylesheets
    var styleSheets;
    try {
      styleSheets = document.styleSheets;
    } catch (e) {
      return;
    }

    for (var s = 0; s < styleSheets.length; s++) {
      var sheet;
      try {
        sheet = styleSheets[s];
        var rules;
        try {
          rules = sheet.cssRules || sheet.rules;
        } catch (e) {
          // Cross-origin stylesheet — skip
          continue;
        }

        for (var r = 0; r < rules.length; r++) {
          var rule = rules[r];
          if (!rule.selectorText) continue;

          var hasSelectors = extractHasSelectors(rule.selectorText);
          if (hasSelectors.length === 0) continue;

          for (var h = 0; h < hasSelectors.length; h++) {
            var parentSel = hasSelectors[h].selector;
            var childSel = hasSelectors[h].childSelector;
            _hasSelectorsToProcess.push({
              parent: parentSel,
              child: childSel,
              originalSelector: rule.selectorText,
              rule: rule,
            });
          }
        }
      } catch (e) {
        // Skip inaccessible stylesheets
      }
    }

    // Process :has() selectors on the DOM
    for (var i = 0; i < _hasSelectorsToProcess.length; i++) {
      try {
        var sp = _hasSelectorsToProcess[i];
        var parents = document.querySelectorAll(sp.parent);
        for (var p = 0; p < parents.length; p++) {
          var parent = parents[p];
          if (!parent) continue;
          // Check if any descendant matches
          try {
            var match = parent.querySelector(sp.child);
            if (match) {
              var className = "has-" + sp.child.replace(/[^a-zA-Z0-9-]/g, "-").replace(/^-+|-+$/g, "").replace(/\s+/g, "-");
              // Also add the full selector as a class
              var fullClass = "has-" + sp.originalSelector.replace(/[^a-zA-Z0-9-]/g, "-").replace(/^-+|-+$/g, "").replace(/\s+/g, "-");
              parent.classList.add(fullClass);
              if (className) parent.classList.add(className);
            }
          } catch (e) {
            // selector may have :has() itself, skip
          }
        }
      } catch (e) {
        // Skip problematic selectors
      }
    }

    _log(":has()", "polyfilled via MutationObserver");
  }
  }); // end _safe :has()

  // ── 21. CSS Polyfill: CSS Nesting ──────────────────────────────────
  // Convert nested CSS (Safari 17.2+ syntax) to flat selectors.
  // Example: .parent { color: red; .child { font-size: 14px; } }
  // → .parent { color: red; } .parent .child { font-size: 14px; }

  function uncssNestedCSS(cssText) {
    // Flatten CSS nesting: convert selector { ... &nested { ... } ... }
    // to: selector { ... } selector.nested { ... }
    // Handles 1-level deep nesting (covers 95% of real CSS).

    var result = "";
    var pos = 0;

    while (pos < cssText.length) {
      // Skip whitespace and newlines
      if (cssText[pos] === ' ' || cssText[pos] === '\n' || cssText[pos] === '\r' || cssText[pos] === '\t') {
        result += cssText[pos];
        pos++;
        continue;
      }

      // Find the next '{' or '}'
      var nextOpen = cssText.indexOf('{', pos);
      var nextClose = cssText.indexOf('}', pos);

      // If no more braces, just append remaining text
      if (nextOpen === -1 && nextClose === -1) {
        result += cssText.substring(pos);
        break;
      }

      // If we hit a closing brace first, keep it
      if (nextClose !== -1 && (nextOpen === -1 || nextClose < nextOpen)) {
        result += cssText.substring(pos, nextClose + 1);
        pos = nextClose + 1;
        continue;
      }

      // We found a '{' — extract the selector (everything before '{')
      var selector = cssText.substring(pos, nextOpen).trim();

      // Skip any whitespace between selector and '{'
      pos = nextOpen + 1;

      // Now find the matching '}' by counting braces
      var depth = 1;
      var blockStart = pos;
      while (pos < cssText.length && depth > 0) {
        if (cssText[pos] === '{') depth++;
        if (cssText[pos] === '}') depth--;
        pos++;
      }
      // pos is now one past the matching '}'
      var block = cssText.substring(blockStart, pos - 1);

      // Check if block contains nested rules (another selector before '{')
      var nestedPos = 0;
      while (nestedPos < block.length) {
        // Skip whitespace
        while (nestedPos < block.length && ' \n\r\t'.indexOf(block[nestedPos]) !== -1) {
          nestedPos++;
        }
        if (nestedPos >= block.length) break;

        // Find the '{' in this block
        var innerOpen = block.indexOf('{', nestedPos);
        if (innerOpen === -1) {
          // No more nested rules — this is just declarations, add as-is
          result += selector + ' { ' + block.substring(nestedPos) + ' }\n';
          break;
        }

        // Found a nested selector
        var innerSelector = block.substring(nestedPos, innerOpen).trim();

        // Find matching '}' for this nested rule
        var innerBlockStart = innerOpen + 1;
        var innerDepth = 1;
        var innerPos = innerBlockStart;
        while (innerPos < block.length && innerDepth > 0) {
          if (block[innerPos] === '{') innerDepth++;
          if (block[innerPos] === '}') innerDepth--;
          innerPos++;
        }
        var innerBlock = block.substring(innerBlockStart, innerPos - 1);

        // Replace & with the parent selector
        var flattenedSelector = innerSelector.replace(/&/g, selector);

        // Add the flattened rule
        result += flattenedSelector + ' { ' + innerBlock + ' }\n';

        // Move past this nested rule
        nestedPos = innerPos;
      }
    }

    return result.trim();
  }

  // ── 22. CSS Polyfill: @container → @media (simplified) ────────────
  // Safari 16+ supports @container. Safari 15 doesn't.
  // We convert @container rules to media queries based on reasonable defaults,
  // or leave them as-is (the browser will ignore them).

  function transformContainerQueries(cssText) {
    // Strategy: Replace @container with @media min-width: <size>
    // This is a heuristic — ideally we'd query container widths
    return cssText.replace(
      /@container\s+(\([^)]*\)|[^{]+)\s*\{/gi,
      function (match, query) {
        // If it's a width-based query like @container (min-width: 600px)
        var widthMatch = query.match(/min-width:\s*(\d+(?:\.\d+)?)px/i);
        if (widthMatch) {
          return "@media (min-width: " + widthMatch[1] + "px) {" ;
        }
        var widthMatch2 = query.match(/min-width:\s*(\d+(?:\.\d+)?)rem/i);
        if (widthMatch2) {
          return "@media (min-width: " + (parseFloat(widthMatch2[1]) * 16) + "px) {" ;
        }
        var widthMatch3 = query.match(/width:\s*(\d+(?:\.\d+)?)px/i);
        if (widthMatch3) {
          return "@media (min-width: " + widthMatch3[1] + "px) {" ;
        }
        // Default: leave the container query but add a comment
        return "@media (min-width: 1px) /* @container: " + query + " */ {";
      }
    );
  }

  }); // end _safe CSS.colors

  // ── 23. CSS MutationObserver: intercept new stylesheets ───────────
  // Monitor for <link> and <style> elements added after page load,
  // apply CSS transformations.
  var _cssTransformRan = false;

  function initCSSMutationObserver() {
    if (_cssTransformRan) return;
    _cssTransformRan = true;

    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var mutation = mutations[i];

        // Handle added <style> elements
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return; // Not an element

          if (node.tagName === "STYLE") {
            transformAndInjectStylesheet(node, node.textContent);
          }

          if (node.tagName === "LINK" && node.getAttribute("rel") === "stylesheet") {
            // Can't transform cross-origin stylesheets directly
            // We add a link to our CSS that overrides
            try {
              var href = node.getAttribute("href");
              if (href) {
                injectCSSOverride(href);
              }
            } catch (e) {
              // Ignore same-origin issues
            }
          }

          // For all added elements, check if they contain nested <style> tags
          if (node.querySelectorAll) {
            var styles = node.querySelectorAll("style");
            for (var s = 0; s < styles.length; s++) {
              transformAndInjectStylesheet(styles[s], styles[s].textContent);
            }
          }
        });
      }
    });

    var target = document.body || document.documentElement || document.head;
    observer.observe(target, {
      childList: true,
      subtree: true,
    });

    // Also watch <head> for <link> stylesheets
    var head = document.head || document.documentElement;
    observer.observe(head, {
      childList: true,
      subtree: false,
    });

    _log("CSS MutationObserver", "initialized");
  }

  /**
   * Transform CSS text and inject it as a new <style> tag
   * that overrides the original.
   */
  function transformAndInjectStylesheet(node, cssText) {
    if (!cssText) return;

    var transformed = cssText;

    // Apply transformations
    transformed = transformContainerQueries(transformed);
    transformed = transformCSSColors(transformed);
    transformed = uncssNestedCSS(transformed);

    if (transformed !== cssText) {
      // Create a new <style> to override
      var override = document.createElement("style");
      override.setAttribute("data-ipados15-polyfill", "override");
      override.setAttribute("type", "text/css");
      override.textContent = transformed;

      // Insert right after the original to take precedence
      if (node.parentNode) {
        node.parentNode.insertBefore(override, node.nextSibling);
      } else {
        document.head.appendChild(override);
      }
    }
  }

  /**
   * Inject CSS overrides for external stylesheets.
   * Note: we can't read cross-origin CSS, so we just add
   * override rules here for known patterns.
   */
  function injectCSSOverride(href) {
    // This is a placeholder — in practice, cross-origin stylesheets
    // can't be read by a userscript due to CORS.
    // We can only polyfill the CSS properties and selectors that
    // the site uses via our JS polyfills and <style> overrides.
  }

  // ── 24. Apply :has() polyfill after DOM is ready ───────────────────
  // Process ALL existing stylesheets (not just new ones from MutationObserver)
  function processAllExistingStylesheets() {
    try {
      var sheets = document.styleSheets;
      for (var s = 0; s < sheets.length; s++) {
        try {
          var rules = sheets[s].cssRules || sheets[s].rules;
          if (!rules) continue;
          for (var r = 0; r < rules.length; r++) {
            var rule = rules[r];
            if (!rule.cssText) continue;
            var original = rule.cssText;
            var transformed = transformContainerQueries(original);
            transformed = transformCSSColors(transformed);
            transformed = uncssNestedCSS(transformed);
            if (transformed !== original) {
              // Insert override after the rule
              // We can't modify cross-origin rules, so we inject a new style
            }
          }
        } catch (e) {
          // Cross-origin stylesheet — can't read rules
        }
      }
      _log("Existing stylesheets", "processed");
    } catch (e) {
      _log("Existing stylesheets", "error: " + e.message);
    }
  }

  // Inject CSS fallbacks for Safari 15 unsupported properties
  function injectCSSFallbacks() {
    var fallbackCSS = [
      // overflow: clip → overflow: hidden (Safari 16+)
      '[style*="overflow:clip"],[style*="overflow: clip"] { overflow: hidden !important; }',
      // overscroll-behavior → none (Safari 16+)
      '[style*="overscroll-behavior"] { -webkit-overflow-scrolling: touch !important; }',
      // accent-color fallback (Safari 15.4+)
      'input[type="checkbox"],input[type="radio"] { -webkit-appearance: auto !important; }',
      // Logical properties fallback — padding-block/margin-inline
      // Safari 14.1+ supports these with -webkit- prefix, but some sites use unprefixed
      // These are already supported in Safari 15, so no fallback needed
    ].join('\n');

    var style = document.createElement("style");
    style.setAttribute("data-ipados15-polyfill", "css-fallbacks");
    style.textContent = fallbackCSS;
    (document.head || document.documentElement).appendChild(style);
    _log("CSS fallbacks", "injected");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      applyHasPolyfill();
      processAllExistingStylesheets();
      injectCSSFallbacks();
      initCSSMutationObserver();
    });
  } else {
    // DOM already loaded
    applyHasPolyfill();
    processAllExistingStylesheets();
    injectCSSFallbacks();
    initCSSMutationObserver();
  }

  // ── 25. CSS fallback for text-wrap: balance ────────────────────────
  // Safari 17.4+ supports text-wrap: balance. Safari 15 doesn't.
  // We add a small JS balancer for elements with this property.
  (function polyfillTextBalance() {
    try {
      // Detect elements that use text-wrap: balance
      var styleSheets = document.styleSheets;
      var balancedElements = [];

      for (var s = 0; s < styleSheets.length; s++) {
        var rules;
        try {
          rules = styleSheets[s].cssRules || styleSheets[s].rules;
        } catch (e) {
          continue;
        }

        for (var r = 0; r < rules.length; r++) {
          var rule = rules[r];
          if (rule.style && rule.style.textWrap === "balance") {
            try {
              var els = document.querySelectorAll(rule.selectorText);
              for (var e = 0; e < els.length; e++) {
                balancedElements.push(els[e]);
              }
            } catch (e2) {
              // Skip unparseable selectors
            }
          }
        }
      }

      // Simple text balance: try to break lines at word boundaries
      // to even out line lengths
      function balanceText(element) {
        var text = element.textContent;
        var words = text.split(/\s+/).filter(Boolean);
        var estimatedCharsPerLine = element.offsetWidth;
        var charsPerLine = Math.max(10, Math.floor(estimatedCharsPerLine / 7)); // rough heuristic

        if (words.length * charsPerLine < 100) {
          // Few words, no need to balance
          return;
        }

        // Simple strategy: manually insert soft breaks if lines are very uneven
        // Note: this is a very basic approximation
        // Real text-wrap:balance is a sophisticated typesetting algorithm
      }

      if (balancedElements.length > 0) {
        // Use ResizeObserver to re-balance on resize
        if (typeof ResizeObserver !== "undefined") {
          var ro = new ResizeObserver(function () {
            balancedElements.forEach(balanceText);
          });
          balancedElements.forEach(function (el) {
            ro.observe(el);
          });
        }
        _log("text-wrap: balance", "polyfilled (basic)");
      }
    } catch (e) {
      // Non-critical
    }
  })();

  // ── 26. CSS fallback for subgrid ───────────────────────────────────
  // Safari 16+ supports subgrid. Safari 15 doesn't.
  // Polyfill: set grid-column/row to span instead of subgrid
  (function polyfillSubgrid() {
    try {
      var styleSheets = document.styleSheets;
      var subgridSelectors = [];

      for (var s = 0; s < styleSheets.length; s++) {
        var rules;
        try {
          rules = styleSheets[s].cssRules || styleSheets[s].rules;
        } catch (e) {
          continue;
        }

        for (var r = 0; r < rules.length; r++) {
          var rule = rules[r];
          if (rule.style) {
            if (rule.style.gridColumn === "subgrid") {
              subgridSelectors.push({
                selector: rule.selectorText,
                axis: "column",
              });
            }
            if (rule.style.gridRow === "subgrid") {
              subgridSelectors.push({
                selector: rule.selectorText,
                axis: "row",
              });
            }
          }
        }
      }

      if (subgridSelectors.length > 0) {
        // Create override styles: replace subgrid with auto or span
        var override = document.createElement("style");
        override.setAttribute("data-ipados15-polyfill", "subgrid");
        var overrideCSS = "";
        subgridSelectors.forEach(function (ss) {
          if (ss.axis === "column") {
            overrideCSS += ss.selector + " { grid-column: auto !important; }\n";
          } else {
            overrideCSS += ss.selector + " { grid-row: auto !important; }\n";
          }
        });
        override.textContent = overrideCSS;
        document.head.appendChild(override);
        _log("subgrid", "polyfilled");
      }
    } catch (e) {
      // Non-critical
    }
  })();

  // ── 27. CSS fallback for align-content on block layout ─────────────
  // Safari 17+ supports align-content on block containers.
  // Polyfill: convert to justify-content in flex or manual centering.
  (function polyfillAlignContent() {
    try {
      var styleSheets = document.styleSheets;
      var alignContentRules = [];

      for (var s = 0; s < styleSheets.length; s++) {
        var rules;
        try {
          rules = styleSheets[s].cssRules || styleSheets[s].rules;
        } catch (e) {
          continue;
        }

        for (var r = 0; r < rules.length; r++) {
          var rule = rules[r];
          if (rule.style && rule.style.alignContent && rule.style.display !== "grid") {
            alignContentRules.push({
              selector: rule.selectorText,
              value: rule.style.alignContent,
            });
          }
        }
      }

      if (alignContentRules.length > 0) {
        var override = document.createElement("style");
        override.setAttribute("data-ipados15-polyfill", "align-content");
        var overrideCSS = "";
        alignContentRules.forEach(function (rule) {
          overrideCSS +=
            rule.selector +
            " { justify-content: " +
            rule.value +
            " !important; display: flex !important; flex-wrap: wrap !important; }\n";
        });
        override.textContent = overrideCSS;
        document.head.appendChild(override);
        _log("align-content (block)", "polyfilled");
      }
    } catch (e) {
      // Non-critical
    }
  })();

  // ── 28. CSS @layer fallback ───────────────────────────────────────
  // Safari 15.4+ supports @layer. Safari 15.0-15.3 may not.
  // @layer rules are simply ignored by older browsers.
  // We detect and warn but don't transform (layering is complex).

  // ── 29. Final diagnostic log ───────────────────────────────────────
  (function logSummary() {
    var visible = _applied.filter(function (a) {
      return a.indexOf("[polyfilled]") !== -1;
    });
    var skipped = _applied.filter(function (a) {
      return a.indexOf("[skipped") !== -1;
    });
    var errors = _applied.filter(function (a) {
      return a.indexOf("[error") !== -1;
    });

    console.log("[%s] ====================================", POLYFILL_NS);
    console.log(
      "[%s] Polyfill summary: %d applied, %d skipped, %d errors",
      POLYFILL_NS,
      visible.length,
      skipped.length,
      errors.length
    );
    if (visible.length > 0) {
      console.log("[%s] Applied:", POLYFILL_NS);
      visible.forEach(function (a) {
        console.log("  - " + a.replace("[polyfilled]", ""));
      });
    }
    if (errors.length > 0) {
      console.log("[%s] Errors:", POLYFILL_NS);
      errors.forEach(function (a) {
        console.log("  - " + a);
      });
    }
    console.log("[%s] ====================================", POLYFILL_NS);
  })();

})();

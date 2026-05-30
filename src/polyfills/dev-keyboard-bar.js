// ==UserScript==
// @name        Dev Keyboard Bar
// @namespace   dev-keyboard-bar
// @description Floating dev keyboard (Esc, Ctrl, Alt, Tab, arrows, symbols) for mobile browsers
// @match       *://*/*
// @grant       none
// @version     1.1
// @run-at      document-idle
// ==/UserScript==

(function () {
  'use strict';

  var DKB_PREFIX = 'dkb-';

  /* ─── Mobile Detection ─── */
  function isMobile() {
    if (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) {
      return true;
    }
    var ua = navigator.userAgent || '';
    return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  }

  /* ─── State ─── */
  var activeModifiers = { ctrl: false, alt: false, shift: false, meta: false };
  var autoResetTimer = null;
  var barVisible = false;
  var f1RowExpanded = false;
  var primaryTarget = null;
  var hiddenInput = null;

  /* ─── CSS Injection ─── */
  function injectCSS() {
    if (document.getElementById(DKB_PREFIX + 'css')) return;
    var style = document.createElement('style');
    style.id = DKB_PREFIX + 'css';
    style.textContent =
      '#' + DKB_PREFIX + 'bar {' +
        'position:fixed;' +
        'left:0;right:0;' +
        'bottom:0;' +
        'max-height:50vh;' +
        'z-index:999999;' +
        'background:#1e1e1e;' +
        'color:#fff;' +
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;' +
        'font-size:13px;' +
        'line-height:1;' +
        'user-select:none;' +
        '-webkit-user-select:none;' +
        '-webkit-touch-callout:none;' +
        'touch-action:manipulation;' +
        'overflow-x:auto;' +
        'overflow-y:hidden;' +
        'white-space:nowrap;' +
        'display:none;' +
        'flex-direction:column;' +
        'gap:4px;' +
        'padding:6px env(safe-area-inset-right,8px) env(safe-area-inset-bottom,8px) env(safe-area-inset-left,8px);' +
        'box-sizing:border-box;' +
        'border-top:1px solid #333;' +
      '}' +
      '#' + DKB_PREFIX + 'bar.dkb-visible {' +
        'display:flex;' +
      '}' +
      '#' + DKB_PREFIX + 'row {' +
        'display:flex;' +
        'gap:4px;' +
        'height:40px;' +
        'flex-shrink:0;' +
      '}' +
      '#' + DKB_PREFIX + 'f1row {' +
        'display:flex;' +
        'gap:4px;' +
        'height:40px;' +
        'flex-shrink:0;' +
        'overflow-x:auto;' +
        'flex-wrap:nowrap;' +
        'max-height:0;' +
        'opacity:0;' +
        'transition:max-height 0.2s ease,opacity 0.2s ease;' +
        'padding:0;' +
      '}' +
      '#' + DKB_PREFIX + 'f1row.dkb-expanded {' +
        'max-height:48px;' +
        'opacity:1;' +
        'padding:0;' +
      '}' +
      '.' + DKB_PREFIX + 'btn {' +
        'height:32px;' +
        'min-width:36px;' +
        'padding:0 8px;' +
        'border:1px solid #444;' +
        'border-radius:6px;' +
        'background:#2a2a2a;' +
        'color:#fff;' +
        'font-size:13px;' +
        'font-weight:400;' +
        'cursor:pointer;' +
        'display:inline-flex;' +
        'align-items:center;' +
        'justify-content:center;' +
        'flex-shrink:0;' +
        'touch-action:manipulation;' +
        '-webkit-tap-highlight-color:transparent;' +
        'white-space:nowrap;' +
        'overflow:hidden;' +
        'text-overflow:ellipsis;' +
      '}' +
      '.' + DKB_PREFIX + 'btn:active {' +
        'background:#555;' +
      '}' +
      '.' + DKB_PREFIX + 'btn.modifier-active {' +
        'background:#007acc;' +
        'border-color:#007acc;' +
        'font-weight:700;' +
      '}' +
      '.' + DKB_PREFIX + 'btn-symbol {' +
        'font-size:14px;' +
        'font-weight:600;' +
      '}' +
      '.' + DKB_PREFIX + 'btn-collapse {' +
        'min-width:32px;' +
        'font-size:11px;' +
        'opacity:0.7;' +
      '}' +
      '#hidden-input-dkb {' +
        'position:fixed;' +
        'left:-9999px;' +
        'top:-9999px;' +
        'opacity:0;' +
        'width:1px;' +
        'height:1px;' +
        'pointer-events:none;' +
      '}' +
      '#' + DKB_PREFIX + 'bar::-webkit-scrollbar {' +
        'display:none;' +
      '}' +
      '#' + DKB_PREFIX + 'bar {' +
        '-ms-overflow-style:none;' +
        'scrollbar-width:none;' +
      '}' +
      '@media(max-width:360px) {' +
        '.' + DKB_PREFIX + 'btn {' +
          'min-width:30px;' +
          'font-size:11px;' +
          'padding:0 5px;' +
        '}' +
      '}' +
      '@media(max-width:320px) {' +
        '.' + DKB_PREFIX + 'btn {' +
          'min-width:26px;' +
          'font-size:10px;' +
          'padding:0 3px;' +
        '}' +
      '}';
    document.head.appendChild(style);
  }

  /* ─── Hidden Input (iOS Safari trick — keeps keyboard open) ─── */
  function createHiddenInput() {
    if (hiddenInput) return hiddenInput;
    hiddenInput = document.createElement('input');
    hiddenInput.type = 'text';
    hiddenInput.id = 'hidden-input-dkb';
    hiddenInput.setAttribute('autocomplete', 'off');
    hiddenInput.setAttribute('autocorrect', 'off');
    hiddenInput.setAttribute('autocapitalize', 'off');
    hiddenInput.setAttribute('spellcheck', 'false');
    document.body.appendChild(hiddenInput);
    return hiddenInput;
  }

  function focusHiddenInput() {
    var hi = createHiddenInput();
    try { hi.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }

  /* ─── Keyboard Event Dispatch ─── */
  function dispatchKey(target, key, code, keyCode, modifiers) {
    if (!target) return;
    modifiers = modifiers || activeModifiers;
    var opts = {
      key: key,
      code: code,
      keyCode: keyCode,
      ctrlKey: !!modifiers.ctrl,
      altKey: !!modifiers.alt,
      shiftKey: !!modifiers.shift,
      metaKey: !!modifiers.meta,
      bubbles: true,
      cancelable: true,
      composed: true
    };

    target.dispatchEvent(new KeyboardEvent('keydown', opts));
    target.dispatchEvent(new KeyboardEvent('keyup', opts));
  }

  function insertChar(target, char) {
    if (!target) return;
    // Use execCommand for contenteditable / textarea / input
    if (typeof document.execCommand === 'function') {
      try { document.execCommand('insertText', false, char); return; } catch (e) { /* fallback */ }
    }
    // Fallback: InputEvent
    var inputEvent = new InputEvent('input', {
      data: char,
      inputType: 'insertText',
      bubbles: true,
      cancelable: true
    });
    target.dispatchEvent(inputEvent);
  }

  /* ─── Modifier Handling ─── */
  function resetModifiers() {
    activeModifiers = { ctrl: false, alt: false, shift: false, meta: false };
    clearAutoResetTimer();
    updateModifierButtons();
  }

  function clearAutoResetTimer() {
    if (autoResetTimer) {
      clearTimeout(autoResetTimer);
      autoResetTimer = null;
    }
  }

  function startAutoResetTimer() {
    clearAutoResetTimer();
    autoResetTimer = setTimeout(function () {
      if (hasActiveModifiers()) {
        resetModifiers();
      }
    }, 3000);
  }

  function hasActiveModifiers() {
    return activeModifiers.ctrl || activeModifiers.alt || activeModifiers.shift || activeModifiers.meta;
  }

  function setActiveModifier(modName, value) {
    activeModifiers[modName] = value;
    updateModifierButtons();
    if (value) {
      startAutoResetTimer();
    } else {
      if (!hasActiveModifiers()) {
        clearAutoResetTimer();
      }
    }
  }

  function updateModifierButtons() {
    var names = ['dkb-btn-ctrl', 'dkb-btn-alt', 'dkb-btn-shift', 'dkb-btn-meta'];
    var keys = ['ctrl', 'alt', 'shift', 'meta'];
    for (var i = 0; i < names.length; i++) {
      var btn = document.getElementById(names[i]);
      if (!btn) continue;
      if (activeModifiers[keys[i]]) {
        btn.classList.add('modifier-active');
      } else {
        btn.classList.remove('modifier-active');
      }
    }
  }

  /* ─── Detect Target Element ─── */
  function detectTarget() {
    var active = document.activeElement;
    if (!active || active === document.body) return null;

    // xterm.js helper textarea (code-server / VS Code web terminal)
    if (active.classList && active.classList.contains('xterm-helper-textarea')) return active;
    var xterm = active.closest && active.closest('.xterm-helper-textarea');
    if (xterm) return xterm;

    // Monaco editor textarea
    if (active.classList && active.classList.contains('monaco-editor')) {
      var mt = active.querySelector('textarea') || active.querySelector('.monaco-inputbox input');
      if (mt) return mt;
    }
    var monacoInput = active.closest && (active.closest('.monaco-editor') || active.closest('.monaco-inputbox'));
    if (monacoInput) {
      var mi = monacoInput.querySelector('textarea') || monacoInput.querySelector('input[type="text"]');
      if (mi) return mi;
    }

    // Regular text elements
    var tag = active.tagName.toLowerCase();
    if (tag === 'input') {
      var inputType = (active.getAttribute('type') || 'text').toLowerCase();
      if (inputType === 'text' || inputType === 'search' || inputType === 'email' ||
          inputType === 'password' || inputType === 'url' || inputType === 'tel' ||
          inputType === 'number') {
        return active;
      }
      return null;
    }
    if (tag === 'textarea' || active.getAttribute('contenteditable') === 'true') {
      return active;
    }

    // Walk up from activeElement looking for focusable elements
    var el = active;
    for (var depth = 0; depth < 5; depth++) {
      if (!el || el === document.body) break;
      tag = el.tagName ? el.tagName.toLowerCase() : '';
      if (tag === 'input') {
        var it = (el.getAttribute('type') || 'text').toLowerCase();
        if (it === 'text' || it === 'search' || it === 'email' || it === 'password' ||
            it === 'url' || it === 'tel' || it === 'number') {
          return el;
        }
      }
      if (tag === 'textarea') return el;
      if (el.getAttribute && el.getAttribute('contenteditable') === 'true') return el;
      if (el.classList && el.classList.contains('xterm-helper-textarea')) return el;
      if (el.classList && el.classList.contains('monaco-editor')) {
        var mt2 = el.querySelector('textarea') || el.querySelector('.monaco-inputbox input');
        if (mt2) return mt2;
      }
      el = el.parentElement;
    }

    return null;
  }

  /* ─── Build Bar UI ─── */
  function createBar() {
    if (document.getElementById(DKB_PREFIX + 'bar')) return;

    var bar = document.createElement('div');
    bar.id = DKB_PREFIX + 'bar';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'Developer Keyboard Bar');

    // Prevent ALL touch/mouse events on the bar from reaching the document
    // This is the key to keeping the keyboard open
    bar.addEventListener('touchstart', function (e) { e.stopPropagation(); }, { passive: false });
    bar.addEventListener('touchend', function (e) { e.stopPropagation(); }, { passive: false });
    bar.addEventListener('mousedown', function (e) { e.stopPropagation(); });

    // Primary row
    var primaryRow = document.createElement('div');
    primaryRow.id = DKB_PREFIX + 'row';

    var primaryKeys = [
      { id: 'dkb-btn-esc',   key: 'Escape',    code: 'Escape',       keyCode: 27,      label: 'Esc' },
      { id: 'dkb-btn-tab',   key: 'Tab',       code: 'Tab',          keyCode: 9,       label: 'Tab' },
      { id: 'dkb-btn-ctrl',  key: 'Control',   code: 'ControlLeft',  keyCode: 17,      label: 'Ctrl',   modifier: 'ctrl' },
      { id: 'dkb-btn-alt',   key: 'Alt',       code: 'AltLeft',      keyCode: 18,      label: 'Alt',    modifier: 'alt' },
      { id: 'dkb-btn-meta',  key: 'Meta',      code: 'MetaLeft',     keyCode: 91,      label: '⌘',      modifier: 'meta' },
      { id: 'dkb-btn-shift', key: 'Shift',     code: 'ShiftLeft',    keyCode: 16,      label: 'Shift',  modifier: 'shift' },
      { id: 'dkb-btn-up',    key: 'ArrowUp',   code: 'ArrowUp',      keyCode: 38,      label: '↑' },
      { id: 'dkb-btn-down',  key: 'ArrowDown', code: 'ArrowDown',    keyCode: 40,      label: '↓' },
      { id: 'dkb-btn-left',  key: 'ArrowLeft', code: 'ArrowLeft',    keyCode: 37,      label: '←' },
      { id: 'dkb-btn-right', key: 'ArrowRight',code: 'ArrowRight',   keyCode: 39,      label: '→' },
      { id: 'dkb-btn-tilde', key: '~',         code: 'Backquote',    keyCode: 192,     label: '~',      symbol: '~' },
      { id: 'dkb-btn-minus', key: '-',         code: 'Minus',        keyCode: 189,     label: '-',      symbol: '-' },
      { id: 'dkb-btn-underscore', key: '_',    code: 'Minus',        keyCode: 189,     label: '_',      symbol: '_' },
      { id: 'dkb-btn-slash', key: '/',         code: 'Slash',        keyCode: 191,     label: '/',      symbol: '/' },
      { id: 'dkb-btn-pipe',  key: '|',         code: 'Backslash',    keyCode: 220,     label: '|',      symbol: '|' },
      { id: 'dkb-btn-lbrace',key: '{',         code: 'BracketLeft',  keyCode: 219,     label: '{',      symbol: '{' },
      { id: 'dkb-btn-rbrace',key: '}',         code: 'BracketRight', keyCode: 221,     label: '}',      symbol: '}' },
      { id: 'dkb-btn-lbracket',key: '[',       code: 'BracketLeft',  keyCode: 219,     label: '[',      symbol: '[' },
      { id: 'dkb-btn-rbracket',key: ']',       code: 'BracketRight', keyCode: 221,     label: ']',      symbol: ']' },
      { id: 'dkb-btn-lparen',key: '(',         code: 'Digit9',       keyCode: 57,      label: '(',      symbol: '(' },
      { id: 'dkb-btn-rparen',key: ')',         code: 'Digit0',       keyCode: 48,      label: ')',      symbol: ')' }
    ];

    for (var i = 0; i < primaryKeys.length; i++) {
      var btn = document.createElement('button');
      btn.id = primaryKeys[i].id;
      btn.className = DKB_PREFIX + 'btn';
      if (primaryKeys[i].symbol) btn.classList.add(DKB_PREFIX + 'btn-symbol');
      btn.textContent = primaryKeys[i].label;
      btn.setAttribute('data-key', primaryKeys[i].key);
      btn.setAttribute('data-code', primaryKeys[i].code);
      btn.setAttribute('data-keycode', primaryKeys[i].keyCode);
      btn.setAttribute('data-symbol', primaryKeys[i].symbol || '');
      btn.setAttribute('data-modifier', primaryKeys[i].modifier || '');
      primaryRow.appendChild(btn);
    }

    // F1-F12 toggle button
    var collapseBtn = document.createElement('button');
    collapseBtn.className = DKB_PREFIX + 'btn ' + DKB_PREFIX + 'btn-collapse';
    collapseBtn.id = DKB_PREFIX + 'btn-expand';
    collapseBtn.textContent = 'F1–F12';
    collapseBtn.setAttribute('data-key', 'F1–F12');
    collapseBtn.setAttribute('aria-label', 'Expand F1-F12 row');
    primaryRow.appendChild(collapseBtn);

    bar.appendChild(primaryRow);

    // F1-F12 row
    var f1Row = document.createElement('div');
    f1Row.id = DKB_PREFIX + 'f1row';
    for (var f = 1; f <= 12; f++) {
      var f1Btn = document.createElement('button');
      f1Btn.className = DKB_PREFIX + 'btn';
      f1Btn.textContent = 'F' + f;
      f1Btn.setAttribute('data-key', 'F' + f);
      f1Btn.setAttribute('data-code', 'F' + f);
      f1Btn.setAttribute('data-keycode', 111 + f - 1);
      f1Row.appendChild(f1Btn);
    }
    bar.appendChild(f1Row);

    document.body.appendChild(bar);
  }

  /* ─── Position Bar ─── */
  function positionBar() {
    var bar = document.getElementById(DKB_PREFIX + 'bar');
    if (!bar) return;
    if (typeof visualViewport !== 'undefined' && visualViewport) {
      // Position above the keyboard with a small gap
      var kbHeight = window.innerHeight - visualViewport.height;
      bar.style.bottom = (kbHeight + 8) + 'px';
    } else {
      bar.style.bottom = '0px';
    }
  }

  /* ─── Show / Hide Bar ─── */
  function showBar() {
    if (barVisible) return;
    barVisible = true;
    var bar = document.getElementById(DKB_PREFIX + 'bar');
    if (!bar) return;
    bar.classList.add('dkb-visible');
    createHiddenInput();
    positionBar();
    updateModifierButtons();
    // Don't steal focus — keep whatever the user was typing in focused
  }

  function hideBar() {
    if (!barVisible) return;
    barVisible = false;
    resetModifiers();
    primaryTarget = null;
    var bar = document.getElementById(DKB_PREFIX + 'bar');
    if (bar) bar.classList.remove('dkb-visible');
  }

  /* ─── Key Tap Handler ─── */
  function handleKeyTap(btn) {
    var key = btn.getAttribute('data-key');
    var code = btn.getAttribute('data-code');
    var keyCode = parseInt(btn.getAttribute('data-keycode'), 10);
    var symbol = btn.getAttribute('data-symbol');
    var modifier = btn.getAttribute('data-modifier');

    // Handle modifier toggle
    if (modifier) {
      setActiveModifier(modifier, !activeModifiers[modifier]);
      if (activeModifiers[modifier]) {
        startAutoResetTimer();
      }
      return;
    }

    // F1-F12 expand toggle
    if (key === 'F1–F12') {
      toggleF1Row();
      return;
    }

    // For non-modifier, non-toggle keys: dispatch to the real target
    var target = primaryTarget || detectTarget();
    if (!target) return;

    if (hasActiveModifiers()) {
      dispatchKey(target, key, code, keyCode, activeModifiers);
      if (symbol) {
        insertChar(target, symbol);
      }
      resetModifiers();
    } else {
      dispatchKey(target, key, code, keyCode, { ctrl: false, alt: false, shift: false, meta: false });
      if (symbol) {
        insertChar(target, symbol);
      }
    }

    // Keep focus on the target (not the button) so keyboard stays open
    try { target.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }

  function toggleF1Row() {
    f1RowExpanded = !f1RowExpanded;
    var f1row = document.getElementById(DKB_PREFIX + 'f1row');
    var expandBtn = document.getElementById(DKB_PREFIX + 'btn-expand');
    if (!f1row || !expandBtn) return;
    if (f1RowExpanded) {
      f1row.classList.add('dkb-expanded');
      expandBtn.textContent = '▼';
    } else {
      f1row.classList.remove('dkb-expanded');
      expandBtn.textContent = 'F1–F12';
    }
  }

  /* ─── Intercept native keyboard when modifiers are active ─── */
  function onNativeKeyDown(e) {
    if (!barVisible || !hasActiveModifiers()) return;
    // Don't intercept modifier keys themselves
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;
    // Don't intercept if event already has our modifiers (prevent infinite loop)
    if (e._dkbSynthetic) return;

    // Cancel the original keypress and re-dispatch with modifiers
    e.preventDefault();
    e.stopImmediatePropagation();

    var target = e.target;
    var syntheticOpts = {
      key: e.key,
      code: e.code,
      keyCode: e.keyCode,
      ctrlKey: activeModifiers.ctrl,
      altKey: activeModifiers.alt,
      shiftKey: activeModifiers.shift,
      metaKey: activeModifiers.meta,
      bubbles: true,
      cancelable: true,
      composed: true
    };

    // Mark as synthetic to prevent re-interception
    var synthetic = new KeyboardEvent('keydown', syntheticOpts);
    synthetic._dkbSynthetic = true;
    target.dispatchEvent(synthetic);

    // Also dispatch keyup
    var syntheticUp = new KeyboardEvent('keyup', syntheticOpts);
    syntheticUp._dkbSynthetic = true;
    target.dispatchEvent(syntheticUp);

    resetModifiers();
  }

  /* ─── Event Listeners ─── */
  function setupListeners() {
    // Intercept native keyboard for modifier+key combos (e.g. Ctrl+C from native keyboard)
    document.addEventListener('keydown', onNativeKeyDown, true);

    // Button interaction via touch — prevent keyboard dismiss
    var bar = document.getElementById(DKB_PREFIX + 'bar');
    if (bar) {
      // Use touchend with preventDefault to handle taps without dismissing keyboard
      bar.addEventListener('touchend', function (e) {
        var btn = e.target.closest('.' + DKB_PREFIX + 'btn');
        if (!btn) return;
        e.preventDefault();   // Prevent focus shift (keeps keyboard open)
        e.stopPropagation();
        handleKeyTap(btn);
      }, { passive: false });

      // Also handle click for non-touch scenarios (desktop testing)
      bar.addEventListener('click', function (e) {
        var btn = e.target.closest('.' + DKB_PREFIX + 'btn');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        handleKeyTap(btn);
      }, true);
    }

    // Focus / blur detection
    document.addEventListener('focusin', function (e) {
      if (!isMobile()) return;
      // Don't react to hidden input gaining focus
      if (e.target && e.target.id === 'hidden-input-dkb') return;
      var target = detectTarget();
      if (target) {
        primaryTarget = target;
        if (typeof visualViewport !== 'undefined' && visualViewport) {
          if (window.innerHeight - visualViewport.height > 50) {
            showBar();
          }
        } else if (barVisible === false) {
          setTimeout(function () {
            if (primaryTarget) showBar();
          }, 150);
        }
      }
    });

    document.addEventListener('focusout', function (e) {
      if (!isMobile()) return;
      // Don't react to hidden input losing focus
      if (e.target && e.target.id === 'hidden-input-dkb') return;
      // Don't clear primaryTarget if focus moved to a bar button (user tapping bar)
      var related = e.relatedTarget || document.activeElement;
      if (related && related.closest && related.closest('#' + DKB_PREFIX + 'bar')) return;
      // Check if focus moved to another input-like element
      var newTarget = detectTarget();
      if (!newTarget) {
        primaryTarget = null;
        if (typeof visualViewport !== 'undefined' && visualViewport) {
          if (window.innerHeight - visualViewport.height < 50) {
            hideBar();
          }
        } else {
          setTimeout(function () {
            if (!detectTarget()) hideBar();
          }, 300);
        }
      } else {
        primaryTarget = newTarget;
      }
    });

    // VisualViewport resize (keyboard open / close)
    if (typeof visualViewport !== 'undefined') {
      visualViewport.addEventListener('resize', function () {
        positionBar();
        var keyboardOpened = (window.innerHeight - visualViewport.height) > 50;
        if (keyboardOpened && primaryTarget) {
          showBar();
        } else if (!keyboardOpened) {
          hideBar();
        }
      }, { passive: true });

      visualViewport.addEventListener('scroll', function () {
        positionBar();
      }, { passive: true });
    }

    // Window resize
    window.addEventListener('resize', function () {
      positionBar();
    });
  }

  /* ─── Initialization ─── */
  function init() {
    if (!isMobile()) return;
    injectCSS();
    createBar();
    setupListeners();

    // If keyboard is already open when script loads
    if (typeof visualViewport !== 'undefined' && visualViewport) {
      if (window.innerHeight - visualViewport.height > 50) {
        var tgt = detectTarget();
        if (tgt) {
          primaryTarget = tgt;
          showBar();
        }
      }
    }
  }

  // Run at document idle
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(init, 500);
    });
  } else {
    setTimeout(init, 100);
  }
})();

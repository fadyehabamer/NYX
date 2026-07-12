/*!
 * Nyx core — modular runtime (prototype) · v1.0.3-modular · MIT
 *
 * Load this FIRST, then any nyx.<component>.js plugins you want. Plugins call
 * Nyx.use() to register themselves; core wires them all up on DOMContentLoaded.
 *
 *   <script src="nyx.core.js"></script>
 *   <script src="nyx.overlay.js"></script>   <!-- only the components you use -->
 *   <script src="nyx.tabs.js"></script>
 *
 * Core provides the shared surface every plugin builds on: DOM helpers, theme /
 * direction, a single delegated-event bus, and the plugin registry. It carries no
 * component logic of its own, so it stays tiny.
 */
(function (root, factory) {
  var Nyx = factory();
  if (typeof module === 'object' && module.exports) { module.exports = Nyx; }
  else {
    root.Nyx = Nyx;
    // drain any plugins that loaded before core (script order independence)
    if (root.__nyxPlugins) { root.__nyxPlugins.forEach(function (p) { Nyx.use(p); }); root.__nyxPlugins = null; }
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var doc = document, docEl = doc.documentElement;

  /* ---------- DOM + storage helpers (exposed to plugins) ---------- */
  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function el(node) { return typeof node === 'string' ? $(node) : node; }
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function prefersReducedMotion() { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }

  /* ---------- theme + direction (core built-ins) ---------- */
  function setTheme(t) { docEl.setAttribute('data-theme', t); store('nyx-theme', t); }
  function toggleTheme() { setTheme(docEl.getAttribute('data-theme') === 'light' ? 'dark' : 'light'); }
  function setDir(d) { docEl.setAttribute('dir', d); store('nyx-dir', d); }
  function toggleDir() { setDir(docEl.getAttribute('dir') === 'rtl' ? 'ltr' : 'rtl'); }
  function setAccent(a) {
    if (a && a !== 'violet') docEl.setAttribute('data-accent', a);
    else docEl.removeAttribute('data-accent');
    store('nyx-accent', a || 'violet');
  }
  (function applySaved() {
    var t = read('nyx-theme'); if (t) docEl.setAttribute('data-theme', t);
    var d = read('nyx-dir'); if (d) docEl.setAttribute('dir', d);
    var a = read('nyx-accent'); if (a && a !== 'violet') docEl.setAttribute('data-accent', a);
  })();

  /* ---------- delegated-event bus ----------
   * One document listener per event type, shared by every plugin, so N components
   * never mean N listeners. A handler returns `false` to signal "handled — stop".
   */
  var _bus = {};
  function on(type, handler) {
    if (!_bus[type]) {
      _bus[type] = [];
      var passive = type === 'scroll' || type === 'touchstart';
      doc.addEventListener(type, function (e) {
        var hs = _bus[type];
        for (var i = 0; i < hs.length; i++) { if (hs[i](e) === false) break; }
      }, passive ? { passive: true } : false);
    }
    _bus[type].push(handler);
    return Nyx;
  }

  /* ---------- plugin registry ----------
   * A plugin is `{ name, init(Nyx)?, scan(ctx)? }`. init() runs once (wire delegated
   * listeners, expose API); scan() runs on every Nyx.scan() (process existing/added
   * DOM — used by widgets like countdown). Registering after init() inits immediately.
   */
  var _plugins = [], _inited = false;
  function use(plugin) {
    if (plugin) {
      _plugins.push(plugin);
      if (_inited && plugin.init) { try { plugin.init(Nyx); } catch (e) {} }
      if (_inited && plugin.scan) { try { plugin.scan(doc); } catch (e) {} }
    }
    return Nyx;
  }
  function init() {
    var i, p;
    for (i = 0; i < _plugins.length; i++) { p = _plugins[i]; if (!_inited && p.init) { try { p.init(Nyx); } catch (e) {} } }
    _inited = true;
    scan(doc);
    return Nyx;
  }
  function scan(ctx) {
    for (var i = 0; i < _plugins.length; i++) { if (_plugins[i].scan) { try { _plugins[i].scan(ctx || doc); } catch (e) {} } }
    return Nyx;
  }

  var Nyx = {
    version: '1.0.3-modular',
    doc: doc, docEl: docEl,
    $: $, $$: $$, el: el, store: store, read: read, prefersReducedMotion: prefersReducedMotion,
    setTheme: setTheme, toggleTheme: toggleTheme, setDir: setDir, toggleDir: toggleDir, setAccent: setAccent,
    on: on, use: use, init: init, scan: scan
  };

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else setTimeout(init, 0);   // already parsed — let sibling plugin <script>s register first

  return Nyx;
});

/*!
 * Nyx plugin: overlay — modal · drawer · sheet · backdrop · focus-trap
 * Requires nyx.core.js. Declarative: data-nyx-toggle="modal|drawer|sheet" (+ data-nyx-target),
 * data-nyx-dismiss. Imperative: Nyx.openModal / openDrawer / close / closeAll.
 */
(function (root, factory) {
  var plugin = factory();
  if (typeof module === 'object' && module.exports) module.exports = plugin;
  else if (root.Nyx) root.Nyx.use(plugin);
  else (root.__nyxPlugins = root.__nyxPlugins || []).push(plugin);   // core not loaded yet
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  return {
    name: 'overlay',
    init: function (Nyx) {
      var doc = Nyx.doc, $ = Nyx.$, $$ = Nyx.$$, el = Nyx.el;
      var _backdrop = null, _lastFocus = null, _uid = 0;
      var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

      function backdrop() {
        if (!_backdrop) {
          _backdrop = doc.createElement('div');
          _backdrop.className = 'nyx-overlay';
          _backdrop.setAttribute('data-nyx-backdrop', '');
          _backdrop.addEventListener('click', closeAll);
          doc.body.appendChild(_backdrop);
        }
        return _backdrop;
      }
      function lockScroll(on) { doc.body.style.overflow = on ? 'hidden' : ''; }
      function focusables(c) { return $$(FOCUSABLE, c).filter(function (e) { return e.offsetWidth > 0 || e.offsetHeight > 0 || e === doc.activeElement; }); }
      function currentOverlay() { return $('.nyx-modal.open') || $('.nyx-sheet.open') || $('.nyx-drawer.open'); }
      function releaseFocus() { var l = _lastFocus; _lastFocus = null; if (l && l.focus) setTimeout(function () { try { l.focus(); } catch (e) {} }, 0); }

      function dialogSemantics(m) {
        var dlg = m.classList.contains('nyx-modal') ? (m.querySelector('.nyx-modal-box') || m) : m;
        dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true');
        if (!dlg.getAttribute('aria-label') && !dlg.getAttribute('aria-labelledby')) {
          var h = dlg.querySelector('.nyx-modal-title, .nyx-drawer-title, .nyx-sheet-title, h1, h2, h3');
          if (h) { if (!h.id) h.id = 'nyx-dlg-' + (++_uid); dlg.setAttribute('aria-labelledby', h.id); }
        }
      }
      function typeOf(m) { return m.classList.contains('nyx-drawer') ? 'drawer' : (m.classList.contains('nyx-sheet') ? 'sheet' : 'modal'); }

      function openModal(target) {
        var m = el(target); if (!m) return;
        if (!_lastFocus) _lastFocus = doc.activeElement;
        backdrop().classList.add('open');
        m.classList.add('open');
        dialogSemantics(m); lockScroll(true);
        var f = focusables(m); if (f.length) setTimeout(function () { f[0].focus(); }, 60);
        m.dispatchEvent(new CustomEvent('nyx:' + typeOf(m) + '-show', { bubbles: true }));
      }
      function close(target) {
        var t = el(target); if (!t) return;
        t.classList.remove('open');
        t.dispatchEvent(new CustomEvent('nyx:' + typeOf(t) + '-hide', { bubbles: true }));
        if (!currentOverlay()) { if (_backdrop) _backdrop.classList.remove('open'); lockScroll(false); releaseFocus(); }
      }
      function closeAll() {
        $$('.nyx-modal.open, .nyx-drawer.open, .nyx-sheet.open').forEach(function (n) {
          n.classList.remove('open');
          n.dispatchEvent(new CustomEvent('nyx:' + typeOf(n) + '-hide', { bubbles: true }));
        });
        if (_backdrop) _backdrop.classList.remove('open');
        lockScroll(false); releaseFocus();
      }

      // one delegated click handler on the shared bus
      Nyx.on('click', function (e) {
        var toggle = e.target.closest('[data-nyx-toggle]');
        if (toggle) {
          var kind = toggle.getAttribute('data-nyx-toggle');
          if (kind === 'modal' || kind === 'drawer' || kind === 'sheet') {
            e.preventDefault(); openModal(toggle.getAttribute('data-nyx-target')); return false;
          }
        }
        if (e.target.closest('[data-nyx-dismiss]')) { e.preventDefault(); closeAll(); return false; }
      });
      Nyx.on('keydown', function (e) { if (e.key === 'Escape' && currentOverlay()) { closeAll(); return false; } });

      // imperative API
      Nyx.openModal = openModal; Nyx.openDrawer = openModal; Nyx.close = close; Nyx.closeAll = closeAll;
    }
  };
});

/*!
 * Nyx plugin: tabs / pills — Requires nyx.core.js.
 * Declarative: [data-nyx-tabs] wrapper, [data-nyx-tab="key"] triggers, [data-nyx-panel="key"] panels.
 */
(function (root, factory) {
  var plugin = factory();
  if (typeof module === 'object' && module.exports) module.exports = plugin;
  else if (root.Nyx) root.Nyx.use(plugin);
  else (root.__nyxPlugins = root.__nyxPlugins || []).push(plugin);
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  return {
    name: 'tabs',
    init: function (Nyx) {
      var doc = Nyx.doc, $$ = Nyx.$$;

      function activate(btn) {
        var group = btn.closest('[data-nyx-tabs]'); if (!group) return;
        var key = btn.getAttribute('data-nyx-tab');
        var scope = group.parentElement || doc;
        var active = null;
        $$('[data-nyx-tab]', group).forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('active', on);
          b.setAttribute('aria-selected', on ? 'true' : 'false');
          b.setAttribute('tabindex', on ? '0' : '-1');
        });
        $$('[data-nyx-panel]', scope).forEach(function (p) {
          var show = p.getAttribute('data-nyx-panel') === key;
          p.classList.toggle('active', show);
          if (show) active = p;
        });
        if (active) active.dispatchEvent(new CustomEvent('nyx:tab-show', { bubbles: true, detail: { tab: btn, panel: active } }));
      }

      Nyx.on('click', function (e) {
        var tab = e.target.closest('[data-nyx-tab]');
        if (tab) { e.preventDefault(); activate(tab); return false; }
      });
      // roving arrow-key navigation within a tablist
      Nyx.on('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        var tab = e.target.closest && e.target.closest('[data-nyx-tab]'); if (!tab) return;
        var group = tab.closest('[data-nyx-tabs]'); if (!group) return;
        var tabs = $$('[data-nyx-tab]', group), i = tabs.indexOf(tab);
        var next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        if (next) { next.focus(); activate(next); return false; }
      });

      Nyx.activateTab = activate;
    }
  };
});

/*!
 * Nyx plugin: toast — Requires nyx.core.js. Pure imperative API, no DOM scan.
 * Nyx.toast('Saved', 'success')  ·  Nyx.toast('Msg', { title, action, dismissible, persistent, position, duration })
 */
(function (root, factory) {
  var plugin = factory();
  if (typeof module === 'object' && module.exports) module.exports = plugin;
  else if (root.Nyx) root.Nyx.use(plugin);
  else (root.__nyxPlugins = root.__nyxPlugins || []).push(plugin);
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var ICONS = { info: 'ℹ️', success: '✅', warning: '⚠️', danger: '⛔' };
  return {
    name: 'toast',
    init: function (Nyx) {
      var doc = Nyx.doc, $ = Nyx.$;

      function wrap(pos) {
        pos = pos || 'bottom-right';
        var w = $('.nyx-toast-wrap[data-pos="' + pos + '"]');
        if (!w) { w = doc.createElement('div'); w.className = 'nyx-toast-wrap'; w.setAttribute('data-pos', pos); w.setAttribute('aria-live', 'polite'); doc.body.appendChild(w); }
        return w;
      }
      function toast(message, typeOrOpts, ms) {
        var o = (typeOrOpts && typeof typeOrOpts === 'object') ? typeOrOpts : { type: typeOrOpts, duration: ms };
        var type = o.type || 'info';
        var dur = o.persistent ? 0 : (o.duration != null ? o.duration : 3200);
        var t = doc.createElement('div');
        t.className = 'nyx-toast nyx-toast-' + type;
        var urgent = type === 'danger' || type === 'warning';
        t.setAttribute('role', urgent ? 'alert' : 'status');
        t.setAttribute('aria-live', urgent ? 'assertive' : 'polite');
        var icon = doc.createElement('span'); icon.className = 'nyx-toast-icon'; icon.setAttribute('aria-hidden', 'true'); icon.textContent = o.icon || ICONS[type] || '•';
        t.appendChild(icon);
        var body = doc.createElement('div'); body.className = 'nyx-toast-body';
        if (o.title) { var ti = doc.createElement('strong'); ti.className = 'nyx-toast-title'; ti.textContent = o.title; body.appendChild(ti); }
        var txt = doc.createElement('span'); txt.textContent = message; body.appendChild(txt);
        t.appendChild(body);
        var timer;
        function dismiss() { clearTimeout(timer); t.classList.add('nyx-out'); t.addEventListener('animationend', function () { t.remove(); }); }
        if (o.action) {
          var b = doc.createElement('button'); b.type = 'button'; b.className = 'nyx-toast-action';
          b.textContent = o.action.label || o.action;
          b.addEventListener('click', function () { if (o.action.onClick) o.action.onClick(); dismiss(); });
          t.appendChild(b);
        }
        if (o.dismissible) {
          var x = doc.createElement('button'); x.type = 'button'; x.className = 'nyx-toast-close'; x.setAttribute('aria-label', 'Dismiss'); x.textContent = '✕';
          x.addEventListener('click', dismiss); t.appendChild(x);
        }
        wrap(o.position).appendChild(t);
        if (dur) timer = setTimeout(dismiss, dur);
        t.dismiss = dismiss;
        return t;
      }

      Nyx.toast = toast;
    }
  };
});

/*!
 * Nyx plugin: countdown — Requires nyx.core.js. Scan-based widget (no delegation).
 * Declarative: <div class="nyx-countdown" data-nyx-countdown="HH:MM"> … .unit b … </div>
 * or data-date="ISO". Fires nyx:countdown-done at zero.
 */
(function (root, factory) {
  var plugin = factory();
  if (typeof module === 'object' && module.exports) module.exports = plugin;
  else if (root.Nyx) root.Nyx.use(plugin);
  else (root.__nyxPlugins = root.__nyxPlugins || []).push(plugin);
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  var AR = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  function toArab(s) { return String(s).replace(/\d/g, function (d) { return AR[+d]; }); }
  function wantsArab(c) { return !!(c.closest && c.closest('[data-nyx-numerals="arab"]')) || c.getAttribute('data-nyx-numerals') === 'arab'; }

  return {
    name: 'countdown',
    // scan() runs on every Nyx.scan(); the _nyxCd flag makes it idempotent so
    // re-scanning after DOM insertions only wires up new countdowns.
    scan: function (ctx) {
      var $$ = (this._Nyx && this._Nyx.$$) || function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
      $$('.nyx-countdown[data-nyx-countdown], .nyx-countdown[data-date]', ctx)
        .filter(function (c) { return !c._nyxCd; })
        .forEach(function (c) {
          c._nyxCd = true; c._nyxArab = wantsArab(c);
          var dateAttr = c.getAttribute('data-date'), target;
          if (dateAttr) { target = new Date(dateAttr); }
          else {
            var p = c.getAttribute('data-nyx-countdown').split(':'), now = new Date();
            target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), +p[0], +p[1] || 0, 0);
            if (target < now) target = new Date(target.getTime() + 86400000);
          }
          c._nyxTarget = target;
          function tick() {
            var diff = Math.max(0, Math.floor((c._nyxTarget - new Date()) / 1000));
            var u = Array.prototype.slice.call(c.querySelectorAll('.unit b'));
            var m = Math.floor((diff % 3600) / 60), s = diff % 60;
            function set(node, n) { if (node) node.textContent = c._nyxArab ? toArab(pad(n)) : pad(n); }
            if (u.length >= 4) { set(u[0], Math.floor(diff / 86400)); set(u[1], Math.floor((diff % 86400) / 3600)); set(u[2], m); set(u[3], s); }
            else { set(u[0], Math.floor(diff / 3600)); set(u[1], m); set(u[2], s); }
          }
          tick();
          var iv = setInterval(function () {
            tick();
            if (!c._nyxDone && c._nyxTarget - new Date() <= 0) {
              c._nyxDone = true; clearInterval(iv);
              c.classList.add('nyx-countdown-done');
              c.dispatchEvent(new CustomEvent('nyx:countdown-done', { bubbles: true }));
            }
          }, 1000);
        });
    },
    init: function (Nyx) { this._Nyx = Nyx; }   // capture core so scan() can use its helpers
  };
});

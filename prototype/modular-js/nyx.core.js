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

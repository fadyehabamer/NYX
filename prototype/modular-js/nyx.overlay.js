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

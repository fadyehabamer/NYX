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

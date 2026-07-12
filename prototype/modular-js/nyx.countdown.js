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

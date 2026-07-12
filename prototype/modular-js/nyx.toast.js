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

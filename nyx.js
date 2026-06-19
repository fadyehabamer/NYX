/*!
 * Nyx — runtime · v1.3.0 · MIT License
 * Zero dependencies. UMD: window.Nyx (or CommonJS export).
 *
 * Declarative API (no JS to write):
 *   data-nyx-toggle="modal|drawer|popover|command|dropdown|collapse"  (+ data-nyx-target)
 *   data-nyx-dismiss                                  closes its overlay
 *   data-nyx-tabs / data-nyx-tab / data-nyx-panel     tabs & pills
 *   data-nyx-accordion                                accordion (single-open) wrapper
 *   data-nyx-spy                                      scrollspy nav
 *   data-nyx-carousel  +  data-nyx-slide="prev|next" / data-nyx-slide-to="i"
 *   class="nyx-table-sortable"                        click headers to sort
 *
 * Imperative API:
 *   Nyx.toast · openModal · openDrawer · close · closeAll · togglePopover
 *   Nyx.openCommandPalette · setTheme · toggleTheme · setDir · toggleDir · init
 * ========================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Nyx = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var doc = document, docEl = doc.documentElement;
  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function el(node) { return typeof node === 'string' ? $(node) : node; }
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  /* ---------- theme + direction ---------- */
  function setTheme(t) { docEl.setAttribute('data-theme', t); store('nyx-theme', t); }
  function toggleTheme() { setTheme(docEl.getAttribute('data-theme') === 'light' ? 'dark' : 'light'); }
  function setDir(d) { docEl.setAttribute('dir', d); store('nyx-dir', d); }
  function toggleDir() { setDir(docEl.getAttribute('dir') === 'rtl' ? 'ltr' : 'rtl'); }
  (function applySaved() {
    var t = read('nyx-theme'); if (t) docEl.setAttribute('data-theme', t);
    var d = read('nyx-dir'); if (d) docEl.setAttribute('dir', d);
  })();

  /* ---------- shared backdrop (auto-created) ---------- */
  var _backdrop = null;
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

  /* ---------- overlays: modal + drawer ---------- */
  function openModal(target) {
    var m = el(target); if (!m) return;
    backdrop().classList.add('open');
    m.classList.add('open');
    lockScroll(true);
    var f = m.querySelector('input,button,[tabindex]'); if (f) setTimeout(function () { f.focus(); }, 60);
  }
  var openDrawer = openModal;

  function close(target) {
    var t = el(target); if (t) t.classList.remove('open');
    if (!$('.nyx-modal.open') && !$('.nyx-drawer.open')) {
      if (_backdrop) _backdrop.classList.remove('open');
      lockScroll(false);
    }
  }
  function closeAll() {
    $$('.nyx-modal.open, .nyx-drawer.open').forEach(function (n) { n.classList.remove('open'); });
    if (_backdrop) _backdrop.classList.remove('open');
    closeCommandPalette();
    lockScroll(false);
  }

  /* ---------- popover ---------- */
  function togglePopover(node) {
    var p = el(node); if (!p) return;
    if (!p.classList.contains('nyx-popover')) p = p.closest('.nyx-popover');
    var willOpen = p && !p.classList.contains('open');
    $$('.nyx-popover.open').forEach(function (o) { o.classList.remove('open'); });
    if (p) p.classList.toggle('open', willOpen);
  }

  /* ---------- dropdown ---------- */
  function closeDropdowns(except) {
    $$('.nyx-dropdown.open').forEach(function (d) { if (d !== except) d.classList.remove('open'); });
  }

  /* ---------- command palette ---------- */
  function paletteEl() { return $('.nyx-command-palette'); }
  function openCommandPalette() {
    var cp = paletteEl(); if (!cp) return;
    cp.classList.add('open'); lockScroll(true);
    var inp = cp.querySelector('input'); if (inp) setTimeout(function () { inp.focus(); }, 60);
  }
  function closeCommandPalette() {
    var cp = paletteEl(); if (cp) cp.classList.remove('open');
    if (!$('.nyx-modal.open') && !$('.nyx-drawer.open')) lockScroll(false);
  }

  /* ---------- toast ---------- */
  var ICONS = { info: 'ℹ️', success: '✅', warning: '⚠️', danger: '⛔' };
  function toastWrap() {
    var w = $('.nyx-toast-wrap');
    if (!w) { w = doc.createElement('div'); w.className = 'nyx-toast-wrap'; w.setAttribute('aria-live', 'polite'); doc.body.appendChild(w); }
    return w;
  }
  function toast(message, type, ms) {
    type = type || 'info'; ms = ms || 3200;
    var t = doc.createElement('div');
    t.className = 'nyx-toast nyx-toast-' + type;
    t.setAttribute('role', 'status');
    var icon = doc.createElement('span'); icon.textContent = ICONS[type] || '•';
    var txt = doc.createElement('span'); txt.textContent = message;
    t.appendChild(icon); t.appendChild(txt);
    toastWrap().appendChild(t);
    setTimeout(function () {
      t.classList.add('nyx-out');
      t.addEventListener('animationend', function () { t.remove(); });
    }, ms);
    return t;
  }

  /* ---------- tabs / pills ---------- */
  function activateTab(btn) {
    var group = btn.closest('[data-nyx-tabs]'); if (!group) return;
    var key = btn.getAttribute('data-nyx-tab');
    var scope = group.parentElement || doc;
    $$('[data-nyx-tab]', group).forEach(function (b) { b.classList.toggle('active', b === btn); });
    $$('[data-nyx-panel]', scope).forEach(function (p) {
      p.classList.toggle('active', p.getAttribute('data-nyx-panel') === key);
    });
  }

  /* ---------- collapse / accordion ---------- */
  function toggleCollapse(trigger) {
    var t = el(trigger.getAttribute('data-nyx-target')); if (!t) return;
    var willOpen = !t.classList.contains('open');
    var acc = trigger.closest('[data-nyx-accordion]');
    if (acc && willOpen) {
      $$('.nyx-collapse.open', acc).forEach(function (c) { c.classList.remove('open'); });
      $$('[data-nyx-toggle="collapse"].active', acc).forEach(function (h) { h.classList.remove('active'); });
    }
    t.classList.toggle('open', willOpen);
    trigger.classList.toggle('active', willOpen);
  }

  /* ---------- carousel ---------- */
  function carouselStep(car, dir) {
    var slides = $$('.nyx-slide', car); if (!slides.length) return;
    var cur = slides.findIndex(function (s) { return s.classList.contains('active'); });
    if (cur < 0) cur = 0;
    var next = dir === 'prev' ? (cur - 1 + slides.length) % slides.length : (cur + 1) % slides.length;
    carouselSet(car, next, slides);
  }
  function carouselSet(car, i, slides) {
    slides = slides || $$('.nyx-slide', car);
    slides.forEach(function (s, n) { s.classList.toggle('active', n === i); });
    $$('.nyx-carousel-dots button', car).forEach(function (d, n) { d.classList.toggle('active', n === i); });
  }

  /* ---------- stepper ---------- */
  function stepperAdjust(btn) {
    var wrap = btn.closest('.nyx-stepper'), inp = wrap && wrap.querySelector('input'); if (!inp) return;
    var v = parseInt(inp.value, 10); if (isNaN(v)) v = 0;
    var min = inp.hasAttribute('min') ? parseFloat(inp.getAttribute('min')) : -Infinity;
    var max = inp.hasAttribute('max') ? parseFloat(inp.getAttribute('max')) : Infinity;
    v += btn.getAttribute('data-nyx-step') === 'dec' ? -1 : 1;
    inp.value = Math.max(min, Math.min(max, v));
  }

  /* ---------- scrollspy ---------- */
  function initSpy(nav) {
    if (nav._nyxSpy) return; nav._nyxSpy = true;
    var links = $$('a[href^="#"]', nav), map = {}, targets = [];
    links.forEach(function (a) {
      var id = a.getAttribute('href').slice(1), sec = id && doc.getElementById(id);
      if (sec) { map[id] = a; targets.push(sec); }
    });
    if (!('IntersectionObserver' in window) || !targets.length) return;
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          links.forEach(function (l) { l.classList.remove('active'); });
          if (map[en.target.id]) map[en.target.id].classList.add('active');
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
    targets.forEach(function (s) { obs.observe(s); });
  }

  /* ---------- sortable tables ---------- */
  function initSortable(table) {
    if (table._nyxSort) return; table._nyxSort = true;
    var tbody = table.tBodies[0]; if (!tbody) return;
    $$('thead th', table).forEach(function (th, col) {
      var asc = true;
      th.addEventListener('click', function () {
        var rows = Array.prototype.slice.call(tbody.rows);
        rows.sort(function (a, b) {
          var x = (a.cells[col] ? a.cells[col].innerText : '').replace(/[$,%]/g, '').trim();
          var y = (b.cells[col] ? b.cells[col].innerText : '').replace(/[$,%]/g, '').trim();
          var nx = parseFloat(x), ny = parseFloat(y);
          var cmp = (!isNaN(nx) && !isNaN(ny)) ? nx - ny : x.localeCompare(y);
          return asc ? cmp : -cmp;
        });
        rows.forEach(function (r) { tbody.appendChild(r); });
        asc = !asc;
      });
    });
  }

  /* ---------- delegated clicks ---------- */
  doc.addEventListener('click', function (e) {
    var toggle = e.target.closest('[data-nyx-toggle]');
    if (toggle) {
      var kind = toggle.getAttribute('data-nyx-toggle');
      var target = toggle.getAttribute('data-nyx-target');
      if (kind === 'modal') { e.preventDefault(); openModal(target); return; }
      if (kind === 'drawer') { e.preventDefault(); openDrawer(target); return; }
      if (kind === 'popover') { e.preventDefault(); togglePopover(toggle); return; }
      if (kind === 'command') { e.preventDefault(); openCommandPalette(); return; }
      if (kind === 'collapse') { e.preventDefault(); toggleCollapse(toggle); return; }
      if (kind === 'dropdown') {
        e.preventDefault();
        var dd = toggle.closest('.nyx-dropdown'), willOpen = dd && !dd.classList.contains('open');
        closeDropdowns(); if (dd) dd.classList.toggle('open', willOpen); return;
      }
    }
    if (e.target.closest('[data-nyx-dismiss]')) { e.preventDefault(); closeAll(); return; }

    var step = e.target.closest('[data-nyx-step]');
    if (step) { stepperAdjust(step); return; }
    var tagX = e.target.closest('.nyx-tag-input .nyx-chip-x');
    if (tagX) { var ch = tagX.closest('.nyx-chip'); if (ch) ch.remove(); return; }

    var tab = e.target.closest('[data-nyx-tab]');
    if (tab) { e.preventDefault(); activateTab(tab); return; }

    var slide = e.target.closest('[data-nyx-slide]');
    if (slide) { var car = slide.closest('.nyx-carousel'); if (car) carouselStep(car, slide.getAttribute('data-nyx-slide')); return; }
    var dot = e.target.closest('[data-nyx-slide-to]');
    if (dot) { var c2 = dot.closest('.nyx-carousel'); if (c2) carouselSet(c2, +dot.getAttribute('data-nyx-slide-to')); return; }

    var cpItem = e.target.closest('.nyx-command-palette [data-nyx-target]');
    if (cpItem) { closeAll(); var sec = el(cpItem.getAttribute('data-nyx-target')); if (sec) sec.scrollIntoView(); return; }

    if (e.target.closest('.nyx-dropdown-item')) { closeDropdowns(); return; }
    if (!e.target.closest('.nyx-popover')) $$('.nyx-popover.open').forEach(function (o) { o.classList.remove('open'); });
    if (!e.target.closest('.nyx-dropdown')) closeDropdowns();
  });

  /* ---------- keyboard: ⌘K palette, Esc closes ---------- */
  doc.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      if (paletteEl()) { e.preventDefault(); openCommandPalette(); }
    }
    if (e.key === 'Escape') { closeAll(); closeDropdowns(); $$('.nyx-popover.open').forEach(function (o) { o.classList.remove('open'); }); }
  });

  /* ---------- OTP auto-advance + tag-input add ---------- */
  doc.addEventListener('input', function (e) {
    var otp = e.target.closest('.nyx-otp');
    if (otp && e.target.tagName === 'INPUT') {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 1);
      if (e.target.value) { var ins = $$('input', otp), i = ins.indexOf(e.target); if (ins[i + 1]) ins[i + 1].focus(); }
    }
  });
  doc.addEventListener('keydown', function (e) {
    var otp = e.target.closest('.nyx-otp');
    if (otp && e.key === 'Backspace' && !e.target.value) { var ins = $$('input', otp), i = ins.indexOf(e.target); if (ins[i - 1]) ins[i - 1].focus(); }
    var ti = e.target.closest('.nyx-tag-input');
    if (ti && e.target.tagName === 'INPUT' && e.key === 'Enter') {
      e.preventDefault(); var val = e.target.value.trim(); if (!val) return;
      var chip = doc.createElement('span'); chip.className = 'nyx-chip';
      chip.appendChild(doc.createTextNode(val + ' '));
      var x = doc.createElement('span'); x.className = 'nyx-chip-x'; x.setAttribute('role', 'button'); x.setAttribute('aria-label', 'remove'); x.textContent = '×';
      chip.appendChild(x); ti.insertBefore(chip, e.target); e.target.value = '';
    }
  });

  /* ---------- scroll reveal ---------- */
  function initReveal(root) {
    var els = $$('[data-nyx-reveal]', root).filter(function (e) { return !e._nyxReveal; });
    els.forEach(function (e) { e._nyxReveal = true; e.classList.add('nyx-reveal'); });
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('nyx-in'); }); return; }
    var ro = new IntersectionObserver(function (ents) {
      ents.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('nyx-in'); ro.unobserve(x.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    els.forEach(function (e) { ro.observe(e); });
  }

  /* ---------- init (idempotent) ---------- */
  function init(root) {
    root = root || doc;
    $$('[data-nyx-spy]', root).forEach(initSpy);
    $$('.nyx-table-sortable', root).forEach(initSortable);
    initReveal(root);
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { init(); });
  else init();

  return {
    version: '1.3.0',
    init: init, toast: toast,
    openModal: openModal, openDrawer: openDrawer, close: close, closeAll: closeAll,
    togglePopover: togglePopover, openCommandPalette: openCommandPalette, closeCommandPalette: closeCommandPalette,
    setTheme: setTheme, toggleTheme: toggleTheme, setDir: setDir, toggleDir: toggleDir
  };
});

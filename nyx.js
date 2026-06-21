/*!
 * Nyx — runtime · v1.0.0 · MIT License
 * Zero dependencies. UMD: window.Nyx (or CommonJS export).
 *
 * Declarative API (no JS to write):
 *   data-nyx-toggle="modal|drawer|sheet|popover|command|dropdown|collapse"  (+ data-nyx-target)
 *   data-nyx-dismiss                                  closes its overlay
 *   data-nyx-tabs / data-nyx-tab / data-nyx-panel     tabs & pills
 *   data-nyx-accordion                                accordion (single-open) wrapper
 *   data-nyx-spy · data-nyx-reveal · data-nyx-numerals="arab"
 *   data-nyx-carousel  +  data-nyx-slide="prev|next" / data-nyx-slide-to="i"
 *   data-nyx-datepicker · data-nyx-contextmenu="#id" · data-nyx-countdown="HH:MM"
 *   data-nyx-prayers · data-nyx-qibla="deg" · class="nyx-combobox|nyx-multiselect|nyx-hierarchy"
 *   class="nyx-table-sortable"                        click headers to sort
 *
 * Imperative API:
 *   Nyx.toast · openModal · openDrawer · close · closeAll · togglePopover
 *   Nyx.openCommandPalette · setTheme · toggleTheme · setDir · toggleDir · setAccent
 *   Nyx.toArabicNumerals · Nyx.progress.{start,set,done} · init
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

  /* ---------- focus management (trap + restore) ---------- */
  var _lastFocus = null;
  var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  function focusables(c) { return $$(FOCUSABLE, c).filter(function (e) { return e.offsetWidth > 0 || e.offsetHeight > 0 || e === doc.activeElement; }); }
  function currentOverlay() { return $('.nyx-modal.open') || $('.nyx-sheet.open') || $('.nyx-drawer.open') || $('.nyx-command-palette.open'); }
  function releaseFocus() { var l = _lastFocus; _lastFocus = null; if (l && l.focus) setTimeout(function () { try { l.focus(); } catch (e) {} }, 0); }

  /* ---------- overlays: modal + drawer + sheet ---------- */
  function openModal(target) {
    var m = el(target); if (!m) return;
    if (!_lastFocus) _lastFocus = doc.activeElement;
    backdrop().classList.add('open');
    m.classList.add('open');
    lockScroll(true);
    var f = focusables(m); if (f.length) setTimeout(function () { f[0].focus(); }, 60);
    var type = m.classList.contains('nyx-drawer') ? 'drawer' : (m.classList.contains('nyx-sheet') ? 'sheet' : 'modal');
    m.dispatchEvent(new CustomEvent('nyx:' + type + '-show', { bubbles: true }));
  }
  var openDrawer = openModal;

  function close(target) {
    var t = el(target); if (!t) return;
    t.classList.remove('open');
    var type = t.classList.contains('nyx-drawer') ? 'drawer' : (t.classList.contains('nyx-sheet') ? 'sheet' : 'modal');
    t.dispatchEvent(new CustomEvent('nyx:' + type + '-hide', { bubbles: true }));
    if (!currentOverlay()) { if (_backdrop) _backdrop.classList.remove('open'); lockScroll(false); releaseFocus(); }
  }
  function closeAll() {
    $$('.nyx-modal.open, .nyx-drawer.open, .nyx-sheet.open').forEach(function (n) {
      n.classList.remove('open');
      var type = n.classList.contains('nyx-drawer') ? 'drawer' : (n.classList.contains('nyx-sheet') ? 'sheet' : 'modal');
      n.dispatchEvent(new CustomEvent('nyx:' + type + '-hide', { bubbles: true }));
    });
    if (_backdrop) _backdrop.classList.remove('open');
    closeCommandPalette();
    lockScroll(false);
    if (!currentOverlay()) releaseFocus();
  }

  /* ---------- popover ---------- */
  function togglePopover(node, forceState) {
    var p = el(node); if (!p) return;
    if (!p.classList.contains('nyx-popover')) p = p.closest('.nyx-popover');
    if (!p) return;
    var willOpen = forceState !== undefined ? forceState : !p.classList.contains('open');
    if (willOpen) {
      $$('.nyx-popover.open').forEach(function (o) {
        if (o !== p) {
          o.classList.remove('open');
          o.dispatchEvent(new CustomEvent('nyx:popover-hide', { bubbles: true }));
        }
      });
      p.classList.add('open');
      p.dispatchEvent(new CustomEvent('nyx:popover-show', { bubbles: true }));
    } else {
      if (p.classList.contains('open')) {
        p.classList.remove('open');
        p.dispatchEvent(new CustomEvent('nyx:popover-hide', { bubbles: true }));
      }
    }
  }

  /* ---------- dropdown ---------- */
  function closeDropdowns(except) {
    $$('.nyx-dropdown.open').forEach(function (d) { if (d !== except) d.classList.remove('open'); });
  }

  /* ---------- command palette ---------- */
  function paletteEl() { return $('.nyx-command-palette'); }
  function openCommandPalette() {
    var cp = paletteEl(); if (!cp) return;
    if (!_lastFocus) _lastFocus = doc.activeElement;
    cp.classList.add('open'); lockScroll(true);
    var inp = cp.querySelector('input'); if (inp) setTimeout(function () { inp.focus(); }, 60);
    cp.dispatchEvent(new CustomEvent('nyx:palette-show', { bubbles: true }));
  }
  function closeCommandPalette() {
    var cp = paletteEl(); if (cp && cp.classList.contains('open')) {
      cp.classList.remove('open');
      cp.dispatchEvent(new CustomEvent('nyx:palette-hide', { bubbles: true }));
    }
    if (!currentOverlay()) { lockScroll(false); releaseFocus(); }
  }

  /* ---------- toast ---------- */
  var ICONS = { info: 'ℹ️', success: '✅', warning: '⚠️', danger: '⛔' };
  function toastWrap(pos) {                                     // one wrap per corner (data-pos)
    pos = pos || 'bottom-right';
    var w = $('.nyx-toast-wrap[data-pos="' + pos + '"]');
    if (!w) { w = doc.createElement('div'); w.className = 'nyx-toast-wrap'; w.setAttribute('data-pos', pos); w.setAttribute('aria-live', 'polite'); doc.body.appendChild(w); }
    return w;
  }
  /* toast(msg, 'success')  ·  toast(msg, { title, action:{label,onClick}, dismissible, persistent, position, icon, duration }) */
  function toast(message, typeOrOpts, ms) {
    var o = (typeOrOpts && typeof typeOrOpts === 'object') ? typeOrOpts : { type: typeOrOpts, duration: ms };
    var type = o.type || 'info';
    var dur = o.persistent ? 0 : (o.duration != null ? o.duration : 3200);
    var t = doc.createElement('div');
    t.className = 'nyx-toast nyx-toast-' + type;
    t.setAttribute('role', 'status');
    var icon = doc.createElement('span'); icon.className = 'nyx-toast-icon'; icon.textContent = o.icon || ICONS[type] || '•';
    t.appendChild(icon);
    var body = doc.createElement('div'); body.className = 'nyx-toast-body';
    if (o.title) { var ti = doc.createElement('strong'); ti.className = 'nyx-toast-title'; ti.textContent = o.title; body.appendChild(ti); }
    var txt = doc.createElement('span'); txt.textContent = message; body.appendChild(txt);
    t.appendChild(body);
    var timer;
    function dismiss() { clearTimeout(timer); t.classList.add('nyx-out'); t.addEventListener('animationend', function () { t.remove(); }); }
    if (o.action) {                                            // action button (e.g. Undo)
      var b = doc.createElement('button'); b.type = 'button'; b.className = 'nyx-toast-action';
      b.textContent = o.action.label || o.action;
      b.addEventListener('click', function () { if (o.action.onClick) o.action.onClick(); dismiss(); });
      t.appendChild(b);
    }
    if (o.dismissible) {                                       // ✕ close button
      var x = doc.createElement('button'); x.type = 'button'; x.className = 'nyx-toast-close'; x.setAttribute('aria-label', 'Dismiss'); x.textContent = '✕';
      x.addEventListener('click', dismiss); t.appendChild(x);
    }
    toastWrap(o.position).appendChild(t);
    if (dur) timer = setTimeout(dismiss, dur);
    t.dismiss = dismiss;
    return t;
  }

  /* ---------- snackbar (bottom action toast) ---------- */
  function snackbarWrap() {
    var w = $('.nyx-snackbar-wrap');
    if (!w) { w = doc.createElement('div'); w.className = 'nyx-snackbar-wrap'; w.setAttribute('aria-live', 'polite'); doc.body.appendChild(w); }
    return w;
  }
  function snackbar(message, opts) {
    opts = opts || {};
    var s = doc.createElement('div'); s.className = 'nyx-snackbar'; s.setAttribute('role', 'status');
    var msg = doc.createElement('span'); msg.className = 'nyx-snackbar-msg'; msg.textContent = message; s.appendChild(msg);
    var timer;
    function dismiss() { clearTimeout(timer); s.classList.add('nyx-out'); s.addEventListener('animationend', function () { s.remove(); }); }
    if (opts.action) {
      var b = doc.createElement('button'); b.type = 'button'; b.className = 'nyx-snackbar-action'; b.textContent = opts.action;
      b.addEventListener('click', function () { if (opts.onAction) opts.onAction(); dismiss(); });
      s.appendChild(b);
    }
    snackbarWrap().appendChild(s);
    if (opts.duration !== 0) timer = setTimeout(dismiss, opts.duration || 4500);
    s.dismiss = dismiss;
    return s;
  }

  /* ---------- confirm dialog → Promise<boolean> ---------- */
  function htmlEsc(s) { var d = doc.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; }
  function confirmDialog(message, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var modal = doc.createElement('div'); modal.className = 'nyx-modal open';
      modal.innerHTML = '<div class="nyx-modal-box nyx-confirm-box">' +
        (opts.title ? '<h3 class="nyx-h3" style="margin-bottom:8px">' + htmlEsc(opts.title) + '</h3>' : '') +
        '<p class="nyx-body nyx-muted">' + htmlEsc(message) + '</p>' +
        '<div class="nyx-confirm-actions">' +
        '<button class="nyx-btn nyx-btn-glass" data-act="cancel">' + htmlEsc(opts.cancelText || 'Cancel') + '</button>' +
        '<button class="nyx-btn nyx-btn-primary" data-act="ok"' + (opts.danger ? ' style="background:linear-gradient(120deg,var(--nyx-danger),color-mix(in srgb,var(--nyx-danger) 65%,#000))"' : '') + '>' + htmlEsc(opts.confirmText || 'Confirm') + '</button>' +
        '</div></div>';
      doc.body.appendChild(modal);
      var bd = backdrop(); bd.classList.add('open'); lockScroll(true);
      function done(val) {
        modal.classList.remove('open');
        if (!$('.nyx-modal.open')) bd.classList.remove('open');
        lockScroll(false); doc.removeEventListener('keydown', onKey);
        setTimeout(function () { modal.remove(); }, 250);
        resolve(val);
      }
      function onKey(e) { if (e.key === 'Escape') done(false); }
      modal.addEventListener('click', function (e) {
        if (e.target === modal) { done(false); return; }
        var a = e.target.closest('[data-act]'); if (a) done(a.getAttribute('data-act') === 'ok');
      });
      doc.addEventListener('keydown', onKey);
      var f = modal.querySelector('[data-act="ok"]'); if (f) setTimeout(function () { f.focus(); }, 60);
    });
  }

  /* ---------- tabs / pills ---------- */
  function activateTab(btn) {
    var group = btn.closest('[data-nyx-tabs]'); if (!group) return;
    var key = btn.getAttribute('data-nyx-tab');
    var scope = group.parentElement || doc;
    var activePanel = null;
    $$('[data-nyx-tab]', group).forEach(function (b) {
      var on = b === btn;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.setAttribute('tabindex', on ? '0' : '-1');
    });
    $$('[data-nyx-panel]', scope).forEach(function (p) {
      var show = p.getAttribute('data-nyx-panel') === key;
      p.classList.toggle('active', show);
      if (show) activePanel = p;
    });
    if (activePanel) {
      activePanel.dispatchEvent(new CustomEvent('nyx:tab-show', { bubbles: true, detail: { tab: btn, panel: activePanel } }));
    }
    if (group.hasAttribute('data-hash') && key) { try { history.replaceState(null, '', '#' + key); } catch (e) {} }
  }

  /* ---------- collapse / accordion ---------- */
  function toggleCollapse(trigger) {
    var t = el(trigger.getAttribute('data-nyx-target')); if (!t) return;
    var willOpen = !t.classList.contains('open');
    var acc = trigger.closest('[data-nyx-accordion]');
    if (acc && willOpen && !acc.hasAttribute('data-multi')) {     // data-multi keeps siblings open
      $$('.nyx-collapse.open', acc).forEach(function (c) {
        c.classList.remove('open');
        c.dispatchEvent(new CustomEvent('nyx:collapse-hide', { bubbles: true }));
      });
      $$('[data-nyx-toggle="collapse"].active', acc).forEach(function (h) { h.classList.remove('active'); });
    }
    t.classList.toggle('open', willOpen);
    trigger.classList.toggle('active', willOpen);
    t.dispatchEvent(new CustomEvent(willOpen ? 'nyx:collapse-show' : 'nyx:collapse-hide', { bubbles: true }));
  }
  /* open the panel(s) named by data-open (index or comma-list) on load */
  function initAccordion(root) {
    $$('[data-nyx-accordion][data-open]', root).filter(function (a) { return !a._nyxAcc; }).forEach(function (acc) {
      acc._nyxAcc = true;
      var triggers = $$('[data-nyx-toggle="collapse"]', acc);
      acc.getAttribute('data-open').split(',').forEach(function (n) {
        var trig = triggers[parseInt(n, 10)]; if (!trig) return;
        var t = el(trig.getAttribute('data-nyx-target')); if (!t) return;
        t.classList.add('open'); trig.classList.add('active');
      });
    });
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
    var oldActive = slides.findIndex(function (s) { return s.classList.contains('active'); });
    slides.forEach(function (s, n) { s.classList.toggle('active', n === i); });
    $$('.nyx-carousel-dots button', car).forEach(function (d, n) { d.classList.toggle('active', n === i); });
    if (oldActive !== i) {
      car.dispatchEvent(new CustomEvent('nyx:slide', { bubbles: true, detail: { index: i, from: oldActive } }));
    }
  }
  /* every .nyx-carousel gets arrow-key + swipe nav; autoplay is opt-in via data-autoplay */
  function initCarousel(root) {
    $$('.nyx-carousel', root).filter(function (c) { return !c._nyxCar; }).forEach(function (car) {
      car._nyxCar = true;
      var slides = $$('.nyx-slide', car);
      if (slides.length && !slides.some(function (s) { return s.classList.contains('active'); })) slides[0].classList.add('active');
      car.setAttribute('role', 'region'); car.setAttribute('aria-roledescription', 'carousel');
      if (!car.hasAttribute('tabindex')) car.setAttribute('tabindex', '0');
      car.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft') { carouselStep(car, 'prev'); e.preventDefault(); }
        else if (e.key === 'ArrowRight') { carouselStep(car, 'next'); e.preventDefault(); }
      });
      var x0 = null;                                              // pointer swipe
      car.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
      car.addEventListener('pointerup', function (e) {
        if (x0 == null) return; var dx = e.clientX - x0; x0 = null;
        if (Math.abs(dx) > 40) carouselStep(car, dx < 0 ? 'next' : 'prev');
      });
      car.addEventListener('pointercancel', function () { x0 = null; });
      if (car.hasAttribute('data-autoplay')) {                   // autoplay (opt-in)
        var ms = parseInt(car.getAttribute('data-interval'), 10) || 5000, timer = null;
        var play = function () { stop(); timer = setInterval(function () { carouselStep(car, 'next'); }, ms); };
        var stop = function () { if (timer) { clearInterval(timer); timer = null; } };
        car._nyxCarStop = stop;
        if (car.getAttribute('data-pause-hover') !== 'false') {
          car.addEventListener('mouseenter', stop); car.addEventListener('mouseleave', play);
          car.addEventListener('focusin', stop); car.addEventListener('focusout', play);
        }
        play();
      }
    });
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
  /* ---------- copy-to-clipboard (data-nyx-copy) ---------- */
  function fallbackCopy(text) {
    var ta = doc.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; ta.style.pointerEvents = 'none';
    doc.body.appendChild(ta); ta.focus(); ta.select();
    try { doc.execCommand('copy'); } catch (e) {}
    doc.body.removeChild(ta);
  }
  function copyCode(btn) {
    var sel = btn.getAttribute('data-nyx-copy');
    var src = sel ? el(sel) : btn.closest('.nyx-code-block');
    if (!src) return;
    var codeEl = src.matches && src.matches('code') ? src : (src.querySelector('code') || src);
    var text = (codeEl.innerText || codeEl.textContent || '').replace(/\n+$/, '');
    function done() {
      btn.classList.add('copied');
      var isRtl = doc.documentElement.getAttribute('dir') === 'rtl';
      toast(isRtl ? 'تم النسخ ✓' : 'Copied ✓', 'success');
      var origHtml = btn.innerHTML;
      var cleanText = btn.textContent.trim();
      if (cleanText && cleanText !== '⧉' && cleanText !== '✓') {
        btn.innerHTML = isRtl ? '✓ تم النسخ' : '✓ Copied';
      } else {
        btn.innerHTML = '✓';
      }
      setTimeout(function () {
        btn.classList.remove('copied');
        btn.innerHTML = origHtml;
      }, 1500);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
    } else { fallbackCopy(text); done(); }
  }

  doc.addEventListener('click', function (e) {
    if (e.target && e.target.ownerDocument && !e.target.ownerDocument.contains(e.target)) {
      return;
    }

    var copyBtn = e.target.closest('[data-nyx-copy]');
    if (copyBtn) { e.preventDefault(); copyCode(copyBtn); return; }

    var toggle = e.target.closest('[data-nyx-toggle]');
    if (toggle) {
      var kind = toggle.getAttribute('data-nyx-toggle');
      var target = toggle.getAttribute('data-nyx-target');
      if (kind === 'modal') { e.preventDefault(); openModal(target); return; }
      if (kind === 'drawer') { e.preventDefault(); openDrawer(target); return; }
      if (kind === 'sheet') { e.preventDefault(); openModal(target); return; }
      if (kind === 'popover') { e.preventDefault(); togglePopover(toggle); return; }
      if (kind === 'command') { e.preventDefault(); openCommandPalette(); return; }
      if (kind === 'collapse') { e.preventDefault(); toggleCollapse(toggle); return; }
      if (kind === 'dropdown') {
        e.preventDefault();
        var dd = toggle.closest('.nyx-dropdown'), willOpen = dd && !dd.classList.contains('open');
        closeDropdowns(dd);
        if (dd) {
          dd.classList.toggle('open', willOpen);
          dd.dispatchEvent(new CustomEvent(willOpen ? 'nyx:dropdown-show' : 'nyx:dropdown-hide', { bubbles: true }));
        }
        if (willOpen) { var fi = dd.querySelector('.nyx-dropdown-item'); if (fi) setTimeout(function () { fi.focus(); }, 20); }
        return;
      }
    }
    if (e.target.closest('[data-nyx-dismiss]')) { e.preventDefault(); closeAll(); return; }

    var step = e.target.closest('[data-nyx-step]');
    if (step) { stepperAdjust(step); return; }
    var tagX = e.target.closest('.nyx-tag-input .nyx-chip-x');
    if (tagX) {
      var ch = tagX.closest('.nyx-chip'), ti = tagX.closest('.nyx-tag-input');
      if (ch) ch.remove();
      if (ti) ti.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }

    var tab = e.target.closest('[data-nyx-tab]');
    if (tab) { e.preventDefault(); activateTab(tab); return; }

    var slide = e.target.closest('[data-nyx-slide]');
    if (slide) { var car = slide.closest('.nyx-carousel'); if (car) carouselStep(car, slide.getAttribute('data-nyx-slide')); return; }
    var dot = e.target.closest('[data-nyx-slide-to]');
    if (dot) { var c2 = dot.closest('.nyx-carousel'); if (c2) carouselSet(c2, +dot.getAttribute('data-nyx-slide-to')); return; }

    var cpItem = e.target.closest('.nyx-command-palette [data-nyx-target]');
    if (cpItem) { closeAll(); var sec = el(cpItem.getAttribute('data-nyx-target')); if (sec) sec.scrollIntoView(); return; }

    var hnode = e.target.closest('.nyx-hierarchy-node.has-kids');
    if (hnode) { var hli = hnode.closest('li'); if (hli) hli.classList.toggle('nyx-collapsed'); return; }
    var hitem = e.target.closest('.nyx-hierarchy-cols .nyx-hitem');
    if (hitem) { hcolSelect(hitem); return; }

    var fab = e.target.closest('.nyx-fab-btn');
    if (fab) { var f = fab.closest('.nyx-fab'); if (f) f.classList.toggle('open'); return; }
    if (e.target.closest('.nyx-to-top')) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }

    if (e.target.closest('.nyx-dropdown-item')) { closeDropdowns(); return; }
    if (!e.target.closest('.nyx-popover')) $$('.nyx-popover.open').forEach(function (o) { togglePopover(o, false); });
    if (!e.target.closest('.nyx-dropdown')) closeDropdowns();
    if (!e.target.closest('.nyx-combobox')) $$('.nyx-combobox.open').forEach(function (o) { o.classList.remove('open'); });
    if (!e.target.closest('.nyx-multiselect')) $$('.nyx-multiselect.open').forEach(function (o) { o.classList.remove('open'); });
    if (!e.target.closest('.nyx-datepicker')) $$('.nyx-datepicker.open').forEach(function (o) { o.classList.remove('open'); });
    if (!e.target.closest('.nyx-fab')) $$('.nyx-fab.open').forEach(function (o) { o.classList.remove('open'); });
    if (!e.target.closest('.nyx-context-menu')) $$('.nyx-context-menu.open').forEach(function (o) { o.classList.remove('open'); });
  });

  /* ---------- keyboard: ⌘K palette, Tab trap, arrows, Esc ---------- */
  doc.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      if (paletteEl()) { e.preventDefault(); openCommandPalette(); }
    }
    /* focus trap inside an open overlay */
    if (e.key === 'Tab') {
      var ov = currentOverlay();
      if (ov) {
        var f = focusables(ov); if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    /* roving arrows for tabs / nav-pills */
    var tabEl = e.target.closest('[data-nyx-tab]');
    if (tabEl && (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Home' || e.key === 'End')) {
      var grp = tabEl.closest('[data-nyx-tabs]'); if (grp) {
        e.preventDefault();
        var tabs = $$('[data-nyx-tab]', grp), i = tabs.indexOf(tabEl), n = tabs.length;
        var to = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : e.key === 'ArrowRight' ? (i + 1) % n : (i - 1 + n) % n;
        tabs[to].focus(); activateTab(tabs[to]);
      }
    }
    /* arrow nav inside an open dropdown / context menu */
    var menu = $('.nyx-dropdown.open') || $('.nyx-context-menu.open');
    if (menu && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      var items = $$('.nyx-dropdown-item', menu); if (items.length) {
        e.preventDefault();
        var ci = items.indexOf(doc.activeElement);
        var ni = e.key === 'ArrowDown' ? (ci + 1) % items.length : (ci - 1 + items.length) % items.length;
        items[ni < 0 ? 0 : ni].focus();
      }
    }
    if (e.key === 'Escape') {
      closeAll(); closeDropdowns();
      $$('.nyx-popover.open').forEach(function (o) { togglePopover(o, false); });
      $$('.nyx-combobox.open, .nyx-multiselect.open, .nyx-datepicker.open, .nyx-fab.open, .nyx-context-menu.open').forEach(function (o) { o.classList.remove('open'); });
    }
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
      ti.dispatchEvent(new Event('change', { bubbles: true }));
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

  /* ---------- interactive hover-lit squares (.nyx-bg-squares) & spotlight cards ---------- */
  function initSquares(root) {
    $$('.nyx-bg-squares, .nyx-spotlight-card', root).filter(function (e) { return !e._nyxSq; }).forEach(function (e) {
      e._nyxSq = true;
      e.addEventListener('pointermove', function (ev) {
        var r = e.getBoundingClientRect();
        e.style.setProperty('--nyx-mx', (ev.clientX - r.left) + 'px');
        e.style.setProperty('--nyx-my', (ev.clientY - r.top) + 'px');
      }, { passive: true });
      e.addEventListener('pointerleave', function () {
        e.style.setProperty('--nyx-mx', '-999px');
        e.style.setProperty('--nyx-my', '-999px');
      });
    });
  }

  /* ---------- range slider fill (.nyx-slider) ---------- */
  function sliderFill(s) {
    var min = parseFloat(s.min) || 0, max = parseFloat(s.max);
    if (isNaN(max)) max = 100;
    var v = parseFloat(s.value); if (isNaN(v)) v = min;
    s.style.setProperty('--nyx-slider', max > min ? ((v - min) / (max - min)) * 100 : 0);
    var sel = s.getAttribute('data-output');                   // live value into any element
    if (sel) { var o = el(sel); if (o) o.textContent = (s.getAttribute('data-prefix') || '') + v + (s.getAttribute('data-suffix') || ''); }
  }
  function initSlider(root) { $$('.nyx-slider', root).forEach(sliderFill); }
  doc.addEventListener('input', function (e) {
    var s = e.target.closest && e.target.closest('.nyx-slider');
    if (s) sliderFill(s);
  });

  /* ---------- Arabic-Indic numerals (MENA) ---------- */
  var AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
  function toArabicNumerals(value) {
    return String(value).replace(/[0-9]/g, function (d) { return AR_DIGITS[+d]; });
  }
  function initNumerals(root) {
    $$('[data-nyx-numerals="arab"]', root).filter(function (e) { return !e._nyxNum; })
      .forEach(function (e) { e._nyxNum = true; e.textContent = toArabicNumerals(e.textContent); });
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  /* ---------- combobox / autocomplete ---------- */
  function initCombobox(root) {
    $$('.nyx-combobox', root).filter(function (c) { return !c._nyxCb; }).forEach(function (c) {
      c._nyxCb = true;
      var input = c.querySelector('input'), opts = $$('.nyx-combobox-opt', c), menu = c.querySelector('.nyx-combobox-menu');
      input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list'); input.setAttribute('aria-expanded', 'false');
      if (menu) menu.setAttribute('role', 'listbox');
      opts.forEach(function (o) { o.setAttribute('role', 'option'); o.setAttribute('tabindex', '-1'); });
      function setOpen(on) { c.classList.toggle('open', on); input.setAttribute('aria-expanded', on ? 'true' : 'false'); }
      function filter() {
        var q = (input.value || '').trim().toLowerCase(), shown = 0;
        opts.forEach(function (o) { var hit = o.textContent.toLowerCase().indexOf(q) > -1; o.hidden = !hit; if (hit) shown++; });
        c.classList.toggle('empty', shown === 0);
      }
      function vis() { return opts.filter(function (o) { return !o.hidden; }); }
      function setActive(list, i) {
        opts.forEach(function (o) { o.classList.remove('active'); o.setAttribute('aria-selected', 'false'); });
        if (list[i]) { list[i].classList.add('active'); list[i].setAttribute('aria-selected', 'true'); list[i].scrollIntoView({ block: 'nearest' }); }
      }
      function choose(o) { input.value = o.getAttribute('data-value') || o.textContent.trim(); setOpen(false); input.dispatchEvent(new Event('change', { bubbles: true })); }
      input.addEventListener('focus', function () { setOpen(true); filter(); });
      input.addEventListener('input', function () { setOpen(true); filter(); });
      input.addEventListener('keydown', function (e) {
        var list = vis(), cur = list.indexOf(c.querySelector('.nyx-combobox-opt.active'));
        if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(list, cur < 0 ? 0 : (cur + 1) % list.length); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(list, cur <= 0 ? list.length - 1 : cur - 1); }
        else if (e.key === 'Enter') { var a = c.querySelector('.nyx-combobox-opt.active') || list[0]; if (a) { e.preventDefault(); choose(a); } }
        else if (e.key === 'Escape') { setOpen(false); }
      });
      c.addEventListener('mousedown', function (e) {
        var o = e.target.closest('.nyx-combobox-opt'); if (!o) return; e.preventDefault(); choose(o);
      });
    });
  }

  /* ---------- multi-select ---------- */
  function initMultiselect(root) {
    $$('.nyx-multiselect', root).filter(function (m) { return !m._nyxMs; }).forEach(function (m) {
      m._nyxMs = true;
      var control = m.querySelector('.nyx-multiselect-control'), input = control.querySelector('input');
      var menu = m.querySelector('.nyx-multiselect-menu');
      var opts = $$('.nyx-multiselect-opt', m);
      if (menu) menu.setAttribute('role', 'listbox'); if (menu) menu.setAttribute('aria-multiselectable', 'true');
      opts.forEach(function (o) { o.setAttribute('role', 'option'); o.setAttribute('aria-selected', 'false'); });
      function valOf(o) { return o.getAttribute('data-value') || o.textContent.trim(); }
      function addChip(val, label) {
        if (control.querySelector('[data-val="' + val + '"]')) return;
        var chip = doc.createElement('span');
        chip.className = 'nyx-chip nyx-chip-accent'; chip.setAttribute('data-val', val);
        chip.innerHTML = label + ' <span class="nyx-chip-x" role="button" aria-label="remove">×</span>';
        control.insertBefore(chip, input);
      }
      function removeVal(v) {
        opts.forEach(function (o) { if (valOf(o) === v) { o.classList.remove('selected'); o.setAttribute('aria-selected', 'false'); } });
        var ch = control.querySelector('[data-val="' + v + '"]'); if (ch) ch.remove();
      }
      function toggle(o) {
        var on = o.classList.toggle('selected'); o.setAttribute('aria-selected', on ? 'true' : 'false');
        if (on) addChip(valOf(o), o.textContent.trim()); else removeVal(valOf(o));
        m.dispatchEvent(new Event('change', { bubbles: true }));
      }
      control.addEventListener('click', function (e) {
        var x = e.target.closest('.nyx-chip-x');
        if (x) {
          removeVal(x.closest('.nyx-chip').getAttribute('data-val'));
          m.dispatchEvent(new Event('change', { bubbles: true }));
          return;
        }
        m.classList.add('open'); if (input) input.focus();
      });
      if (menu) menu.addEventListener('mousedown', function (e) {
        var o = e.target.closest('.nyx-multiselect-opt'); if (!o) return; e.preventDefault(); toggle(o);
      });
      if (input) input.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !input.value) {
          var chips = $$('.nyx-chip', control);
          if (chips.length) {
            removeVal(chips[chips.length - 1].getAttribute('data-val'));
            m.dispatchEvent(new Event('change', { bubbles: true }));
          }
        } else if (e.key === 'Escape') { m.classList.remove('open'); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); m.classList.add('open'); var f = menu && menu.querySelector('.nyx-multiselect-opt'); if (f) f.scrollIntoView({ block: 'nearest' }); }
      });
    });
  }

  /* ---------- date picker ---------- */
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  function parseDay(s) {                       // 'YYYY-MM-DD' -> {y,m,d} (m 0-based) | null
    if (!s) return null; var p = String(s).split('-'); if (p.length < 3) return null;
    return { y: +p[0], m: +p[1] - 1, d: +p[2] };
  }
  function dayCmp(a, b) { return a.y - b.y || a.m - b.m || a.d - b.d; }
  /* read all calendar options off the host element */
  function calCfg(elx, footer) {
    var ws = elx.getAttribute('data-week-start');
    return {
      minY: elx.getAttribute('data-min-year') ? +elx.getAttribute('data-min-year') : null,
      maxY: elx.getAttribute('data-max-year') ? +elx.getAttribute('data-max-year') : null,
      minD: parseDay(elx.getAttribute('data-min')),       // earliest selectable day
      maxD: parseDay(elx.getAttribute('data-max')),       // latest selectable day
      weekStart: (ws === 'mon' || ws === '1') ? 1 : 0,    // 0 = Sunday (default), 1 = Monday
      footer: !!footer                                    // show Today / Clear
    };
  }
  /* format a {y,m,d} via a token pattern — YYYY / MM / DD (default 'YYYY-MM-DD') */
  function fmtDate(d, fmt) {
    return (fmt || 'YYYY-MM-DD').replace(/YYYY/g, d.y).replace(/MM/g, pad(d.m + 1)).replace(/DD/g, pad(d.d));
  }
  function calMonthHtml(y, m, sel, today, cfg) {
    cfg = cfg || {};
    var ws = cfg.weekStart === 1 ? 1 : 0;
    var first = new Date(y, m, 1).getDay(); if (ws) first = (first + 6) % 7;     // shift Monday to col 0
    var days = new Date(y, m + 1, 0).getDate();
    var baseY = (today && today.y) || y;
    var lo = (cfg.minY != null) ? cfg.minY : (cfg.minD ? cfg.minD.y : baseY - 100);
    var hi = (cfg.maxY != null) ? cfg.maxY : (cfg.maxD ? cfg.maxD.y : baseY + 10);
    lo = Math.min(lo, y); hi = Math.max(hi, y);                       // keep the shown year selectable
    var mOpts = ''; MONTHS.forEach(function (name, i) { mOpts += '<option value="' + i + '"' + (i === m ? ' selected' : '') + '>' + name + '</option>'; });
    var yOpts = ''; for (var yy = hi; yy >= lo; yy--) yOpts += '<option value="' + yy + '"' + (yy === y ? ' selected' : '') + '>' + yy + '</option>';
    var dow = ws ? DOW.slice(1).concat(DOW.slice(0, 1)) : DOW;
    var h = '<div class="nyx-calendar-head">'
      + '<button type="button" data-cal="prev" aria-label="Previous month">‹</button>'
      + '<span class="nyx-calendar-sel">'
      + '<select data-cal-set="month" aria-label="Month">' + mOpts + '</select>'
      + '<select data-cal-set="year" aria-label="Year">' + yOpts + '</select>'
      + '</span>'
      + '<button type="button" data-cal="next" aria-label="Next month">›</button>'
      + '</div><div class="nyx-calendar-grid">';
    dow.forEach(function (d) { h += '<span class="dow">' + d + '</span>'; });
    for (var i = 0; i < first; i++) h += '<span></span>';
    for (var d = 1; d <= days; d++) {
      var cur = { y: y, m: m, d: d };
      var dis = (cfg.minD && dayCmp(cur, cfg.minD) < 0) || (cfg.maxD && dayCmp(cur, cfg.maxD) > 0);
      var s = (sel && sel.y === y && sel.m === m && sel.d === d) ? ' selected' : '';
      if (today && today.y === y && today.m === m && today.d === d) s += ' today';
      if (dis) s += ' disabled';
      h += '<span class="day' + s + '"' + (dis ? '' : ' data-day="' + d + '"') + '>' + d + '</span>';   // disabled cells have no data-day → not clickable
    }
    h += '</div>';
    if (cfg.footer) h += '<div class="nyx-calendar-foot"><button type="button" data-cal-go="today">Today</button><button type="button" data-cal-go="clear">Clear</button></div>';
    return h;
  }
  function initDatepicker(root) {
    $$('[data-nyx-datepicker]', root).filter(function (d) { return !d._nyxDp; }).forEach(function (dp) {
      dp._nyxDp = true;
      var input = dp.querySelector('input'), pop = dp.querySelector('.nyx-datepicker-pop');
      if (!pop) { pop = doc.createElement('div'); pop.className = 'nyx-datepicker-pop'; dp.appendChild(pop); }
      var cal = doc.createElement('div'); cal.className = 'nyx-calendar'; pop.appendChild(cal);
      var now = new Date(), st = { y: now.getFullYear(), m: now.getMonth(), sel: null, today: { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() } };
      var fmt = dp.getAttribute('data-format') || 'YYYY-MM-DD';
      var cfg = calCfg(dp, true);                                 // datepicker shows the Today/Clear footer
      function render() { cal.innerHTML = calMonthHtml(st.y, st.m, st.sel, st.today, cfg); }
      render();
      input.addEventListener('focus', function () { dp.classList.add('open'); });
      cal.addEventListener('change', function (e) {               // month / year dropdowns
        var s = e.target.closest('[data-cal-set]'); if (!s) return;
        e.stopPropagation();
        if (s.getAttribute('data-cal-set') === 'year') st.y = +s.value; else st.m = +s.value;
        render();
      });
      cal.addEventListener('click', function (e) {
        var nav = e.target.closest('[data-cal]');
        if (nav) {
          /* render() replaces the clicked button's node; without this the click would
             bubble to the document handler as a detached target and close the picker. */
          e.stopPropagation();
          st.m += nav.getAttribute('data-cal') === 'next' ? 1 : -1;
          if (st.m > 11) { st.m = 0; st.y++; } if (st.m < 0) { st.m = 11; st.y--; }
          render(); return;
        }
        var go = e.target.closest('[data-cal-go]');               // Today / Clear footer
        if (go) {
          e.stopPropagation();
          if (go.getAttribute('data-cal-go') === 'today') {
            st.y = st.today.y; st.m = st.today.m; st.sel = { y: st.today.y, m: st.today.m, d: st.today.d };
            input.value = fmtDate(st.sel, fmt); dp.classList.remove('open');
          } else { st.sel = null; input.value = ''; }
          render(); input.dispatchEvent(new Event('change', { bubbles: true })); return;
        }
        var day = e.target.closest('.day[data-day]');
        if (day) {
          st.sel = { y: st.y, m: st.m, d: +day.getAttribute('data-day') };
          input.value = fmtDate(st.sel, fmt);
          dp.classList.remove('open'); render(); input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    });
  }

  /* ---------- standalone calendar (data-nyx-calendar) ---------- */
  function initCalendar(root) {
    $$('.nyx-calendar[data-nyx-calendar]', root).filter(function (c) { return !c._nyxCal; }).forEach(function (cal) {
      cal._nyxCal = true;
      if (cal.getAttribute('data-nyx-calendar') === 'hijri') { initHijri(cal); return; }
      var now = new Date();
      var st = { y: now.getFullYear(), m: now.getMonth(), sel: null, today: { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() } };
      var cfg = calCfg(cal, cal.hasAttribute('data-footer'));     // add data-footer for Today/Clear
      function render() { cal.innerHTML = calMonthHtml(st.y, st.m, st.sel, st.today, cfg); }
      render();
      cal.addEventListener('change', function (e) {               // month / year dropdowns
        var s = e.target.closest('[data-cal-set]'); if (!s) return;
        if (s.getAttribute('data-cal-set') === 'year') st.y = +s.value; else st.m = +s.value;
        render();
      });
      cal.addEventListener('click', function (e) {
        var nav = e.target.closest('[data-cal]');
        if (nav) {
          st.m += nav.getAttribute('data-cal') === 'next' ? 1 : -1;
          if (st.m > 11) { st.m = 0; st.y++; } if (st.m < 0) { st.m = 11; st.y--; }
          render(); return;
        }
        var go = e.target.closest('[data-cal-go]');               // Today / Clear footer
        if (go) {
          if (go.getAttribute('data-cal-go') === 'today') {
            st.y = st.today.y; st.m = st.today.m; st.sel = { y: st.today.y, m: st.today.m, d: st.today.d };
          } else { st.sel = null; }
          render();
          cal.dispatchEvent(new CustomEvent('nyx:date', { bubbles: true, detail: st.sel }));
          return;
        }
        var day = e.target.closest('.day[data-day]');
        if (day) {
          st.sel = { y: st.y, m: st.m, d: +day.getAttribute('data-day') };
          render();
          cal.dispatchEvent(new CustomEvent('nyx:date', { bubbles: true, detail: st.sel }));
        }
      });
    });
  }

  /* ---------- Hijri (Umm al-Qura) calendar — data-nyx-calendar="hijri" ---------- */
  function hijriParts(d, loc) {
    var f = new Intl.DateTimeFormat(loc + '-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', year: 'numeric' });
    var o = {}; f.formatToParts(d).forEach(function (p) { if (p.type !== 'literal') o[p.type] = parseInt(p.value, 10); });
    return o;                              // { day, month, year }
  }
  function hijriMonth(anchor, loc) {
    var hp = hijriParts(anchor, loc);
    var day1 = new Date(anchor); day1.setDate(day1.getDate() - (hp.day - 1));   // Gregorian date of Hijri day 1
    var days = [], cur = new Date(day1), guard = 0;
    while (guard++ < 32) {
      var p = hijriParts(cur, loc);
      if (p.month !== hp.month || p.year !== hp.year) break;
      days.push({ hd: p.day, greg: new Date(cur) });
      cur.setDate(cur.getDate() + 1);
    }
    return { day1: day1, days: days };
  }
  function initHijri(cal) {
    var ar = docEl.getAttribute('dir') === 'rtl' || (docEl.getAttribute('lang') || '').indexOf('ar') === 0;
    var loc = ar ? 'ar' : 'en';
    var anchor = new Date(), today = new Date();
    function eq(g, t) { return g.getFullYear() === t.getFullYear() && g.getMonth() === t.getMonth() && g.getDate() === t.getDate(); }
    function render() {
      var m, head;
      try {
        m = hijriMonth(anchor, loc);
        head = new Intl.DateTimeFormat(loc + '-u-ca-islamic-umalqura', { month: 'long', year: 'numeric' }).format(m.day1);
      } catch (e) { cal.innerHTML = '<div class="nyx-caption nyx-muted" style="padding:12px">Hijri calendar not supported in this browser.</div>'; return; }
      var dows = ar ? ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'] : DOW;
      var h = '<div class="nyx-calendar-head"><button data-cal="prev" aria-label="previous month">‹</button><span>' + head + '</span><button data-cal="next" aria-label="next month">›</button></div><div class="nyx-calendar-grid">';
      dows.forEach(function (d) { h += '<span class="dow">' + d + '</span>'; });
      for (var i = 0; i < m.day1.getDay(); i++) h += '<span></span>';
      m.days.forEach(function (day) {
        var t = eq(day.greg, today) ? ' today' : '';
        var label = ar ? toArabicNumerals(day.hd) : day.hd;
        h += '<span class="day' + t + '" data-day="' + day.hd + '" title="' + day.greg.toLocaleDateString() + '">' + label + '</span>';
      });
      cal.innerHTML = h + '</div>';
    }
    render();
    cal.addEventListener('click', function (e) {
      var nav = e.target.closest('[data-cal]');
      if (nav) {
        var m = hijriMonth(anchor, loc);
        if (nav.getAttribute('data-cal') === 'next') { anchor = new Date(m.days[m.days.length - 1].greg); anchor.setDate(anchor.getDate() + 1); }
        else { anchor = new Date(m.day1); anchor.setDate(anchor.getDate() - 1); }
        render(); return;
      }
      var day = e.target.closest('.day[data-day]');
      if (day) { $$('.day.selected', cal).forEach(function (x) { x.classList.remove('selected'); }); day.classList.add('selected'); }
    });
  }

  /* ---------- dual-handle range (min / max); paints --nyx-lo / --nyx-hi ---------- */
  function rangeFill(wrap) {
    var ins = $$('input[type="range"]', wrap); if (ins.length < 2) return;
    var min = parseFloat(ins[0].min) || 0, max = parseFloat(ins[0].max); if (isNaN(max)) max = 100;
    var a = parseFloat(ins[0].value), b = parseFloat(ins[1].value);
    if (isNaN(a)) a = min; if (isNaN(b)) b = max;
    var lo = Math.min(a, b), hi = Math.max(a, b);
    function pct(v) { return max > min ? ((v - min) / (max - min)) * 100 : 0; }
    wrap.style.setProperty('--nyx-lo', pct(lo));
    wrap.style.setProperty('--nyx-hi', pct(hi));
    wrap.setAttribute('data-lo', lo); wrap.setAttribute('data-hi', hi);
    var out = wrap.parentNode && wrap.parentNode.querySelector('.nyx-range-out');
    if (out) out.textContent = lo + ' – ' + hi;
  }
  function initRange(root) {
    $$('.nyx-range', root).filter(function (r) { return $$('input[type="range"]', r).length >= 2 && !r._nyxRg; })
      .forEach(function (r) { r._nyxRg = true; rangeFill(r); });
  }
  doc.addEventListener('input', function (e) {
    var r = e.target.closest && e.target.closest('.nyx-range');
    if (r && e.target.type === 'range') rangeFill(r);
  });

  /* ---------- kanban: drag & drop cards within / across columns ---------- */
  function initKanban(root) {
    $$('.nyx-kanban', root).filter(function (k) { return !k._nyxKb; }).forEach(function (board) {
      board._nyxKb = true;
      var dragging = null;
      function mark() { $$('.nyx-kanban-card', board).forEach(function (c) { c.setAttribute('draggable', 'true'); }); }
      mark();
      board.addEventListener('mouseover', function (e) {
        var card = e.target.closest && e.target.closest('.nyx-kanban-card');
        if (card && card.getAttribute('draggable') !== 'true') {
          card.setAttribute('draggable', 'true');
        }
      });
      function cardAfter(col, y) {
        var cards = $$('.nyx-kanban-card:not(.nyx-dragging)', col), best = null, bestOff = -Infinity;
        cards.forEach(function (c) {
          var box = c.getBoundingClientRect(), off = y - box.top - box.height / 2;
          if (off < 0 && off > bestOff) { bestOff = off; best = c; }
        });
        return best;
      }
      board.addEventListener('dragstart', function (e) {
        var card = e.target.closest('.nyx-kanban-card'); if (!card) return;
        dragging = card; card.classList.add('nyx-dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', card.textContent); } catch (x) {}
      });
      board.addEventListener('dragend', function () {
        if (dragging) dragging.classList.remove('nyx-dragging');
        $$('.nyx-kanban-col', board).forEach(function (col) { col.classList.remove('nyx-drop-over'); });
        if (dragging) dragging.dispatchEvent(new CustomEvent('nyx:kanban-move', { bubbles: true }));
        dragging = null;
      });
      board.addEventListener('dragover', function (e) {
        if (!dragging) return;
        var col = e.target.closest('.nyx-kanban-col'); if (!col) return;
        e.preventDefault(); e.dataTransfer.dropEffect = 'move';
        $$('.nyx-kanban-col', board).forEach(function (c) { c.classList.toggle('nyx-drop-over', c === col); });
        var after = cardAfter(col, e.clientY);
        if (after == null) col.appendChild(dragging);
        else col.insertBefore(dragging, after);
      });
      board.addEventListener('drop', function (e) { if (dragging) e.preventDefault(); });
    });
  }

  /* ---------- before/after image compare ---------- */
  function initCompare(root) {
    $$('.nyx-compare', root).filter(function (c) { return !c._nyxCmp; }).forEach(function (c) {
      c._nyxCmp = true;
      var dragging = false;
      function setPos(x) { var r = c.getBoundingClientRect(); c.style.setProperty('--nyx-pos', Math.max(0, Math.min(100, ((x - r.left) / r.width) * 100))); }
      c.addEventListener('pointerdown', function (e) { dragging = true; setPos(e.clientX); e.preventDefault(); });
      window.addEventListener('pointermove', function (e) { if (dragging) setPos(e.clientX); }, { passive: true });
      window.addEventListener('pointerup', function () { dragging = false; });
    });
  }

  /* ---------- image gallery + lightbox ---------- */
  var _lightbox = null;
  function lightboxEl() {
    if (_lightbox) return _lightbox;
    _lightbox = doc.createElement('div');
    _lightbox.className = 'nyx-lightbox';
    _lightbox.innerHTML = '<button class="nyx-lightbox-close" aria-label="close">✕</button><button class="nyx-lightbox-prev" aria-label="previous">‹</button><img alt=""><button class="nyx-lightbox-next" aria-label="next">›</button>';
    doc.body.appendChild(_lightbox);
    _lightbox._imgs = []; _lightbox._i = 0;
    var img = _lightbox.querySelector('img');
    function show(i) { var a = _lightbox._imgs; if (!a.length) return; _lightbox._i = (i + a.length) % a.length; img.src = a[_lightbox._i]; }
    function hide() { _lightbox.classList.remove('open'); lockScroll(false); }
    _lightbox._show = show;
    _lightbox.querySelector('.nyx-lightbox-close').addEventListener('click', hide);
    _lightbox.querySelector('.nyx-lightbox-prev').addEventListener('click', function (e) { e.stopPropagation(); show(_lightbox._i - 1); });
    _lightbox.querySelector('.nyx-lightbox-next').addEventListener('click', function (e) { e.stopPropagation(); show(_lightbox._i + 1); });
    _lightbox.addEventListener('click', function (e) { if (e.target === _lightbox) hide(); });
    doc.addEventListener('keydown', function (e) {
      if (!_lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') hide();
      else if (e.key === 'ArrowRight') show(_lightbox._i + 1);
      else if (e.key === 'ArrowLeft') show(_lightbox._i - 1);
    });
    return _lightbox;
  }
  function initLightbox(root) {
    $$('.nyx-gallery', root).filter(function (g) { return !g._nyxLb; }).forEach(function (g) {
      g._nyxLb = true;
      g.addEventListener('click', function (e) {
        var img = e.target.closest('img'); if (!img) return;
        var imgs = $$('img', g);
        var lb = lightboxEl();
        lb._imgs = imgs.map(function (im) { return im.getAttribute('data-full') || im.src; });
        lb._show(imgs.indexOf(img));
        lb.classList.add('open'); lockScroll(true);
      });
    });
  }

  /* ---------- video facade (poster → embedded iframe on click) ---------- */
  function initVideoFacade(root) {
    $$('.nyx-video[data-embed]', root).filter(function (v) { return !v._nyxVid; }).forEach(function (v) {
      v._nyxVid = true;
      v.addEventListener('click', function () {
        if (v.classList.contains('playing')) return;
        var url = v.getAttribute('data-embed'), sep = url.indexOf('?') > -1 ? '&' : '?';
        var h = v.offsetHeight, ifr = doc.createElement('iframe');
        ifr.src = url + sep + 'autoplay=1';
        ifr.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
        ifr.setAttribute('allowfullscreen', '');
        ifr.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
        v.style.height = h + 'px';
        var poster = v.querySelector('img'); if (poster) poster.style.display = 'none';
        v.classList.add('playing'); v.appendChild(ifr);
      });
    });
  }

  /* ---------- back-to-top + top progress bar ---------- */
  function syncBackTop() {
    var sy = window.scrollY || doc.documentElement.scrollTop;
    $$('.nyx-to-top').forEach(function (b) { b.classList.toggle('show', sy > 320); });
    var sh = docEl.scrollHeight - docEl.clientHeight;
    var pct = sh > 0 ? (sy / sh) * 100 : 0;
    $$('.nyx-scroll-progress').forEach(function (p) { p.style.width = pct + '%'; });
    $$('.nyx-navbar-sticky').forEach(function (n) { n.classList.toggle('scrolled', sy > 40); });
  }
  var _tb = null, _tbTimer = null;
  function topSpan() { if (!_tb) { _tb = doc.createElement('div'); _tb.className = 'nyx-topbar'; _tb.innerHTML = '<span></span>'; doc.body.appendChild(_tb); } return _tb.firstChild; }
  var progress = {
    start: function () { var s = topSpan(); s.style.opacity = '1'; var w = 8; s.style.width = '8%'; clearInterval(_tbTimer); _tbTimer = setInterval(function () { w += (92 - w) * 0.12; s.style.width = w.toFixed(1) + '%'; }, 400); return progress; },
    set: function (p) { topSpan().style.width = Math.max(0, Math.min(100, p)) + '%'; return progress; },
    done: function () { clearInterval(_tbTimer); var s = topSpan(); s.style.width = '100%'; setTimeout(function () { s.style.opacity = '0'; setTimeout(function () { s.style.width = '0'; }, 350); }, 220); return progress; }
  };

  /* ---------- countdown (Iftar / Suhoor / sale) ---------- */
  function tickCountdown(c) {
    var diff = Math.max(0, Math.floor((c._nyxTarget - new Date()) / 1000));
    var u = $$('.unit b', c), m = Math.floor((diff % 3600) / 60), s = diff % 60;
    if (u.length >= 4) {                                        // D : H : M : S (multi-day targets)
      u[0].textContent = pad(Math.floor(diff / 86400)); u[1].textContent = pad(Math.floor((diff % 86400) / 3600));
      u[2].textContent = pad(m); u[3].textContent = pad(s);
    } else {                                                   // H : M : S (hours may exceed 24)
      if (u[0]) u[0].textContent = pad(Math.floor(diff / 3600)); if (u[1]) u[1].textContent = pad(m); if (u[2]) u[2].textContent = pad(s);
    }
  }
  function initCountdown(root) {
    $$('.nyx-countdown[data-nyx-countdown], .nyx-countdown[data-date]', root).filter(function (c) { return !c._nyxCd; }).forEach(function (c) {
      c._nyxCd = true;
      var dateAttr = c.getAttribute('data-date'), target;
      if (dateAttr) { target = new Date(dateAttr); }           // absolute target — ISO date or datetime
      else {
        var p = c.getAttribute('data-nyx-countdown').split(':'), now = new Date();
        target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), +p[0], +p[1] || 0, 0);
        if (target < now) target = new Date(target.getTime() + 86400000);   // time-of-day → wrap to tomorrow
      }
      c._nyxTarget = target; tickCountdown(c);
      var iv = setInterval(function () {
        tickCountdown(c);
        if (!c._nyxDone && c._nyxTarget - new Date() <= 0) {   // fire once when it hits zero
          c._nyxDone = true; clearInterval(iv);
          c.classList.add('nyx-countdown-done');
          c.dispatchEvent(new CustomEvent('nyx:countdown-done', { bubbles: true }));
        }
      }, 1000);
    });
  }

  /* ---------- zakat / quick calculator ---------- */
  function initZakat(root) {
    $$('.nyx-zakat', root).filter(function (z) { return !z._nyxZ; }).forEach(function (z) {
      z._nyxZ = true;
      var amt = z.querySelector('.nyx-zakat-amount'), out = z.querySelector('.nyx-zakat-result');
      var rate = (parseFloat(z.getAttribute('data-rate')) || 2.5) / 100;
      var grp = amt && amt.closest('.nyx-input-group');
      function calc() {
        if (!amt) return;
        /* string input → keep digits + a single decimal point only */
        var clean = amt.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
        if (clean !== amt.value) amt.value = clean;
        var invalid = amt.value !== '' && isNaN(parseFloat(amt.value));
        if (grp) grp.classList.toggle('nyx-invalid', invalid);
        var v = parseFloat(amt.value) || 0;
        if (out) out.textContent = (v * rate).toLocaleString(undefined, { maximumFractionDigits: 2 });
      }
      if (amt) { amt.addEventListener('input', calc); calc(); }
    });
  }

  /* ---------- qibla compass ---------- */
  function initQibla(root) {
    $$('.nyx-qibla[data-nyx-qibla]', root).filter(function (q) { return !q._nyxQ; }).forEach(function (q) {
      q._nyxQ = true;
      var n = q.querySelector('.needle'); if (n) n.style.transform = 'rotate(' + (parseFloat(q.getAttribute('data-nyx-qibla')) || 0) + 'deg)';
    });
  }

  /* ---------- tabs ARIA (roles + roving tabindex) ---------- */
  function initTabs(root) {
    $$('[data-nyx-tabs]', root).filter(function (g) { return !g._nyxTabs; }).forEach(function (g) {
      g._nyxTabs = true; g.setAttribute('role', 'tablist');
      var tabs = $$('[data-nyx-tab]', g), scope = g.parentElement || doc;
      tabs.forEach(function (t) {
        t.setAttribute('role', 'tab');
        var on = t.classList.contains('active');
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.setAttribute('tabindex', on ? '0' : '-1');
        var key = t.getAttribute('data-nyx-tab'), panel = $('[data-nyx-panel="' + key + '"]', scope);
        if (panel) { panel.setAttribute('role', 'tabpanel'); panel.setAttribute('tabindex', '0'); }
      });
      g.addEventListener('keydown', function (e) {              // roving arrow-key focus (WAI-ARIA)
        var cur = e.target.closest('[data-nyx-tab]'), i = tabs.indexOf(cur); if (i < 0) return;
        var n = -1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = tabs.length - 1;
        if (n < 0) return;
        e.preventDefault(); activateTab(tabs[n]); tabs[n].focus();
      });
      if (g.hasAttribute('data-hash') && location.hash) {       // deep-link: activate tab from #hash
        var hit = tabs.find(function (t) { return '#' + t.getAttribute('data-nyx-tab') === location.hash; });
        if (hit) activateTab(hit);
      }
    });
  }

  /* ---------- hierarchy: collapsible tree + Miller columns ---------- */
  function initHierarchy(root) {
    $$('.nyx-hierarchy li', root).forEach(function (li) {
      var node = li.querySelector(':scope > .nyx-hierarchy-node');
      var kids = li.querySelector(':scope > ul');
      if (node && kids && !node._nyxH) {
        node._nyxH = true; node.classList.add('has-kids');
        var car = doc.createElement('span'); car.className = 'caret'; car.textContent = '▸';
        node.insertBefore(car, node.firstChild);
      }
    });
  }
  function hcolSelect(item) {
    var col = item.closest('.nyx-hcol'), wrap = item.closest('.nyx-hierarchy-cols');
    if (!col || !wrap) return;
    $$('.nyx-hitem', col).forEach(function (x) { x.classList.toggle('active', x === item); });
    var cols = $$('.nyx-hcol', wrap), idx = cols.indexOf(col);
    cols.forEach(function (c, n) { if (n > idx) c.hidden = true; });
    var tgt = item.getAttribute('data-nyx-hcol');
    if (tgt) { var t = $(tgt, wrap); if (t) t.hidden = false; }
  }

  /* ---------- prayer times: highlight the next prayer from the clock ---------- */
  function initPrayerTimes(root) {
    $$('.nyx-prayer-times[data-nyx-prayers]', root).forEach(function (wrap) {
      if (wrap._nyxP) return; wrap._nyxP = true;
      var now = new Date(), cur = now.getHours() * 60 + now.getMinutes();
      var items = $$('.nyx-prayer', wrap), pick = null;
      items.forEach(function (p) {
        var t = p.getAttribute('data-time'); if (!t) return;
        var pm = (+t.split(':')[0]) * 60 + (+t.split(':')[1]);
        if (pm >= cur && !pick) pick = p;
      });
      if (!pick && items.length) pick = items[0];
      items.forEach(function (p) { p.classList.toggle('next', p === pick); });
    });
  }

  /* images */
  function initImage(root) {
    $$('.nyx-image[data-loaded="false"] img', root).forEach(function(img) {
      var wrap = img.closest('.nyx-image');
      if (!wrap) return;
      function onL() { wrap.setAttribute('data-loaded', 'true'); }
      if (img.complete) { onL(); return; }
      if ('loading' in HTMLImageElement.prototype) {
        img.addEventListener('load', onL);
      } else {
        if (window.IntersectionObserver) {
          var io = new IntersectionObserver(function(es, ob) {
            es.forEach(function(e) { if (e.isIntersecting) { img.src = img.src; ob.disconnect(); } });
          });
          io.observe(img);
        }
        img.addEventListener('load', onL);
      }
    });
  }
  /* nav */
  function initNav(root) {
    $$('.nyx-nav .nav-toggle', root).forEach(function(btn) {
      if (btn._nyxNavInit) return;
      btn._nyxNavInit = true;
      var nav = btn.closest('.nyx-nav');
      if (!nav) return;
      var menu = nav.querySelector('.nav-links');
      btn.addEventListener('click', function() {
        var open = nav.getAttribute('data-open') === 'true';
        nav.setAttribute('data-open', !open ? 'true' : 'false');
        btn.setAttribute('aria-expanded', !open ? 'true' : 'false');
        if (!open && menu) { var a = menu.querySelector('a'); if(a) a.focus(); }
      });
      nav.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          nav.setAttribute('data-open', 'false');
          btn.setAttribute('aria-expanded', 'false');
          btn.focus();
        }
      });
    });
  }
  /* ---------- dynamic sliding indicator for pills / segmented ---------- */
  function initSliderNav(root) {
    $$('[data-nyx-slider-nav]', root).filter(function (nav) { return !nav._nyxSlNav; }).forEach(function (nav) {
      nav._nyxSlNav = true;
      var ind = doc.createElement('span'); ind.className = 'nyx-nav-indicator';
      nav.appendChild(ind);

      function update(target) {
        if (!target) {
          ind.style.opacity = '0';
          return;
        }
        ind.style.left = target.offsetLeft + 'px';
        ind.style.width = target.offsetWidth + 'px';
        ind.style.top = target.offsetTop + 'px';
        ind.style.height = target.offsetHeight + 'px';
        ind.style.opacity = '1';
      }

      var active = nav.querySelector('.active');
      if (active) update(active);

      var selector = nav.getAttribute('data-nyx-slider-nav') || '.nyx-tab, .nyx-btn, .nyx-nav-link, a';
      var items = $$(selector, nav);
      items.forEach(function (it) {
        it.addEventListener('mouseenter', function () { update(it); });
        it.addEventListener('click', function () {
          setTimeout(function () {
            active = nav.querySelector('.active') || it;
            update(active);
          }, 0);
        });
      });

      nav.addEventListener('mouseleave', function () {
        active = nav.querySelector('.active');
        update(active);
      });

      nav.addEventListener('change', function (e) {
        if (e.target && e.target.matches('input[type="radio"]')) {
          var label = e.target.closest('label') || e.target.parentElement;
          if (label) {
            $$(selector, nav).forEach(function (lbl) { lbl.classList.remove('active'); });
            label.classList.add('active');
            update(label);
          }
        }
      });
    });
  }

  /* ---------- password strength meter ---------- */
  function initPasswordStrength(root) {
    $$('.nyx-password-wrapper', root).filter(function (w) { return !w._nyxPass; }).forEach(function (w) {
      w._nyxPass = true;
      var inp = w.querySelector('input[type="password"]');
      var fill = w.querySelector('.nyx-strength-fill');
      var txt = w.querySelector('.nyx-strength-text');
      if (!inp || !fill) return;

      var isRtl = doc.documentElement.getAttribute('dir') === 'rtl';
      var labels = isRtl
        ? ['ضعيف جداً', 'ضعيف', 'متوسط', 'قوي', 'قوي جداً']
        : ['Very Weak', 'Weak', 'Medium', 'Strong', 'Very Strong'];

      inp.addEventListener('input', function () {
        var val = inp.value;
        var score = 0;
        if (val.length >= 8) score++;
        if (/[A-Z]/.test(val)) score++;
        if (/[0-9]/.test(val)) score++;
        if (/[^A-Za-z0-9]/.test(val)) score++;

        fill.className = 'nyx-strength-fill';
        if (val.length === 0) {
          fill.style.width = '0%';
          if (txt) txt.textContent = '';
          return;
        }

        fill.classList.add('strength-' + score);
        if (txt) txt.textContent = labels[score];
      });
    });
  }

  /* ---------- magnetic hover pull ---------- */
  function initMagnetic(root) {
    $$('.nyx-magnetic', root).filter(function (m) { return !m._nyxMag; }).forEach(function (m) {
      m._nyxMag = true;
      m.addEventListener('mousemove', function (e) {
        var rect = m.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;
        var dx = e.clientX - cx;
        var dy = e.clientY - cy;
        m.style.transform = 'translate(' + (dx * 0.3).toFixed(1) + 'px, ' + (dy * 0.3).toFixed(1) + 'px)';
      });
      m.addEventListener('mouseleave', function () {
        m.style.transform = 'translate(0, 0)';
      });
    });
  }

  /* ---------- luminous cursor follower ---------- */
  function initCursorFollower(root) {
    var fol = doc.querySelector('.nyx-cursor-follower');
    if (!fol || fol._nyxFol) return;
    fol._nyxFol = true;
    doc.addEventListener('mousemove', function (e) {
      fol.style.left = e.clientX + 'px';
      fol.style.top = e.clientY + 'px';
      fol.style.opacity = '1';
    });
    doc.addEventListener('mouseleave', function () {
      fol.style.opacity = '0';
    });
  }

  /* ---------- 3D tilt card ---------- */
  function initTilt(root) {
    $$('.nyx-tilt', root).filter(function (el) { return !el._nyxTilt; }).forEach(function (el) {
      el._nyxTilt = true;
      var strength = parseFloat(el.dataset.nyxTiltStrength) || 15;
      el.addEventListener('mousemove', function (e) {
        var rect = el.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width  - 0.5;  /* -0.5 → +0.5 */
        var y = (e.clientY - rect.top)  / rect.height - 0.5;
        el.style.transform = 'perspective(800px) rotateX(' + (-y * strength).toFixed(2) + 'deg) rotateY(' + (x * strength).toFixed(2) + 'deg)';
      });
      el.addEventListener('mouseleave', function () {
        el.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)';
      });
    });
  }

  /* ---------- scroll-triggered animated counter ---------- */
  function initCounter(root) {
    var els = $$('[data-nyx-count]', root).filter(function (el) { return !el._nyxCount; });
    if (!els.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        io.unobserve(el);
        el.setAttribute('data-nyx-count-done', '');
        var target  = parseFloat(el.dataset.nyxCount)  || 0;
        var suffix  = el.dataset.nyxSuffix  || '';
        var prefix  = el.dataset.nyxPrefix  || '';
        var decimals = parseInt(el.dataset.nyxDecimals, 10) || 0;
        var duration = parseInt(el.dataset.nyxDuration, 10) || 1800;
        var start = 0;
        var startTime = null;
        function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
        function step(ts) {
          if (!startTime) startTime = ts;
          var progress = Math.min((ts - startTime) / duration, 1);
          var value = start + easeOut(progress) * (target - start);
          el.textContent = prefix + value.toFixed(decimals) + suffix;
          if (progress < 1) requestAnimationFrame(step);
          else el.textContent = prefix + target.toFixed(decimals) + suffix;
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.3 });
    els.forEach(function (el) {
      el._nyxCount = true;
      el.textContent = el.dataset.nyxPrefix || '' + '0' + (el.dataset.nyxSuffix || '');
      io.observe(el);
    });
  }

  /* ---------- typewriter effect ---------- */
  function initTypewriter(root) {
    $$('.nyx-typewriter', root).filter(function (el) { return !el._nyxTW; }).forEach(function (el) {
      el._nyxTW = true;
      var text  = el.dataset.nyxText || el.textContent.trim();
      var speed = parseInt(el.dataset.nyxSpeed, 10) || 60;
      var loop  = el.hasAttribute('data-nyx-loop');
      el.textContent = '';
      var i = 0;
      function type() {
        if (i < text.length) {
          el.textContent += text[i++];
          setTimeout(type, speed);
        } else {
          el.classList.add('nyx-typing-done');
          if (loop) setTimeout(function () {
            el.textContent = '';
            el.classList.remove('nyx-typing-done');
            i = 0;
            setTimeout(type, 600);
          }, 2200);
        }
      }
      /* Start on scroll-into-view */
      var io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { io.disconnect(); type(); }
      }, { threshold: 0.5 });
      io.observe(el);
    });
  }

  /* ---------- init (idempotent) ---------- */
  function init(root) {
    root = root || doc;
    $$('[data-nyx-spy]', root).forEach(initSpy);
    $$('.nyx-table-sortable', root).forEach(initSortable);
    initReveal(root);
    initSquares(root);
    initCarousel(root);
    initAccordion(root);
    initSlider(root);
    initRange(root);
    initKanban(root);
    initCalendar(root);
    initCompare(root);
    initLightbox(root);
    initVideoFacade(root);
    initNumerals(root);
    initHierarchy(root);
    initPrayerTimes(root);
    initCombobox(root);
    initMultiselect(root);
    initDatepicker(root);
    initCountdown(root);
    initZakat(root);
    initQibla(root);
    initImage(root);
    initNav(root);
    initTabs(root);
    initSliderNav(root);
    initPasswordStrength(root);
    initMagnetic(root);
    initCursorFollower(root);
    initTilt(root);
    initCounter(root);
    initTypewriter(root);
    syncBackTop();
  }
  window.addEventListener('scroll', syncBackTop, { passive: true });
  doc.addEventListener('mousemove', function (e) {
    var shiny = e.target.closest('.nyx-shiny-btn, .nyx-shiny-card');
    if (shiny) {
      var rect = shiny.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      shiny.style.setProperty('--nyx-shiny-x', x + 'px');
      shiny.style.setProperty('--nyx-shiny-y', y + 'px');
    }
  });
  /* right-click context menus */
  doc.addEventListener('contextmenu', function (e) {
    var host = e.target.closest('[data-nyx-contextmenu]'); if (!host) return;
    var menu = el(host.getAttribute('data-nyx-contextmenu')); if (!menu) return;
    e.preventDefault();
    $$('.nyx-context-menu.open').forEach(function (m) { m.classList.remove('open'); });
    var vw = doc.documentElement.clientWidth, vh = doc.documentElement.clientHeight;
    menu.style.left = Math.min(e.clientX, vw - menu.offsetWidth - 8) + 'px';
    menu.style.top = Math.min(e.clientY, vh - menu.offsetHeight - 8) + 'px';
    menu.classList.add('open');
    var fi = menu.querySelector('.nyx-dropdown-item'); if (fi) setTimeout(function () { fi.focus(); }, 20);
  });
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { init(); });
  else init();

  return {
    version: '1.0.0',
    init: init, toast: toast,
    openModal: openModal, openDrawer: openDrawer, close: close, closeAll: closeAll,
    togglePopover: togglePopover, openCommandPalette: openCommandPalette, closeCommandPalette: closeCommandPalette,
    setTheme: setTheme, toggleTheme: toggleTheme, setDir: setDir, toggleDir: toggleDir, setAccent: setAccent,
    toArabicNumerals: toArabicNumerals, progress: progress,
    snackbar: snackbar, confirm: confirmDialog
  };
});

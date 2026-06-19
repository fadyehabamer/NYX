/*!
 * Nyx — runtime · v1.5.0 · MIT License
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
  }
  var openDrawer = openModal;

  function close(target) {
    var t = el(target); if (t) t.classList.remove('open');
    if (!currentOverlay()) { if (_backdrop) _backdrop.classList.remove('open'); lockScroll(false); releaseFocus(); }
  }
  function closeAll() {
    $$('.nyx-modal.open, .nyx-drawer.open, .nyx-sheet.open').forEach(function (n) { n.classList.remove('open'); });
    if (_backdrop) _backdrop.classList.remove('open');
    closeCommandPalette();
    lockScroll(false);
    if (!currentOverlay()) releaseFocus();
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
    if (!_lastFocus) _lastFocus = doc.activeElement;
    cp.classList.add('open'); lockScroll(true);
    var inp = cp.querySelector('input'); if (inp) setTimeout(function () { inp.focus(); }, 60);
  }
  function closeCommandPalette() {
    var cp = paletteEl(); if (cp) cp.classList.remove('open');
    if (!currentOverlay()) { lockScroll(false); releaseFocus(); }
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
      if (kind === 'sheet') { e.preventDefault(); openModal(target); return; }
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

    var hnode = e.target.closest('.nyx-hierarchy-node.has-kids');
    if (hnode) { var hli = hnode.closest('li'); if (hli) hli.classList.toggle('nyx-collapsed'); return; }
    var hitem = e.target.closest('.nyx-hierarchy-cols .nyx-hitem');
    if (hitem) { hcolSelect(hitem); return; }

    var fab = e.target.closest('.nyx-fab-btn');
    if (fab) { var f = fab.closest('.nyx-fab'); if (f) f.classList.toggle('open'); return; }
    if (e.target.closest('.nyx-to-top')) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }

    if (e.target.closest('.nyx-dropdown-item')) { closeDropdowns(); return; }
    if (!e.target.closest('.nyx-popover')) $$('.nyx-popover.open').forEach(function (o) { o.classList.remove('open'); });
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
      $$('.nyx-popover.open, .nyx-combobox.open, .nyx-multiselect.open, .nyx-datepicker.open, .nyx-fab.open, .nyx-context-menu.open').forEach(function (o) { o.classList.remove('open'); });
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
      var input = c.querySelector('input'), opts = $$('.nyx-combobox-opt', c);
      function filter() {
        var q = (input.value || '').trim().toLowerCase(), shown = 0;
        opts.forEach(function (o) { var hit = o.textContent.toLowerCase().indexOf(q) > -1; o.hidden = !hit; if (hit) shown++; });
        c.classList.toggle('empty', shown === 0);
      }
      input.addEventListener('focus', function () { c.classList.add('open'); filter(); });
      input.addEventListener('input', function () { c.classList.add('open'); filter(); });
      c.addEventListener('mousedown', function (e) {
        var o = e.target.closest('.nyx-combobox-opt'); if (!o) return;
        e.preventDefault(); input.value = o.getAttribute('data-value') || o.textContent.trim();
        c.classList.remove('open'); input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  }

  /* ---------- multi-select ---------- */
  function initMultiselect(root) {
    $$('.nyx-multiselect', root).filter(function (m) { return !m._nyxMs; }).forEach(function (m) {
      m._nyxMs = true;
      var control = m.querySelector('.nyx-multiselect-control'), input = control.querySelector('input');
      var menu = m.querySelector('.nyx-multiselect-menu');
      function valOf(o) { return o.getAttribute('data-value') || o.textContent.trim(); }
      function addChip(val, label) {
        if (control.querySelector('[data-val="' + val + '"]')) return;
        var chip = doc.createElement('span');
        chip.className = 'nyx-chip nyx-chip-accent'; chip.setAttribute('data-val', val);
        chip.innerHTML = label + ' <span class="nyx-chip-x" role="button" aria-label="remove">×</span>';
        control.insertBefore(chip, input);
      }
      control.addEventListener('click', function (e) {
        var x = e.target.closest('.nyx-chip-x');
        if (x) {
          var chip = x.closest('.nyx-chip'), v = chip.getAttribute('data-val');
          $$('.nyx-multiselect-opt', m).forEach(function (o) { if (valOf(o) === v) o.classList.remove('selected'); });
          chip.remove(); return;
        }
        m.classList.add('open'); if (input) input.focus();
      });
      if (menu) menu.addEventListener('mousedown', function (e) {
        var o = e.target.closest('.nyx-multiselect-opt'); if (!o) return; e.preventDefault();
        var on = o.classList.toggle('selected');
        if (on) addChip(valOf(o), o.textContent.trim());
        else { var ex = control.querySelector('[data-val="' + valOf(o) + '"]'); if (ex) ex.remove(); }
      });
    });
  }

  /* ---------- date picker ---------- */
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  function calMonthHtml(y, m, sel) {
    var first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
    var h = '<div class="nyx-calendar-head"><button data-cal="prev" aria-label="Previous month">‹</button><span>' + MONTHS[m] + ' ' + y + '</span><button data-cal="next" aria-label="Next month">›</button></div><div class="nyx-calendar-grid">';
    DOW.forEach(function (d) { h += '<span class="dow">' + d + '</span>'; });
    for (var i = 0; i < first; i++) h += '<span></span>';
    for (var d = 1; d <= days; d++) {
      var s = (sel && sel.y === y && sel.m === m && sel.d === d) ? ' selected' : '';
      h += '<span class="day' + s + '" data-day="' + d + '">' + d + '</span>';
    }
    return h + '</div>';
  }
  function initDatepicker(root) {
    $$('[data-nyx-datepicker]', root).filter(function (d) { return !d._nyxDp; }).forEach(function (dp) {
      dp._nyxDp = true;
      var input = dp.querySelector('input'), pop = dp.querySelector('.nyx-datepicker-pop');
      if (!pop) { pop = doc.createElement('div'); pop.className = 'nyx-datepicker-pop'; dp.appendChild(pop); }
      var cal = doc.createElement('div'); cal.className = 'nyx-calendar'; pop.appendChild(cal);
      var now = new Date(), st = { y: now.getFullYear(), m: now.getMonth(), sel: null };
      function render() { cal.innerHTML = calMonthHtml(st.y, st.m, st.sel); }
      render();
      input.addEventListener('focus', function () { dp.classList.add('open'); });
      cal.addEventListener('click', function (e) {
        var nav = e.target.closest('[data-cal]');
        if (nav) {
          st.m += nav.getAttribute('data-cal') === 'next' ? 1 : -1;
          if (st.m > 11) { st.m = 0; st.y++; } if (st.m < 0) { st.m = 11; st.y--; }
          render(); return;
        }
        var day = e.target.closest('.day[data-day]');
        if (day) {
          st.sel = { y: st.y, m: st.m, d: +day.getAttribute('data-day') };
          input.value = st.y + '-' + pad(st.m + 1) + '-' + pad(st.sel.d);
          dp.classList.remove('open'); render(); input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    });
  }

  /* ---------- back-to-top + top progress bar ---------- */
  function syncBackTop() {
    var sy = window.scrollY || doc.documentElement.scrollTop;
    $$('.nyx-to-top').forEach(function (b) { b.classList.toggle('show', sy > 320); });
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
    var u = $$('.unit b', c), h = Math.floor(diff / 3600), m = Math.floor((diff % 3600) / 60), s = diff % 60;
    if (u[0]) u[0].textContent = pad(h); if (u[1]) u[1].textContent = pad(m); if (u[2]) u[2].textContent = pad(s);
  }
  function initCountdown(root) {
    $$('.nyx-countdown[data-nyx-countdown]', root).filter(function (c) { return !c._nyxCd; }).forEach(function (c) {
      c._nyxCd = true;
      var p = c.getAttribute('data-nyx-countdown').split(':'), now = new Date();
      var target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), +p[0], +p[1] || 0, 0);
      if (target < now) target = new Date(target.getTime() + 86400000);
      c._nyxTarget = target; tickCountdown(c); setInterval(function () { tickCountdown(c); }, 1000);
    });
  }

  /* ---------- zakat / quick calculator ---------- */
  function initZakat(root) {
    $$('.nyx-zakat', root).filter(function (z) { return !z._nyxZ; }).forEach(function (z) {
      z._nyxZ = true;
      var amt = z.querySelector('.nyx-zakat-amount'), out = z.querySelector('.nyx-zakat-result');
      var rate = (parseFloat(z.getAttribute('data-rate')) || 2.5) / 100;
      function calc() { var v = parseFloat(amt.value) || 0; if (out) out.textContent = (v * rate).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
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

  /* ---------- init (idempotent) ---------- */
  function init(root) {
    root = root || doc;
    $$('[data-nyx-spy]', root).forEach(initSpy);
    $$('.nyx-table-sortable', root).forEach(initSortable);
    initReveal(root);
    initNumerals(root);
    initHierarchy(root);
    initPrayerTimes(root);
    initCombobox(root);
    initMultiselect(root);
    initDatepicker(root);
    initCountdown(root);
    initZakat(root);
    initQibla(root);
    syncBackTop();
  }
  window.addEventListener('scroll', syncBackTop, { passive: true });
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
  });
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { init(); });
  else init();

  return {
    version: '1.5.0',
    init: init, toast: toast,
    openModal: openModal, openDrawer: openDrawer, close: close, closeAll: closeAll,
    togglePopover: togglePopover, openCommandPalette: openCommandPalette, closeCommandPalette: closeCommandPalette,
    setTheme: setTheme, toggleTheme: toggleTheme, setDir: setDir, toggleDir: toggleDir, setAccent: setAccent,
    toArabicNumerals: toArabicNumerals, progress: progress
  };
});

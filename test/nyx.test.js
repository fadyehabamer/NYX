'use strict';

/*
 * Behavioural tests for the Nyx runtime.
 *
 *   npm test           (runs node --test on this file)
 *
 * The real nyx.js is loaded into a jsdom document exactly as a browser <script>
 * would run it, then the public API and the declarative components are
 * exercised. Both the authored source and the generated minified build are
 * tested, so a broken minifier is caught too.
 *
 * jsdom is a devDependency only — it is never shipped to consumers, so the
 * framework itself stays runtime-dependency-free.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const SRC = Object.fromEntries(
  ['nyx.js', 'nyx.min.js'].map((f) => [f, readFileSync(path.join(ROOT, f), 'utf8')]),
);

/*
 * Build a mount() bound to one runtime file. Each call returns a fresh, isolated
 * window with the given fixture, the runtime injected, and init() applied.
 * jsdom lacks a few browser APIs the runtime uses; minimal stubs are installed
 * before the script runs.
 */
// Some components start timers (e.g. countdown's setInterval). Track every window
// so we can close them at the end — otherwise those handles keep node --test alive.
const openWindows = [];
after(() => { for (const w of openWindows) { try { w.close(); } catch { /* ignore */ } } });

function mounter(file) {
  return function mount(body) {
    const dom = new JSDOM(`<!doctype html><html><head></head><body class="nyx">${body}</body></html>`,
      { runScripts: 'dangerously', url: 'https://localhost/', pretendToBeVisual: true });
    const { window } = dom;
    openWindows.push(window);

    // Controllable IntersectionObserver: treat everything as immediately visible.
    window.IntersectionObserver = class {
      constructor(cb) { this.cb = cb; }
      observe(el) { this.cb([{ isIntersecting: true, target: el }], this); }
      unobserve() {}
      disconnect() {}
      takeRecords() { return []; }
    };
    // jsdom has no layout, so these are inert.
    if (!window.Element.prototype.scrollIntoView) window.Element.prototype.scrollIntoView = () => {};
    const proto = window.HTMLElement.prototype;
    if (!Object.getOwnPropertyDescriptor(proto, 'innerText')) {
      Object.defineProperty(proto, 'innerText', {
        configurable: true,
        get() { return this.textContent; },
        set(v) { this.textContent = v; },
      });
    }

    const s = window.document.createElement('script');
    s.textContent = SRC[file];
    window.document.body.appendChild(s);
    // jsdom leaves readyState='loading', so the runtime deferred init() to
    // DOMContentLoaded. init() is the documented, idempotent entry point.
    if (window.Nyx && window.Nyx.init) window.Nyx.init();

    return { window, Nyx: window.Nyx, doc: window.document, de: window.document.documentElement };
  };
}

// Standard Luhn (matches the runtime's Saudi-ID checksum) — used to build test IDs.
function luhn(str) {
  let sum = 0, alt = false;
  for (let i = str.length - 1; i >= 0; i--) {
    let d = +str[i];
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d; alt = !alt;
  }
  return sum % 10 === 0;
}
function validSaudiId(prefix9) {
  for (let d = 0; d < 10; d++) if (luhn(prefix9 + d)) return prefix9 + d;
  throw new Error('no check digit found');
}

// Run the whole suite against the authored source and the minified build.
for (const file of ['nyx.js', 'nyx.min.js']) {
  const mount = mounter(file);

  describe(file, () => {

    describe('module + API surface', () => {
      let Nyx;
      before(() => { ({ Nyx } = mount('')); });
      const API = ['init', 'toast', 'openModal', 'openDrawer', 'close', 'closeAll',
        'togglePopover', 'openCommandPalette', 'closeCommandPalette', 'setTheme', 'toggleTheme',
        'setDir', 'toggleDir', 'setAccent', 'toArabicNumerals', 'toHijri', 'fromHijri',
        'formatHijri', 'qiblaBearing', 'zatcaQR', 'snackbar', 'confirm'];
      it('attaches Nyx to window', () => assert.ok(Nyx));
      it('reports its version', () => assert.match(Nyx.version, /^\d+\.\d+\.\d+$/));
      it('exposes a progress object', () => assert.equal(typeof Nyx.progress, 'object'));
      for (const k of API) it(`exposes ${k}()`, () => assert.equal(typeof Nyx[k], 'function'));
    });

    describe('pure helpers', () => {
      let Nyx;
      before(() => { ({ Nyx } = mount('')); });
      it('converts Western to Arabic-Indic numerals', () =>
        assert.equal(Nyx.toArabicNumerals('0123456789'), '٠١٢٣٤٥٦٧٨٩'));
      it('computes a qibla bearing in [0,360)', () => {
        const b = Nyx.qiblaBearing(24.7136, 46.6753);
        assert.ok(b >= 0 && b < 360);
      });
      it('encodes a ZATCA QR payload as a string', () =>
        assert.equal(typeof Nyx.zatcaQR({ seller: 'X', vatNumber: '1', total: 5, vatTotal: 1 }), 'string'));
      it('converts Gregorian → Hijri (Umm al-Qura)', () => {
        const h = Nyx.toHijri(2024, 1, 1); // numeric form avoids cross-realm instanceof
        assert.deepEqual({ y: h.y, m: h.m, d: h.d }, { y: 1445, m: 6, d: 19 });
        assert.ok(h.month);
      });
      it('round-trips Hijri → Gregorian', () => {
        const g = Nyx.fromHijri(1445, 6, 19);
        assert.deepEqual([g.getUTCFullYear(), g.getUTCMonth(), g.getUTCDate()], [2024, 0, 1]);
      });
      it('formats a Hijri date string', () => {
        const s = Nyx.formatHijri({ y: 1445, m: 6, d: 19 });
        assert.match(s, /1445/);
        assert.match(s, /هـ$/);
      });
    });

    describe('theme / direction / accent', () => {
      let Nyx, de;
      before(() => { ({ Nyx, de } = mount('')); });
      it('setTheme + toggleTheme', () => {
        Nyx.setTheme('light'); assert.equal(de.getAttribute('data-theme'), 'light');
        Nyx.toggleTheme(); assert.equal(de.getAttribute('data-theme'), 'dark');
      });
      it('setDir + toggleDir', () => {
        Nyx.setDir('rtl'); assert.equal(de.getAttribute('dir'), 'rtl');
        Nyx.toggleDir(); assert.equal(de.getAttribute('dir'), 'ltr');
      });
      it('setAccent sets a custom accent and clears the default', () => {
        Nyx.setAccent('emerald'); assert.equal(de.getAttribute('data-accent'), 'emerald');
        Nyx.setAccent('violet'); assert.equal(de.hasAttribute('data-accent'), false);
      });
    });

    describe('toast + snackbar + confirm', () => {
      let Nyx, doc;
      before(() => { ({ Nyx, doc } = mount('')); });
      it('renders a variant toast into an auto-created wrap', () => {
        const t = Nyx.toast('hello', 'success');
        assert.ok(t.classList.contains('nyx-toast'));
        assert.ok(t.classList.contains('nyx-toast-success'));
        assert.ok(doc.querySelector('.nyx-toast-wrap'));
        assert.equal(typeof t.dismiss, 'function');
      });
      it('snackbar returns an element', () =>
        assert.ok(Nyx.snackbar('saved', { action: 'Undo' }).classList.contains('nyx-snackbar')));
      it('confirm returns a Promise', () =>
        assert.equal(typeof Nyx.confirm('sure?').then, 'function'));
    });

    describe('overlays (modal/drawer/sheet)', () => {
      let Nyx, doc;
      before(() => {
        ({ Nyx, doc } = mount(`
          <button id="openBtn" data-nyx-toggle="modal" data-nyx-target="#m1">open</button>
          <div class="nyx-modal" id="m1"><div class="nyx-modal-box">
            <h3 class="nyx-modal-title">Title</h3><button data-nyx-dismiss>close</button>
          </div></div>`));
      });
      it('opens on a declarative trigger click and shows the backdrop', () => {
        doc.getElementById('openBtn').click();
        assert.ok(doc.getElementById('m1').classList.contains('open'));
        assert.ok(doc.querySelector('.nyx-overlay.open'));
      });
      it('sets dialog semantics + aria-labelledby', () => {
        const box = doc.querySelector('.nyx-modal-box');
        assert.equal(box.getAttribute('role'), 'dialog');
        assert.equal(box.getAttribute('aria-modal'), 'true');
        assert.ok(box.getAttribute('aria-labelledby'));
      });
      it('closes via the imperative API and clears the backdrop', () => {
        Nyx.close('#m1');
        assert.equal(doc.getElementById('m1').classList.contains('open'), false);
      });
      it('openModal + closeAll', () => {
        Nyx.openModal('#m1');
        assert.ok(doc.getElementById('m1').classList.contains('open'));
        Nyx.closeAll();
        assert.equal(doc.getElementById('m1').classList.contains('open'), false);
      });
    });

    describe('tabs', () => {
      let doc;
      before(() => {
        ({ doc } = mount(`
          <div data-nyx-tabs>
            <button data-nyx-tab="a" class="active">A</button>
            <button data-nyx-tab="b">B</button>
          </div>
          <div data-nyx-panel="a" class="active">A</div>
          <div data-nyx-panel="b">B</div>`));
      });
      it('assigns ARIA roles on init', () => {
        assert.equal(doc.querySelector('[data-nyx-tabs]').getAttribute('role'), 'tablist');
        assert.equal(doc.querySelector('[data-nyx-tab="a"]').getAttribute('role'), 'tab');
        assert.equal(doc.querySelector('[data-nyx-panel="a"]').getAttribute('role'), 'tabpanel');
      });
      it('activates the clicked tab and its panel', () => {
        doc.querySelector('[data-nyx-tab="b"]').click();
        assert.ok(doc.querySelector('[data-nyx-tab="b"]').classList.contains('active'));
        assert.ok(doc.querySelector('[data-nyx-panel="b"]').classList.contains('active'));
        assert.equal(doc.querySelector('[data-nyx-panel="a"]').classList.contains('active'), false);
      });
    });

    describe('accordion / collapse', () => {
      let doc;
      before(() => {
        ({ doc } = mount(`
          <div data-nyx-accordion>
            <button id="h1" data-nyx-toggle="collapse" data-nyx-target="#c1">H1</button>
            <div class="nyx-collapse" id="c1">B1</div>
            <button id="h2" data-nyx-toggle="collapse" data-nyx-target="#c2">H2</button>
            <div class="nyx-collapse" id="c2">B2</div>
          </div>`));
      });
      it('wires aria-expanded + aria-controls on init', () => {
        assert.equal(doc.getElementById('h1').getAttribute('aria-expanded'), 'false');
        assert.equal(doc.getElementById('h1').getAttribute('aria-controls'), 'c1');
      });
      it('opens a panel on click', () => {
        doc.getElementById('h1').click();
        assert.ok(doc.getElementById('c1').classList.contains('open'));
        assert.equal(doc.getElementById('h1').getAttribute('aria-expanded'), 'true');
      });
      it('single-open: opening a sibling closes the first', () => {
        doc.getElementById('h2').click();
        assert.ok(doc.getElementById('c2').classList.contains('open'));
        assert.equal(doc.getElementById('c1').classList.contains('open'), false);
      });
    });

    describe('popover', () => {
      let doc;
      before(() => {
        ({ doc } = mount(`
          <div class="nyx-popover"><button id="pt" data-nyx-toggle="popover">?</button>
          <div class="nyx-popover-content">Hi</div></div>`));
      });
      it('toggles open + aria-expanded', () => {
        doc.getElementById('pt').click();
        assert.ok(doc.querySelector('.nyx-popover').classList.contains('open'));
        assert.equal(doc.getElementById('pt').getAttribute('aria-expanded'), 'true');
        doc.getElementById('pt').click();
        assert.equal(doc.querySelector('.nyx-popover').classList.contains('open'), false);
      });
    });

    describe('dropdown', () => {
      let doc;
      before(() => {
        ({ doc } = mount(`
          <div class="nyx-dropdown"><button id="dt" data-nyx-toggle="dropdown">menu</button>
          <div class="nyx-dropdown-menu"><a class="nyx-dropdown-item" href="#">Item</a></div></div>`));
      });
      it('opens on trigger click', () => {
        doc.getElementById('dt').click();
        assert.ok(doc.querySelector('.nyx-dropdown').classList.contains('open'));
        assert.equal(doc.getElementById('dt').getAttribute('aria-expanded'), 'true');
      });
      it('closes when an item is chosen', () => {
        doc.querySelector('.nyx-dropdown-item').click();
        assert.equal(doc.querySelector('.nyx-dropdown').classList.contains('open'), false);
      });
    });

    describe('command palette', () => {
      let Nyx, doc, window;
      before(() => {
        ({ Nyx, doc, window } = mount(`
          <div class="nyx-command-palette"><div class="nyx-cp-input"><input></div>
          <div class="nyx-cp-list">
            <a class="nyx-cp-item">Dashboard</a><a class="nyx-cp-item">Settings</a>
          </div></div>`));
      });
      it('wires combobox ARIA on init', () => {
        const input = doc.querySelector('.nyx-cp-input input');
        assert.equal(input.getAttribute('role'), 'combobox');
        assert.equal(doc.querySelector('.nyx-cp-list').getAttribute('role'), 'listbox');
      });
      it('opens via the API and filters items on input', () => {
        Nyx.openCommandPalette();
        assert.ok(doc.querySelector('.nyx-command-palette').classList.contains('open'));
        const input = doc.querySelector('.nyx-cp-input input');
        input.value = 'set';
        input.dispatchEvent(new window.Event('input', { bubbles: true }));
        const items = doc.querySelectorAll('.nyx-cp-item');
        assert.equal(items[0].style.display, 'none'); // Dashboard hidden
        assert.notEqual(items[1].style.display, 'none'); // Settings shown
      });
    });

    describe('combobox', () => {
      let doc, window;
      before(() => {
        ({ doc, window } = mount(`
          <div class="nyx-combobox"><input>
          <div class="nyx-combobox-menu">
            <div class="nyx-combobox-opt">Apple</div><div class="nyx-combobox-opt">Banana</div>
          </div></div>`));
      });
      it('sets role=combobox and filters options', () => {
        const input = doc.querySelector('.nyx-combobox input');
        assert.equal(input.getAttribute('role'), 'combobox');
        input.value = 'ban';
        input.dispatchEvent(new window.Event('input', { bubbles: true }));
        const opts = doc.querySelectorAll('.nyx-combobox-opt');
        assert.equal(opts[0].hidden, true);   // Apple
        assert.equal(opts[1].hidden, false);  // Banana
      });
      it('choosing an option fills the input', () => {
        const banana = doc.querySelectorAll('.nyx-combobox-opt')[1];
        banana.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }));
        assert.equal(doc.querySelector('.nyx-combobox input').value, 'Banana');
      });
    });

    describe('multiselect', () => {
      let doc, window;
      before(() => {
        ({ doc, window } = mount(`
          <div class="nyx-multiselect"><div class="nyx-multiselect-control"><input></div>
          <div class="nyx-multiselect-menu">
            <div class="nyx-multiselect-opt">Red</div><div class="nyx-multiselect-opt">Blue</div>
          </div></div>`));
      });
      it('adds a chip + marks the option selected', () => {
        const blue = doc.querySelectorAll('.nyx-multiselect-opt')[1];
        blue.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }));
        assert.equal(blue.getAttribute('aria-selected'), 'true');
        const chip = doc.querySelector('.nyx-multiselect-control .nyx-chip');
        assert.ok(chip);
        assert.equal(chip.getAttribute('data-val'), 'Blue');
      });
    });

    describe('carousel', () => {
      let doc, window;
      before(() => {
        ({ doc, window } = mount(`
          <div class="nyx-carousel">
            <div class="nyx-slide active">1</div><div class="nyx-slide">2</div><div class="nyx-slide">3</div>
            <button data-nyx-slide="prev">‹</button><button data-nyx-slide="next">›</button>
            <div class="nyx-carousel-dots">
              <button data-nyx-slide-to="0"></button><button data-nyx-slide-to="1"></button><button data-nyx-slide-to="2"></button>
            </div>
          </div>`));
      });
      const active = () => [...doc.querySelectorAll('.nyx-slide')].findIndex((s) => s.classList.contains('active'));
      it('starts on the first slide with carousel role', () => {
        assert.equal(active(), 0);
        assert.equal(doc.querySelector('.nyx-carousel').getAttribute('aria-roledescription'), 'carousel');
      });
      it('advances on the next button', () => {
        doc.querySelector('[data-nyx-slide="next"]').click();
        assert.equal(active(), 1);
        assert.ok(doc.querySelectorAll('.nyx-carousel-dots button')[1].classList.contains('active'));
      });
      it('jumps to a slide via a dot', () => {
        doc.querySelector('[data-nyx-slide-to="2"]').click();
        assert.equal(active(), 2);
      });
      it('navigates with arrow keys', () => {
        doc.querySelector('.nyx-carousel').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
        assert.equal(active(), 1);
      });
    });

    describe('range slider + dual range', () => {
      let doc, window;
      before(() => {
        ({ doc, window } = mount(`
          <input type="range" class="nyx-slider" min="0" max="100" value="50" data-output="#out"><span id="out"></span>
          <div><div class="nyx-range">
            <input type="range" min="0" max="100" value="20"><input type="range" min="0" max="100" value="80">
          </div><span class="nyx-range-out"></span></div>`));
      });
      it('paints --nyx-slider and mirrors the value to the output', () => {
        const s = doc.querySelector('.nyx-slider');
        assert.equal(s.style.getPropertyValue('--nyx-slider'), '50');
        assert.equal(doc.getElementById('out').textContent, '50');
        s.value = '75';
        s.dispatchEvent(new window.Event('input', { bubbles: true }));
        assert.equal(doc.getElementById('out').textContent, '75');
      });
      it('paints lo/hi for the dual range', () => {
        const wrap = doc.querySelector('.nyx-range');
        assert.equal(wrap.getAttribute('data-lo'), '20');
        assert.equal(wrap.getAttribute('data-hi'), '80');
        assert.equal(doc.querySelector('.nyx-range-out').textContent, '20 – 80');
      });
    });

    describe('sortable table', () => {
      let doc;
      before(() => {
        ({ doc } = mount(`
          <table class="nyx-table-sortable"><thead><tr><th>N</th></tr></thead>
          <tbody><tr><td>3</td></tr><tr><td>1</td></tr><tr><td>2</td></tr></tbody></table>`));
      });
      it('sorts ascending then descending on header click, toggling aria-sort', () => {
        const th = doc.querySelector('thead th');
        const first = () => doc.querySelector('tbody').rows[0].cells[0].textContent;
        assert.equal(th.getAttribute('aria-sort'), 'none');
        th.click();
        assert.equal(th.getAttribute('aria-sort'), 'ascending');
        assert.equal(first(), '1');
        th.click();
        assert.equal(th.getAttribute('aria-sort'), 'descending');
        assert.equal(first(), '3');
      });
    });

    describe('stepper', () => {
      let doc;
      before(() => {
        ({ doc } = mount(`
          <div class="nyx-stepper"><button data-nyx-step="dec">-</button>
          <input value="3" min="0" max="5"><button data-nyx-step="inc">+</button></div>`));
      });
      it('clamps to max', () => {
        const inp = doc.querySelector('.nyx-stepper input');
        for (let i = 0; i < 10; i++) doc.querySelector('[data-nyx-step="inc"]').click();
        assert.equal(Number(inp.value), 5);
      });
      it('clamps to min', () => {
        const inp = doc.querySelector('.nyx-stepper input');
        for (let i = 0; i < 10; i++) doc.querySelector('[data-nyx-step="dec"]').click();
        assert.equal(Number(inp.value), 0);
      });
    });

    describe('date picker + calendar', () => {
      it('opens on focus and picks a day', () => {
        const { doc, window } = mount('<div data-nyx-datepicker><input></div>');
        const input = doc.querySelector('input');
        input.dispatchEvent(new window.FocusEvent('focus'));
        assert.ok(doc.querySelector('[data-nyx-datepicker]').classList.contains('open'));
        const day = doc.querySelector('.day[data-day]');
        assert.ok(day);
        day.click();
        assert.match(input.value, /^\d{4}-\d{2}-\d{2}$/);
        assert.equal(doc.querySelector('[data-nyx-datepicker]').classList.contains('open'), false);
      });
      it('standalone calendar emits nyx:date on day click', () => {
        const { doc } = mount('<div class="nyx-calendar" data-nyx-calendar></div>');
        const cal = doc.querySelector('.nyx-calendar');
        assert.ok(cal.querySelector('.nyx-calendar-grid'));
        let detail = null;
        cal.addEventListener('nyx:date', (e) => { detail = e.detail; });
        cal.querySelector('.day[data-day]').click();
        assert.ok(detail && typeof detail.y === 'number' && typeof detail.d === 'number');
      });
    });

    describe('regional: countdown', () => {
      it('renders zero-padded H:M:S units on init', () => {
        const { doc } = mount(`
          <div class="nyx-countdown" data-nyx-countdown="23:59">
            <span class="unit"><b></b></span><span class="unit"><b></b></span><span class="unit"><b></b></span>
          </div>`);
        const units = doc.querySelectorAll('.nyx-countdown .unit b');
        assert.equal(units.length, 3);
        for (const u of units) assert.match(u.textContent, /^\d{2}$/);
      });
    });

    describe('regional: zakat calculator', () => {
      let doc, window;
      before(() => {
        ({ doc, window } = mount(`
          <div class="nyx-zakat" data-nisab="1000">
            <input class="nyx-zakat-amount"><span class="nyx-zakat-result"></span>
          </div>`));
      });
      const setAmount = (v) => {
        const amt = doc.querySelector('.nyx-zakat-amount');
        amt.value = v;
        amt.dispatchEvent(new window.Event('input', { bubbles: true }));
      };
      it('computes 2.5% above nisab', () => {
        setAmount('10000');
        assert.equal(doc.querySelector('.nyx-zakat-result').textContent, '250');
        assert.equal(doc.querySelector('.nyx-zakat').classList.contains('nyx-below-nisab'), false);
      });
      it('is zero below nisab', () => {
        setAmount('500');
        assert.equal(doc.querySelector('.nyx-zakat-result').textContent, '0');
        assert.ok(doc.querySelector('.nyx-zakat').classList.contains('nyx-below-nisab'));
      });
    });

    describe('regional: Saudi ID / Iqama', () => {
      let doc, window;
      before(() => {
        ({ doc, window } = mount(`
          <div class="nyx-id-input"><input><span class="nyx-id-type"></span></div>`));
      });
      const type = (v) => {
        const inp = doc.querySelector('.nyx-id-input input');
        inp.value = v;
        inp.dispatchEvent(new window.Event('input', { bubbles: true }));
      };
      it('labels a citizen ID and marks a valid checksum', () => {
        const id = validSaudiId('100000000');
        type(id);
        assert.equal(doc.querySelector('.nyx-id-type').textContent, 'مواطن');
        assert.ok(doc.querySelector('.nyx-id-input').classList.contains('is-valid'));
      });
      it('labels a resident ID (leading 2)', () => {
        type('2000000000');
        assert.equal(doc.querySelector('.nyx-id-type').textContent, 'مقيم');
      });
      it('flags a bad checksum as invalid', () => {
        const good = validSaudiId('100000000');
        const bad = good.slice(0, 9) + ((Number(good[9]) + 1) % 10);
        type(bad);
        assert.ok(doc.querySelector('.nyx-id-input').classList.contains('is-invalid'));
      });
    });

    describe('regional: Hijri + Qibla', () => {
      it('fills today\'s Hijri date', () => {
        const { doc } = mount('<span data-nyx-hijri-today></span>');
        assert.match(doc.querySelector('[data-nyx-hijri-today]').textContent, /هـ$/);
      });
      it('rotates the qibla needle and labels it', () => {
        const { doc } = mount('<div class="nyx-qibla" data-coords="24.7136,46.6753"><span class="needle"></span></div>');
        assert.match(doc.querySelector('.needle').style.transform, /rotate\(-?[\d.]+deg\)/);
        assert.match(doc.querySelector('.nyx-qibla').getAttribute('aria-label'), /°/);
      });
    });

    describe('charts (a11y)', () => {
      let doc;
      before(() => {
        ({ doc } = mount(`
          <div class="nyx-chart-bars">
            <div class="nyx-bar" data-label="Jan" data-val="10"></div>
            <div class="nyx-bar" data-label="Feb" data-val="20"></div>
          </div>`));
      });
      it('gets role=img and a generated summary label', () => {
        const c = doc.querySelector('.nyx-chart-bars');
        assert.equal(c.getAttribute('role'), 'img');
        assert.match(c.getAttribute('aria-label'), /^Bar chart/);
      });
      it('makes bars keyboard-focusable', () =>
        assert.equal(doc.querySelector('.nyx-bar').getAttribute('tabindex'), '0'));
    });

    describe('media: lightbox', () => {
      it('opens on gallery image click and shows the full image', () => {
        const { doc } = mount('<div class="nyx-gallery"><img src="thumb.jpg" data-full="full.jpg"></div>');
        doc.querySelector('.nyx-gallery img').click();
        const lb = doc.querySelector('.nyx-lightbox');
        assert.ok(lb && lb.classList.contains('open'));
        assert.match(lb.querySelector('img').src, /full\.jpg$/);
      });
    });

    describe('forms: OTP + tag input + password strength + numerals', () => {
      it('auto-advances OTP inputs on entry', () => {
        const { doc, window } = mount('<div class="nyx-otp"><input><input><input></div>');
        const ins = doc.querySelectorAll('.nyx-otp input');
        ins[0].value = '5';
        ins[0].dispatchEvent(new window.Event('input', { bubbles: true }));
        assert.equal(doc.activeElement, ins[1]);
      });
      it('adds and removes tag-input chips', () => {
        const { doc, window } = mount('<div class="nyx-tag-input"><input></div>');
        const input = doc.querySelector('.nyx-tag-input input');
        input.value = 'hello';
        input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        const chip = doc.querySelector('.nyx-tag-input .nyx-chip');
        assert.ok(chip && /hello/.test(chip.textContent));
        chip.querySelector('.nyx-chip-x').click();
        assert.equal(doc.querySelector('.nyx-tag-input .nyx-chip'), null);
      });
      it('scores the password strength meter on input', () => {
        const { doc, window } = mount(`
          <div class="nyx-password-wrapper"><input type="password" id="pw">
          <div class="nyx-strength-fill"></div><div class="nyx-strength-text"></div></div>`);
        const pw = doc.getElementById('pw');
        pw.value = 'Abcd1234!';
        pw.dispatchEvent(new window.Event('input', { bubbles: true }));
        assert.match(doc.querySelector('.nyx-strength-fill').className, /strength-\d/);
        assert.ok(doc.querySelector('.nyx-strength-text').textContent.length > 0);
      });
      it('converts numerals in place without clobbering structure', () => {
        const { doc } = mount('<div data-nyx-numerals="arab"><span id="n">Total 1234 <b>ok</b></span></div>');
        assert.equal(doc.getElementById('n').textContent, 'Total ١٢٣٤ ok');
        assert.ok(doc.querySelector('#n b')); // child element preserved
      });
    });

    describe('scroll reveal', () => {
      it('marks revealed elements visible', () => {
        const { doc } = mount('<div data-nyx-reveal>hi</div>');
        const el = doc.querySelector('[data-nyx-reveal]');
        assert.ok(el.classList.contains('nyx-reveal'));
        assert.ok(el.classList.contains('nyx-in')); // IntersectionObserver stub reports visible
      });
    });
  });
}

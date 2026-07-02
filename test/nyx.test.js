'use strict';

/*
 * Behavioural tests for the Nyx runtime.
 *
 *   npm test           (runs node --test on this file)
 *
 * The real nyx.js is loaded into a jsdom document exactly as a browser <script>
 * would run it, then the public API and the declarative wiring are exercised.
 * Both the authored source and the generated minified build are tested, so a
 * broken minifier is caught too.
 *
 * jsdom is a devDependency only — it is never shipped to consumers, so the
 * framework itself stays runtime-dependency-free.
 */

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');

// A fixture rich enough to exercise the components we assert on.
const FIXTURE = `<!doctype html><html><head></head><body class="nyx">
  <button id="openBtn" data-nyx-toggle="modal" data-nyx-target="#m1">open</button>
  <div class="nyx-modal" id="m1"><div class="nyx-modal-box">
    <h3 class="nyx-modal-title">Title</h3>
    <button data-nyx-dismiss>close</button>
    <a href="#x">link</a>
  </div></div>

  <div data-nyx-tabs>
    <button data-nyx-tab="a" class="active">A</button>
    <button data-nyx-tab="b">B</button>
  </div>
  <div data-nyx-panel="a" class="active">Panel A</div>
  <div data-nyx-panel="b">Panel B</div>

  <div data-nyx-numerals="arab"><span id="num">Total 1234</span></div>

  <div class="nyx-password-wrapper">
    <input type="password" id="pw">
    <div class="nyx-strength-fill"></div>
    <div class="nyx-strength-text"></div>
  </div>

  <div class="nyx-stepper"><button data-nyx-step="dec">-</button><input value="3" min="0" max="9"><button data-nyx-step="inc">+</button></div>
</body></html>`;

/** Load a runtime file into a fresh jsdom window and return the handles. */
function load(file) {
  const src = readFileSync(path.join(ROOT, file), 'utf8');
  const dom = new JSDOM(FIXTURE, { runScripts: 'dangerously', url: 'https://localhost/', pretendToBeVisual: true });
  const { window } = dom;
  const s = window.document.createElement('script');
  s.textContent = src;
  window.document.body.appendChild(s);
  // jsdom leaves readyState='loading', so the runtime deferred init() to
  // DOMContentLoaded. init() is the documented idempotent entry point.
  if (window.Nyx && window.Nyx.init) window.Nyx.init();
  return { window, Nyx: window.Nyx, doc: window.document, de: window.document.documentElement };
}

// Run the whole suite against the authored source and the minified build.
for (const file of ['nyx.js', 'nyx.min.js']) {
  describe(file, () => {
    let window, Nyx, doc, de;
    before(() => { ({ window, Nyx, doc, de } = load(file)); });

    describe('module + API surface', () => {
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
      it('converts Western to Arabic-Indic numerals', () => {
        assert.equal(Nyx.toArabicNumerals('0123456789'), '٠١٢٣٤٥٦٧٨٩');
      });
      it('computes a qibla bearing in [0,360)', () => {
        const b = Nyx.qiblaBearing(24.7136, 46.6753);
        assert.ok(b >= 0 && b < 360);
      });
      it('encodes a ZATCA QR payload as a string', () => {
        assert.equal(typeof Nyx.zatcaQR({ seller: 'X', vatNumber: '1', total: 5, vatTotal: 1 }), 'string');
      });
      it('converts Gregorian → Hijri (Umm al-Qura)', () => {
        const h = Nyx.toHijri(2024, 1, 1); // numeric form avoids cross-realm instanceof
        assert.deepEqual({ y: h.y, m: h.m, d: h.d }, { y: 1445, m: 6, d: 19 });
        assert.ok(h.month);
      });
      it('round-trips Hijri → Gregorian', () => {
        const g = Nyx.fromHijri(1445, 6, 19);
        assert.equal(g.getUTCFullYear(), 2024);
        assert.equal(g.getUTCMonth(), 0);
        assert.equal(g.getUTCDate(), 1);
      });
    });

    describe('theme / direction / accent', () => {
      it('setTheme + toggleTheme', () => {
        Nyx.setTheme('light');
        assert.equal(de.getAttribute('data-theme'), 'light');
        Nyx.toggleTheme();
        assert.equal(de.getAttribute('data-theme'), 'dark');
      });
      it('setDir + toggleDir', () => {
        Nyx.setDir('rtl');
        assert.equal(de.getAttribute('dir'), 'rtl');
        Nyx.toggleDir();
        assert.equal(de.getAttribute('dir'), 'ltr');
      });
      it('setAccent sets a custom accent and clears the default', () => {
        Nyx.setAccent('emerald');
        assert.equal(de.getAttribute('data-accent'), 'emerald');
        Nyx.setAccent('violet');
        assert.equal(de.hasAttribute('data-accent'), false);
      });
    });

    describe('toast', () => {
      it('renders a variant toast into an auto-created wrap', () => {
        const t = Nyx.toast('hello', 'success');
        assert.ok(t.classList.contains('nyx-toast'));
        assert.ok(t.classList.contains('nyx-toast-success'));
        assert.ok(doc.querySelector('.nyx-toast-wrap'));
        assert.equal(typeof t.dismiss, 'function');
      });
    });

    describe('overlays', () => {
      it('opens on a declarative trigger click and shows the backdrop', () => {
        doc.getElementById('openBtn').click();
        assert.ok(doc.getElementById('m1').classList.contains('open'));
        assert.ok(doc.querySelector('.nyx-overlay.open'));
      });
      it('closes via the imperative API', () => {
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
      it('assigns ARIA roles on init', () => {
        assert.equal(doc.querySelector('[data-nyx-tab="a"]').getAttribute('role'), 'tab');
      });
      it('activates the clicked tab and its panel', () => {
        doc.querySelector('[data-nyx-tab="b"]').click();
        assert.ok(doc.querySelector('[data-nyx-tab="b"]').classList.contains('active'));
        assert.ok(doc.querySelector('[data-nyx-panel="b"]').classList.contains('active'));
        assert.equal(doc.querySelector('[data-nyx-panel="a"]').classList.contains('active'), false);
      });
    });

    describe('declarative wiring', () => {
      it('converts numerals in place without clobbering structure', () => {
        assert.equal(doc.getElementById('num').textContent, 'Total ١٢٣٤');
      });
      it('scores the password strength meter on input', () => {
        const pw = doc.getElementById('pw');
        pw.value = 'Abcd1234!';
        pw.dispatchEvent(new window.Event('input', { bubbles: true }));
        assert.match(doc.querySelector('.nyx-strength-fill').className, /strength-\d/);
        assert.ok(doc.querySelector('.nyx-strength-text').textContent.length > 0);
      });
      it('clamps the stepper to its max', () => {
        const wrap = doc.querySelector('.nyx-stepper');
        const inp = wrap.querySelector('input');
        for (let i = 0; i < 20; i++) wrap.querySelector('[data-nyx-step="inc"]').click();
        assert.equal(Number(inp.value), 9);
      });
    });

    describe('return types', () => {
      it('snackbar returns an element', () => {
        assert.ok(Nyx.snackbar('saved', { action: 'Undo' }).classList.contains('nyx-snackbar'));
      });
      it('confirm returns a Promise', () => {
        assert.equal(typeof Nyx.confirm('sure?').then, 'function');
      });
    });
  });
}

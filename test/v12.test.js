'use strict';
// Behavioral coverage for the v1.2 components: color picker, resizable split
// panes, affix, and the product tour. Run against both the authored runtime and
// the minified bundle so a broken minify is caught too. Radar is pure CSS, so it
// is covered by the CSS-presence block at the bottom.
const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const SRC = {
  'nyx.js': fs.readFileSync(path.join(__dirname, '..', 'src', 'nyx.js'), 'utf8'),
  'nyx.min.js': fs.readFileSync(path.join(__dirname, '..', 'dist', 'nyx.min.js'), 'utf8'),
};
const CSS = fs.readFileSync(path.join(__dirname, '..', 'src', 'nyx.css'), 'utf8');
const openWindows = [];
after(() => { for (const w of openWindows) { try { w.close(); } catch { /* ignore */ } } });

function mount(file, body) {
  const dom = new JSDOM(`<!doctype html><html><head></head><body class="nyx">${body}</body></html>`,
    { runScripts: 'dangerously', url: 'https://localhost/', pretendToBeVisual: true });
  const { window } = dom;
  openWindows.push(window);
  window.matchMedia = (q) => ({ matches: false, media: q, onchange: null, addEventListener() {}, removeEventListener() {} });
  window.HTMLElement.prototype.scrollIntoView = function () {}; // jsdom has no layout; make the tour's scroll a no-op
  const s = window.document.createElement('script');
  s.textContent = SRC[file];
  window.document.body.appendChild(s);
  if (window.Nyx && window.Nyx.init) window.Nyx.init();
  return { window, Nyx: window.Nyx, doc: window.document };
}
const mouse = (window, type, x, y) => new window.MouseEvent(type, { clientX: x || 0, clientY: y || 0, bubbles: true });

for (const file of ['nyx.js', 'nyx.min.js']) {
  describe(`color picker — ${file}`, () => {
    const markup = '<div class="nyx-colorpicker" id="cp" data-swatches="#6c63ff,#00d4aa,#zzz"><input type="color" class="nyx-color-swatch" value="#6c63ff"><input type="text" class="nyx-color-hex" value="#6C63FF"></div>';

    it('builds preset dots from data-swatches, skipping invalid hex', () => {
      const { doc } = mount(file, markup);
      const dots = doc.querySelectorAll('#cp .nyx-color-dot');
      assert.equal(dots.length, 2, '#zzz is not a valid hex and must be dropped');
      assert.equal(dots[0].getAttribute('data-color'), '#6c63ff');
    });

    it('syncs the swatch and emits nyx:color-change when the hex field changes', () => {
      const { window, doc } = mount(file, markup);
      const cp = doc.getElementById('cp'), hex = cp.querySelector('.nyx-color-hex'), sw = cp.querySelector('.nyx-color-swatch');
      let detail = null;
      cp.addEventListener('nyx:color-change', (e) => { detail = e.detail; });
      hex.value = '#ff4d6a';
      hex.dispatchEvent(new window.Event('input', { bubbles: true }));
      assert.equal(sw.value, '#ff4d6a', 'swatch mirrors the typed hex');
      assert.equal(detail && detail.value, '#ff4d6a');
    });

    it('flags .is-invalid on a malformed hex', () => {
      const { window, doc } = mount(file, markup);
      const hex = doc.querySelector('#cp .nyx-color-hex');
      hex.value = 'nope';
      hex.dispatchEvent(new window.Event('input', { bubbles: true }));
      assert.ok(hex.classList.contains('is-invalid'));
    });

    it('selects the matching preset dot when a value is applied', () => {
      const { window, doc } = mount(file, markup);
      const cp = doc.getElementById('cp'), dot = cp.querySelector('.nyx-color-dot[data-color="#00d4aa"]');
      dot.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      assert.ok(dot.classList.contains('selected'));
      assert.equal(cp.querySelector('.nyx-color-hex').value, '#00D4AA');
    });
  });

  describe(`split panes — ${file}`, () => {
    const markup = '<div class="nyx-split" id="sp"><div class="nyx-split-pane">A</div><div class="nyx-split-bar" id="bar"></div><div class="nyx-split-pane">B</div></div>';

    it('gives the bar separator semantics', () => {
      const { doc } = mount(file, markup);
      const bar = doc.getElementById('bar');
      assert.equal(bar.getAttribute('role'), 'separator');
      assert.equal(bar.getAttribute('tabindex'), '0');
      assert.equal(bar.getAttribute('aria-orientation'), 'vertical');
      assert.ok(bar.hasAttribute('aria-valuenow'));
    });

    it('keyboard resize updates aria-valuenow and fires nyx:split-resize', () => {
      const { window, doc } = mount(file, markup);
      const sp = doc.getElementById('sp'), bar = doc.getElementById('bar');
      let fired = false;
      sp.addEventListener('nyx:split-resize', () => { fired = true; });
      bar.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      assert.ok(fired, 'ArrowRight should resize');
      assert.ok(/^\d+$/.test(bar.getAttribute('aria-valuenow')));
    });

    it('a pointer drag does not throw and toggles the dragging class', () => {
      const { window, doc } = mount(file, markup);
      const sp = doc.getElementById('sp'), bar = doc.getElementById('bar');
      bar.dispatchEvent(mouse(window, 'pointerdown', 100, 0));
      assert.ok(sp.classList.contains('nyx-dragging'));
      doc.dispatchEvent(mouse(window, 'pointermove', 140, 0));
      doc.dispatchEvent(mouse(window, 'pointerup', 140, 0));
      assert.ok(!sp.classList.contains('nyx-dragging'), 'pointerup ends the drag');
    });
  });

  describe(`affix — ${file}`, () => {
    it('applies the affix class and the top offset from data-affix-top', () => {
      const { doc } = mount(file, '<div id="af" data-nyx-affix data-affix-top="80">x</div>');
      const af = doc.getElementById('af');
      assert.ok(af.classList.contains('nyx-affix'));
      assert.equal(af.style.getPropertyValue('--nyx-affix-top'), '80px');
    });
  });

  describe(`product tour — ${file}`, () => {
    const markup = '<button id="go" data-nyx-tour="#scope">tour</button><div id="scope">'
      + '<span data-nyx-tour-step="1" data-title="One" data-text="First stop">a</span>'
      + '<span data-nyx-tour-step="2" data-title="Two" data-text="Second stop">b</span></div>';

    it('a data-nyx-tour trigger opens the overlay on the first step', () => {
      const { window, doc } = mount(file, markup);
      let started = false;
      doc.documentElement.addEventListener('nyx:tour-start', () => { started = true; });
      doc.getElementById('go').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      const pop = doc.querySelector('.nyx-tour-overlay .nyx-tour-pop');
      assert.ok(pop, 'overlay + coachmark are created');
      assert.ok(started);
      assert.equal(pop.querySelector('.nyx-tour-pop-title').textContent, 'One');
      assert.equal(pop.querySelector('.nyx-tour-step').textContent, '1 / 2');
    });

    it('Next advances and the final Done tears the overlay down', () => {
      const { window, doc } = mount(file, markup);
      let ended = null;
      doc.documentElement.addEventListener('nyx:tour-end', (e) => { ended = e.detail; });
      doc.getElementById('go').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      const next = () => doc.querySelector('[data-nyx-tour-next]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      next(); // → step 2
      assert.equal(doc.querySelector('.nyx-tour-pop-title').textContent, 'Two');
      next(); // Done
      assert.equal(doc.querySelector('.nyx-tour-overlay'), null, 'overlay removed after the last step');
      assert.equal(ended && ended.reason, 'done');
    });

    it('Nyx.tour() drives an imperative tour and returns a handle', () => {
      const { doc, Nyx } = mount(file, markup);
      const t = Nyx.tour([{ target: '#scope', title: 'Hi', text: 'yo' }]);
      assert.ok(t && typeof t.stop === 'function');
      assert.ok(doc.querySelector('.nyx-tour-overlay'));
      t.stop();
      assert.equal(doc.querySelector('.nyx-tour-overlay'), null);
    });

    it('Escape ends the tour', () => {
      const { window, doc } = mount(file, markup);
      doc.getElementById('go').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      assert.equal(doc.querySelector('.nyx-tour-overlay'), null);
    });
  });
}

describe('v1.2 CSS additions are present in nyx.css', () => {
  for (const sel of ['.nyx-colorpicker', '.nyx-color-swatch', '.nyx-color-dot',
    '.nyx-chart-radar', '.nyx-radar-area', '.nyx-radar-grid',
    '.nyx-tour-overlay', '.nyx-tour-spot', '.nyx-tour-pop',
    '.nyx-split', '.nyx-split-bar', '.nyx-split-v', '.nyx-affix']) {
    it(`defines ${sel}`, () => { assert.ok(CSS.includes(sel + '{') || CSS.includes(sel + ' ') || CSS.includes(sel + '>') || CSS.includes(sel + '.') || CSS.includes(sel + ','), `${sel} missing`); });
  }
  it('affix exposes an .is-pinned hook', () => { assert.ok(CSS.includes('.nyx-affix.is-pinned')); });
  it('radar supports a second .alt series', () => { assert.ok(CSS.includes('.nyx-radar-area.alt')); });
});

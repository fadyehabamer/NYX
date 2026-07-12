'use strict';

/*
 * Phase A behavioural + presence tests: stepper a11y upgrade, watermark painter,
 * and the CSS-only additions (descriptions, result, ribbon, masonry, area chart).
 * JS is exercised in jsdom (both authored + minified builds); CSS-only components
 * are asserted present in the authored nyx.css source.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const CSS = readFileSync(path.join(ROOT, 'src', 'nyx.css'), 'utf8');
const SRC = Object.fromEntries(
  ['nyx.js', 'nyx.min.js'].map((f) => [f, readFileSync(path.join(ROOT, f === 'nyx.js' ? 'src' : 'dist', f), 'utf8')]),
);

const openWindows = [];
after(() => { for (const w of openWindows) { try { w.close(); } catch { /* ignore */ } } });

function mounter(file) {
  return function mount(body) {
    const dom = new JSDOM(`<!doctype html><html><head></head><body class="nyx">${body}</body></html>`,
      { runScripts: 'dangerously', url: 'https://localhost/', pretendToBeVisual: true });
    const { window } = dom;
    openWindows.push(window);
    window.IntersectionObserver = class { constructor(cb) { this.cb = cb; } observe(el) { this.cb([{ isIntersecting: true, target: el }], this); } unobserve() {} disconnect() {} takeRecords() { return []; } };
    const s = window.document.createElement('script');
    s.textContent = SRC[file];
    window.document.body.appendChild(s);
    if (window.Nyx && window.Nyx.init) window.Nyx.init();
    return { window, Nyx: window.Nyx, doc: window.document };
  };
}

const STEPPER = '<div class="nyx-stepper"><button data-nyx-step="dec">−</button>'
  + '<input value="3" min="0" max="5" step="1"><button data-nyx-step="inc">+</button></div>';

for (const file of ['nyx.js', 'nyx.min.js']) {
  const mount = mounter(file);

  describe(`stepper a11y — ${file}`, () => {
    it('sets spinbutton role + aria bounds on init', () => {
      const { doc } = mount(STEPPER);
      const inp = doc.querySelector('.nyx-stepper input');
      assert.equal(inp.getAttribute('role'), 'spinbutton');
      assert.equal(inp.getAttribute('aria-valuemin'), '0');
      assert.equal(inp.getAttribute('aria-valuemax'), '5');
      assert.equal(inp.getAttribute('aria-valuenow'), '3');
    });

    it('+/- buttons increment/decrement, sync aria, and clamp to max', () => {
      const { doc } = mount(STEPPER);
      const inp = doc.querySelector('.nyx-stepper input');
      const events = [];
      inp.addEventListener('nyx:stepper-change', (e) => events.push(e.detail));
      const inc = doc.querySelector('[data-nyx-step="inc"]');
      inc.click(); // 3 -> 4
      assert.equal(inp.value, '4');
      assert.equal(inp.getAttribute('aria-valuenow'), '4');
      inc.click(); // 4 -> 5
      inc.click(); // clamp at max 5
      assert.equal(inp.value, '5');
      assert.deepEqual(events.map((d) => d.value), [4, 5, 5]);
    });

    it('respects a custom step and ArrowUp/ArrowDown keys', () => {
      const { doc, window } = mount('<div class="nyx-stepper"><input value="0" step="0.5"><button data-nyx-step="inc">+</button></div>');
      const inp = doc.querySelector('.nyx-stepper input');
      const up = new window.KeyboardEvent('keydown', { key: 'ArrowUp' });
      inp.dispatchEvent(up);
      assert.equal(inp.value, '0.5');
      const down = new window.KeyboardEvent('keydown', { key: 'ArrowDown' });
      inp.dispatchEvent(down);
      assert.equal(inp.value, '0');
    });

    it('labels the buttons for screen readers', () => {
      const { doc } = mount(STEPPER);
      assert.equal(doc.querySelector('[data-nyx-step="dec"]').getAttribute('aria-label'), 'Decrease');
      assert.equal(doc.querySelector('[data-nyx-step="inc"]').getAttribute('aria-label'), 'Increase');
    });
  });

  describe(`watermark — ${file}`, () => {
    it('paints a tiled SVG layer carrying the data-text', () => {
      const { doc } = mount('<div class="nyx-watermark" data-text="CONFIDENTIAL"><p>body</p></div>');
      const layer = doc.querySelector('.nyx-watermark > .nyx-watermark-layer');
      assert.ok(layer, 'layer created');
      const bg = layer.style.backgroundImage;
      assert.match(bg, /^url\("data:image\/svg\+xml,/);
      assert.match(decodeURIComponent(bg), /CONFIDENTIAL/);
    });

    it('is idempotent — re-init does not stack layers', () => {
      const { doc, Nyx } = mount('<div class="nyx-watermark" data-text="DRAFT"><p>x</p></div>');
      Nyx.init();
      assert.equal(doc.querySelectorAll('.nyx-watermark-layer').length, 1);
    });
  });
}

describe('Phase A CSS additions are present in nyx.css', () => {
  const needles = [
    '.nyx-descriptions', '.nyx-desc-label', '.nyx-desc-value',
    '.nyx-result', '.nyx-result-icon', '.nyx-result-actions',
    '.nyx-ribbon', '.nyx-ribbon-start',
    '.nyx-masonry', '.nyx-chart-area', '.nyx-watermark-layer',
  ];
  for (const n of needles) {
    it(`defines ${n}`, () => { assert.ok(CSS.includes(n), `${n} missing from nyx.css`); });
  }
  it('result icon glyphs are status-driven', () => {
    assert.match(CSS, /data-status="success"\] \.nyx-result-icon::before\{content:"✓"/);
    assert.match(CSS, /data-status="404"\] \.nyx-result-icon::before\{content:"404"/);
  });
  it('ribbon mirrors its angle under RTL', () => {
    assert.match(CSS, /\[dir="rtl"\] \.nyx-ribbon::before\{transform:rotate\(-45deg\)\}/);
  });
});

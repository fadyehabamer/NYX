'use strict';
// Regression tests for the shipped artifacts — the files consumers actually load.
// Every case here corresponds to a defect that was live in a published build and was
// invisible to the existing suite, because nothing tested dist/ as opposed to src/.
const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const src = read('src/nyx.css');
const min = read('dist/nyx.min.css');

describe('dist/nyx.min.css — the CDN artifact', () => {
  // The minifier trimmed whitespace around ':' to compress `min-width: 640px`. But ':' also
  // begins every pseudo-class, so the space before one — a descendant combinator — was eaten:
  // `body.nyx :focus-visible` shipped as `body.nyx:focus-visible`, which matches <body>
  // itself rather than its focused descendant. Result: no focus ring anywhere on the CDN
  // build, and no .nyx-prose typography. WCAG 2.4.7, in the primary distribution file.
  const combinatorSelectors = [
    'body.nyx :focus-visible',
    '.nyx-root :focus-visible',
    'body.nyx ::selection',
    'body.nyx ::-webkit-scrollbar',
    'body.nyx ::-webkit-scrollbar-thumb',
    '.nyx-prose :where(',
  ];

  for (const sel of combinatorSelectors) {
    it(`preserves the descendant combinator in "${sel}"`, () => {
      assert.ok(min.includes(sel), `"${sel}" is missing from dist/nyx.min.css`);
      assert.ok(!min.includes(sel.replace(' ', '')),
        `"${sel}" was minified to "${sel.replace(' ', '')}" — the combinator was eaten`);
    });
  }

  it('still compresses declarations and media features', () => {
    assert.ok(min.includes('@media(min-width:640px)'), 'media feature not compressed');
    assert.ok(!/[;{][-a-z]+: /.test(min), 'a declaration kept a space after its colon');
  });

  it('parses to exactly the same rule count as the source', () => {
    const count = (css) => {
      const dom = new JSDOM(`<!doctype html><html><head><style>${css}</style></head><body></body></html>`);
      let n = 0;
      const walk = (rules) => { for (const r of rules) { n++; if (r.cssRules) walk(r.cssRules); } };
      walk(dom.window.document.styleSheets[0].cssRules);
      dom.window.close();
      return n;
    };
    assert.equal(count(min), count(src), 'minification changed the rule count');
  });

  it('does not force a border-radius on every focused element', () => {
    // The global focus rule outranks each component's own radius, so a border-radius here
    // squared off all 64 circular/pill elements (FAB, back-to-top, dots, avatars) on focus.
    const rule = /body\.nyx :focus-visible\{[^}]*\}/.exec(min);
    assert.ok(rule, 'focus rule not found');
    assert.ok(!rule[0].includes('border-radius'), 'focus ring must not restyle element shape');
  });
});

describe('dist/components/*.css — the à-la-carte modules', () => {
  const manifest = JSON.parse(read('dist/manifest.json'));
  const modules = fs.readdirSync(path.join(root, 'dist', 'components'))
    .filter((f) => f.endsWith('.css') && f !== 'nyx.bundle.css');

  it('ships every class that is in the bundle', () => {
    // Descriptive sub-banners ("3D Tilt Card") map to no module file. The splitter used to
    // return early on them, dropping their rules from every module while leaving them in
    // the bundle — .nyx-tilt / .nyx-typewriter / .nyx-glitch shipped nowhere à la carte.
    const all = modules.map((f) => read(`dist/components/${f}`)).join('\n');
    const missing = manifest.classes
      .map((c) => c.name)
      .filter((n) => !all.includes('.' + n.replace(':', '\\:')));
    assert.deepEqual(missing, [], `classes present in the bundle but in no module: ${missing.join(', ')}`);
  });

  it('covers the sub-banner components specifically', () => {
    const enhancements = read('dist/components/enhancements.css');
    for (const c of ['nyx-tilt', 'nyx-tilt-layer', 'nyx-typewriter', 'nyx-typing-done', 'nyx-glitch']) {
      assert.ok(enhancements.includes('.' + c), `${c} missing from enhancements.css`);
    }
  });
});

describe('package entry points — loadable without a DOM', () => {
  // The UMD factory runs eagerly, so module scope must not touch `document`: every SSR
  // framework and every plain `require()` evaluates this file with no DOM. It used to throw
  // ReferenceError, which also made the DOM-free helpers unreachable server-side.
  const entries = ['../src/nyx.js', '../dist/nyx.min.js'];

  for (const entry of entries) {
    it(`require('${entry}') does not throw and exports the API`, () => {
      assert.equal(typeof document, 'undefined', 'this test is only meaningful with no global DOM');
      const Nyx = require(entry);
      assert.equal(typeof Nyx.version, 'string');
      assert.equal(typeof Nyx.init, 'function');
    });
  }

  it('the DOM-free helpers actually work server-side', () => {
    const Nyx = require('../src/nyx.js');
    assert.equal(Nyx.toArabicNumerals('2026'), '٢٠٢٦');
    assert.ok(Math.abs(Nyx.qiblaBearing(30.0444, 31.2357) - 136.14) < 0.5, 'Cairo qibla bearing');
    assert.match(Nyx.zatcaQR({ seller: 'شركة', vatNumber: '300000000000003' }), /^[A-Za-z0-9+/=]+$/);
    const h = Nyx.toHijri(new Date(Date.UTC(2026, 6, 21)));
    assert.ok(h.y > 1400 && h.m >= 1 && h.m <= 12, 'plausible Hijri date');
  });

  it('every DOM-driven method no-ops instead of throwing', () => {
    const Nyx = require('../src/nyx.js');
    const calls = {
      init: [], closeAll: [], close: ['#x'], openModal: ['#x'], openDrawer: ['#x'],
      togglePopover: ['#x'], openCommandPalette: [], closeCommandPalette: [], showTab: ['#x'],
      toggleCollapse: ['#x'], toggleDropdown: ['#x'], getInstance: ['#x'], getOrCreateInstance: ['#x'],
      carousel: ['#x'], position: ['#a', '#b'], setTheme: ['dark'], toggleTheme: [], setDir: ['rtl'],
      toggleDir: [], setAccent: ['rose'], toast: ['hi'], snackbar: ['hi'],
    };
    for (const [name, args] of Object.entries(calls)) {
      assert.doesNotThrow(() => Nyx[name](...args), `Nyx.${name}() threw with no DOM`);
    }
    assert.doesNotThrow(() => { Nyx.progress.start(); Nyx.progress.set(50); Nyx.progress.done(); });
  });
});

describe('init() fault isolation', () => {
  const windows = [];
  after(() => { for (const w of windows) { try { w.close(); } catch { /* ignore */ } } });

  const mount = (body) => {
    const dom = new JSDOM(`<!doctype html><html><body class="nyx">${body}</body></html>`,
      { runScripts: 'dangerously', url: 'https://nyx.test/', pretendToBeVisual: true });
    const { window } = dom;
    windows.push(window);
    window.matchMedia = (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
    const s = window.document.createElement('script');
    s.textContent = read('src/nyx.js');
    window.document.body.appendChild(s);
    return window;
  };

  // init() is a flat run of ~43 behaviours. A widget missing a control it expects used to
  // throw straight out of it, so every behaviour registered after that point never ran —
  // one malformed combobox silently disabled half the page.
  const malformed = {
    'combobox with no input': '<div class="nyx-combobox"><div class="nyx-combobox-menu"></div></div>',
    'multiselect with no control': '<div class="nyx-multiselect"><div class="nyx-multiselect-menu"></div></div>',
    'datepicker with no input': '<div data-nyx-datepicker></div>',
  };

  for (const [label, html] of Object.entries(malformed)) {
    it(`a ${label} does not stop later behaviours`, () => {
      const w = mount(`${html}<span data-nyx-hijri-today></span>`);
      assert.doesNotThrow(() => w.Nyx.init(), 'init() threw');
      const today = w.document.querySelector('[data-nyx-hijri-today]').textContent;
      assert.ok(today && today.trim().length > 0,
        'a behaviour registered after the malformed widget never ran');
    });
  }

  it('a behaviour that throws is contained and reported, not fatal', () => {
    const w = mount('<span data-nyx-hijri-today></span>');
    const errors = [];
    w.console.error = (...a) => errors.push(String(a[0]));
    // Force a failure inside one step by poisoning an element the sortable behaviour touches.
    const table = w.document.createElement('table');
    table.className = 'nyx-table-sortable';
    Object.defineProperty(table, 'tBodies', { get() { throw new Error('boom'); } });
    w.document.body.appendChild(table);
    assert.doesNotThrow(() => w.Nyx.init(), 'a throwing behaviour must not escape init()');
    assert.ok(errors.some((e) => e.includes('[nyx] behaviour failed')), 'the failure should be reported');
    assert.ok(w.document.querySelector('[data-nyx-hijri-today]').textContent.trim().length > 0,
      'later behaviours still ran');
  });
});

'use strict';
// Regression tests for the correctness + security defects found in the 2026-07 audit
// (notes/AUDIT-2026-07.md). Each case failed against the code as shipped in v1.1.0.
const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const SRC = {
  'nyx.js': fs.readFileSync(path.join(root, 'src', 'nyx.js'), 'utf8'),
  'nyx.min.js': fs.readFileSync(path.join(root, 'dist', 'nyx.min.js'), 'utf8'),
};
const windows = [];
after(() => { for (const w of windows) { try { w.close(); } catch { /* ignore */ } } });

function mount(file, body) {
  const dom = new JSDOM(`<!doctype html><html><body class="nyx">${body}</body></html>`,
    { runScripts: 'dangerously', url: 'https://nyx.test/', pretendToBeVisual: true });
  const { window } = dom;
  windows.push(window);
  window.matchMedia = (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  const s = window.document.createElement('script');
  s.textContent = SRC[file];
  window.document.body.appendChild(s);
  if (window.Nyx && window.Nyx.init) window.Nyx.init();
  return window;
}
const click = (w, node) => node.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const key = (w, node, k) => node.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true }));

describe('fromHijri — Umm al-Qura convergence', () => {
  const Nyx = require('../src/nyx.js');
  const umalqura = (d) => new Intl.DateTimeFormat('en-u-ca-islamic-umalqura',
    { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(d);

  // The correction rounds to exactly 0 across a Hijri year rollover (30/12/1443 → 1/1/1444
  // gives -0.17), which stalled the loop and returned the seed date — putting 1 Muharram a
  // day early in 4 of 10 consecutive years, the most visible date this API is ever asked for.
  it('lands on 1 Muharram for ten consecutive years', () => {
    for (let hy = 1444; hy <= 1453; hy++) {
      const d = Nyx.fromHijri(hy, 1, 1);
      assert.ok(umalqura(d).includes(`1/1/${hy}`),
        `fromHijri(${hy},1,1) → ${d.toISOString().slice(0, 10)} is ${umalqura(d)}, not 1 Muharram ${hy}`);
    }
  });

  it('round-trips every day of a decade without drift', () => {
    let mismatches = 0;
    for (let t = Date.UTC(2020, 0, 1); t < Date.UTC(2030, 0, 1); t += 86400000) {
      const d = new Date(t), h = Nyx.toHijri(d);
      if (Nyx.fromHijri(h.y, h.m, h.d).toISOString().slice(0, 10) !== d.toISOString().slice(0, 10)) mismatches++;
    }
    assert.equal(mismatches, 0, `${mismatches} dates failed to round-trip`);
  });
});

describe('zatcaQR — TLV encoding', () => {
  const Nyx = require('../src/nyx.js');

  it('names the offending field instead of throwing an opaque DOMException', () => {
    // A single-byte TLV length caps a field at 255 bytes. Arabic is 2 bytes/char, so a
    // ~128-character legal entity name overflowed it and surfaced from btoa as
    // "Invalid character", pointing nowhere near the cause.
    assert.throws(() => Nyx.zatcaQR({ seller: 'ش'.repeat(200) }), (e) =>
      e instanceof RangeError && /seller is 400 UTF-8 bytes/.test(e.message));
  });

  it('encodes length in UTF-8 bytes, not string length', () => {
    const b64 = Nyx.zatcaQR({ seller: 'شركة' });               // 4 chars, 8 UTF-8 bytes
    const bytes = Buffer.from(b64, 'base64');
    assert.equal(bytes[0], 1, 'first tag should be 1 (seller)');
    assert.equal(bytes[1], 8, 'length must be the byte length, not the character count');
  });

  it('still produces a payload for a normal invoice', () => {
    const b64 = Nyx.zatcaQR({
      seller: 'شركة الاختبار', vatNumber: '300000000000003',
      timestamp: '2026-07-21T11:00:00Z', total: '115.00', vatTotal: '15.00',
    });
    assert.match(b64, /^[A-Za-z0-9+/=]+$/);
    assert.equal(Buffer.from(b64, 'base64')[0], 1);
  });
});

for (const file of ['nyx.js', 'nyx.min.js']) {
  describe(`${file} — dropdown close lifecycle`, () => {
    const DD = '<div class="nyx-dropdown" id="d"><button data-nyx-toggle="dropdown">t</button>'
      + '<div class="nyx-dropdown-menu"><a class="nyx-dropdown-item" href="#">i</a></div></div><p id="out">x</p>';

    // Only toggleDropdown emitted events, but every realistic close route bypassed it and
    // stripped the class directly — so the documented dropdown events never fired in use.
    const paths = {
      'an outside click': (w) => click(w, w.document.getElementById('out')),
      'an item click': (w) => click(w, w.document.querySelector('.nyx-dropdown-item')),
      'Escape': (w) => key(w, w.document.body, 'Escape'),
    };

    for (const [label, act] of Object.entries(paths)) {
      it(`fires the lifecycle on ${label}`, () => {
        const w = mount(file, DD);
        const d = w.document.getElementById('d'), seen = [];
        ['before-hide', 'hide'].forEach((n) => d.addEventListener('nyx:dropdown-' + n, () => seen.push(n)));
        w.Nyx.toggleDropdown('#d');
        assert.ok(d.classList.contains('open'), 'precondition: dropdown open');
        act(w);
        assert.deepEqual(seen, ['before-hide', 'hide'], 'close must emit the documented pair');
        assert.ok(!d.classList.contains('open'), 'dropdown should be closed');
        assert.equal(d.querySelector('[data-nyx-toggle]').getAttribute('aria-expanded'), 'false');
      });
    }

    it('honors preventDefault() on nyx:dropdown-before-hide', () => {
      const w = mount(file, DD);
      const d = w.document.getElementById('d');
      d.addEventListener('nyx:dropdown-before-hide', (e) => e.preventDefault());
      w.Nyx.toggleDropdown('#d');
      click(w, w.document.getElementById('out'));
      assert.ok(d.classList.contains('open'), 'a vetoed close must leave the dropdown open');
    });
  });

  describe(`${file} — popover sibling auto-close`, () => {
    it('closing a sibling emits the full lifecycle', () => {
      const w = mount(file, '<div class="nyx-popover" id="p1"><button data-nyx-toggle="popover">a</button><div class="nyx-pop">A</div></div>'
        + '<div class="nyx-popover" id="p2"><button data-nyx-toggle="popover">b</button><div class="nyx-pop">B</div></div>');
      const p1 = w.document.getElementById('p1'), seen = [];
      ['before-hide', 'hide'].forEach((n) => p1.addEventListener('nyx:popover-' + n, () => seen.push(n)));
      w.Nyx.togglePopover('#p1', true);
      w.Nyx.togglePopover('#p2', true);
      assert.deepEqual(seen, ['before-hide', 'hide'], 'the displaced popover must emit its pair');
      assert.ok(!p1.classList.contains('open'));
    });
  });

  describe(`${file} — applyInert scope`, () => {
    const MODAL = '<div class="nyx-modal" id="m"><div class="nyx-modal-box"><h3>T</h3><button id="in">ok</button></div></div>';

    // `inert` inherits. Testing "is this body child an overlay" rather than "does it contain
    // one" inerted the wrapper every SPA renders into — trapping the user in a dialog that
    // had already taken focus and locked scroll.
    it('does not inert an ancestor of the open modal', () => {
      const w = mount(file, `<main id="app"><button id="outside">x</button>${MODAL}</main>`);
      w.Nyx.openModal('#m');
      assert.ok(!w.document.getElementById('app').hasAttribute('inert'),
        'the wrapper containing the modal must stay interactive');
    });

    it('still inerts real background siblings', () => {
      const w = mount(file, `<div id="sib">bg</div>${MODAL}`);
      w.Nyx.openModal('#m');
      assert.ok(w.document.getElementById('sib').hasAttribute('inert'), 'background must be inert');
      assert.ok(!w.document.getElementById('m').hasAttribute('inert'), 'the modal must not be');
    });

    it('clears every inert marker on close', () => {
      const w = mount(file, `<div id="sib">bg</div>${MODAL}`);
      w.Nyx.openModal('#m');
      w.Nyx.close('#m');
      assert.equal(w.document.querySelectorAll('[data-nyx-inert]').length, 0);
    });
  });

  describe(`${file} — video facade URL scheme`, () => {
    // data-embed is page data; on a CMS-backed site it is user-supplied. An <iframe> on a
    // javascript: URL executes in the embedding origin, and the appended ?autoplay=1 does
    // not neuter it — a trailing // comments the suffix out.
    for (const [label, url] of Object.entries({
      'javascript:': 'javascript:alert(document.domain)//',
      'data:': 'data:text/html,<script>alert(1)</script>',
      'vbscript:': 'vbscript:msgbox(1)',
    })) {
      it(`refuses to frame a ${label} URL`, () => {
        const w = mount(file, `<div class="nyx-video" id="v" data-embed="${url}"><img src="p.jpg"></div>`);
        const v = w.document.getElementById('v');
        click(w, v);
        assert.equal(v.querySelector('iframe'), null, `${label} must not be framed`);
      });
    }

    it('frames an https embed and adds autoplay', () => {
      const w = mount(file, '<div class="nyx-video" id="v" data-embed="https://www.youtube.com/embed/abc?rel=0"><img src="p.jpg"></div>');
      const v = w.document.getElementById('v');
      click(w, v);
      const ifr = v.querySelector('iframe');
      assert.ok(ifr, 'a valid embed should still play');
      assert.match(ifr.src, /^https:\/\/www\.youtube\.com\/embed\/abc\?/);
      assert.match(ifr.src, /autoplay=1/);
      assert.match(ifr.src, /rel=0/, 'existing query params must survive');
    });
  });

  describe(`${file} — data-nyx-dismiss scope`, () => {
    it('closes its own overlay, not the stack beneath it', () => {
      const w = mount(file, '<div class="nyx-modal" id="a"><div class="nyx-modal-box"><h3>A</h3></div></div>'
        + '<div class="nyx-drawer" id="b"><h3>B</h3><button data-nyx-dismiss id="x">close</button></div>');
      w.Nyx.openModal('#a');
      w.Nyx.openDrawer('#b');
      click(w, w.document.getElementById('x'));
      assert.ok(!w.document.getElementById('b').classList.contains('open'), 'own overlay should close');
      assert.ok(w.document.getElementById('a').classList.contains('open'), 'the one underneath must stay open');
    });
  });
}

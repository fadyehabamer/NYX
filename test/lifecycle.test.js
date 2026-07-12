'use strict';
// Regression tests for the code-review fixes: cancelable-lifecycle settle timing
// (afterTransition must fire on a direct child's @keyframes animationend, not just
// the 400ms fallback) and the instance-API footgun / dispose-key fixes.
const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const SRC = {
  'nyx.js': fs.readFileSync(path.join(__dirname, '..', 'src', 'nyx.js'), 'utf8'),
  'nyx.min.js': fs.readFileSync(path.join(__dirname, '..', 'dist', 'nyx.min.js'), 'utf8'),
};
const openWindows = [];
after(() => { for (const w of openWindows) { try { w.close(); } catch { /* ignore */ } } });

function mount(file, body) {
  const dom = new JSDOM(`<!doctype html><html><head></head><body class="nyx">${body}</body></html>`,
    { runScripts: 'dangerously', url: 'https://localhost/', pretendToBeVisual: true });
  const { window } = dom;
  openWindows.push(window);
  window.matchMedia = (q) => ({ matches: false, media: q, onchange: null, addEventListener() {}, removeEventListener() {} });
  const s = window.document.createElement('script');
  s.textContent = SRC[file];
  window.document.body.appendChild(s);
  if (window.Nyx && window.Nyx.init) window.Nyx.init();
  return { window, Nyx: window.Nyx, doc: window.document };
}
const anim = (window, el, type) => el.dispatchEvent(new window.Event(type, { bubbles: true }));

for (const file of ['nyx.js', 'nyx.min.js']) {
  describe(`${file} — lifecycle settle timing`, () => {
    it('modal -shown fires on the child .nyx-modal-box animationend', () => {
      const { window, Nyx, doc } = mount(file, '<div class="nyx-modal" id="m"><div class="nyx-modal-box"><h3>H</h3></div></div>');
      const m = doc.getElementById('m'); let shown = false;
      m.addEventListener('nyx:modal-shown', () => { shown = true; });
      Nyx.openModal('#m');
      anim(window, m.querySelector('.nyx-modal-box'), 'animationend');
      assert.ok(shown, '-shown should fire on the animated child, not wait for the 400ms fallback');
    });

    it('popover -shown fires on the child .nyx-pop animationend', () => {
      const { window, Nyx, doc } = mount(file, '<div class="nyx-popover" id="p"><button data-nyx-toggle="popover">t</button><div class="nyx-pop">b</div></div>');
      const p = doc.getElementById('p'); let shown = false;
      p.addEventListener('nyx:popover-shown', () => { shown = true; });
      Nyx.togglePopover(p.querySelector('button'), true);
      anim(window, p.querySelector('.nyx-pop'), 'animationend');
      assert.ok(shown);
    });

    it('collapse -shown fires on the element\'s own transitionend', () => {
      const { window, Nyx, doc } = mount(file, '<button data-nyx-toggle="collapse" data-nyx-target="#c" id="ct">M</button><div id="c" class="nyx-collapse">body</div>');
      const c = doc.getElementById('c'); let shown = false;
      c.addEventListener('nyx:collapse-shown', () => { shown = true; });
      Nyx.toggleCollapse('#ct');
      anim(window, c, 'transitionend');
      assert.ok(shown);
    });

    it('a deep-descendant animationend does NOT trigger the overlay -shown', () => {
      const { window, Nyx, doc } = mount(file, '<div class="nyx-modal" id="m"><div class="nyx-modal-box"><button id="b">x</button></div></div>');
      const m = doc.getElementById('m'); let shown = false;
      m.addEventListener('nyx:modal-shown', () => { shown = true; });
      Nyx.openModal('#m');
      anim(window, doc.getElementById('b'), 'animationend'); // grandchild
      assert.ok(!shown, 'only the node or its direct child should settle the event');
    });
  });

  describe(`${file} — instance API safety`, () => {
    it('getOrCreateInstance on a non-overlay does not create a modal handle', () => {
      const { Nyx, doc } = mount(file, '<div class="nyx-carousel" id="car"><div class="nyx-slide active">1</div><div class="nyx-slide">2</div></div>');
      const inst = Nyx.getOrCreateInstance('#car');
      // a .nyx-carousel yields a carousel handle (next/prev/to), never an overlay show()
      assert.equal(typeof inst.next, 'function');
      assert.equal(typeof inst.show, 'undefined');
      inst.next();
      assert.ok(!doc.querySelector('.nyx-overlay.open'), 'must not open a backdrop');
      assert.equal(doc.body.style.overflow, '', 'must not lock scroll');
    });

    it('getOrCreateInstance returns null for an unrecognized element', () => {
      const { Nyx, doc } = mount(file, '<div id="plain">x</div>');
      assert.equal(Nyx.getOrCreateInstance('#plain'), null);
    });

    it('dropdown instance dispose() actually clears the cache (keyed by the trigger)', () => {
      const { Nyx } = mount(file, '<div class="nyx-dropdown"><button data-nyx-toggle="dropdown" id="dt">m</button><div class="nyx-dropdown-menu"><a class="nyx-dropdown-item" href="#">i</a></div></div>');
      const a = Nyx.getOrCreateInstance('#dt');           // pass the trigger, not the container
      assert.ok(a && Nyx.getInstance('#dt') === a);
      a.dispose();
      assert.equal(Nyx.getInstance('#dt'), null, 'dispose() must delete the same key getInstance reads');
    });
  });
}

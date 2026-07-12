// Prototype verification: load core + plugins into jsdom and prove the modular
// runtime behaves — theme, delegated modal open, tab switch, toast, countdown scan.
// Run:  node verify.mjs   (named verify, not test, so root `node --test` skips it)
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DIR = dirname(fileURLToPath(import.meta.url));
const src = (f) => readFileSync(join(DIR, f), 'utf8');

const HTML = `<!doctype html><html><body>
  <button id="open" data-nyx-toggle="modal" data-nyx-target="#m">Open</button>
  <div class="nyx-modal" id="m"><div class="nyx-modal-box"><h3>Hi</h3>
    <button data-nyx-dismiss>Close</button></div></div>
  <div data-nyx-tabs>
    <button data-nyx-tab="a" class="active">A</button><button data-nyx-tab="b">B</button>
  </div>
  <div data-nyx-panel="a" class="active">PA</div><div data-nyx-panel="b">PB</div>
  <div class="nyx-countdown" data-nyx-countdown="23:59"><span class="unit"><b>--</b></span><span class="unit"><b>--</b></span><span class="unit"><b>--</b></span></div>
</body></html>`;

const dom = new JSDOM(HTML, { runScripts: 'dangerously', url: 'https://nyx.test/', pretendToBeVisual: true });
const w = dom.window;
// load order: core first, then plugins (as a real page would)
for (const f of ['nyx.core.js', 'nyx.overlay.js', 'nyx.tabs.js', 'nyx.toast.js', 'nyx.countdown.js']) {
  const s = w.document.createElement('script'); s.textContent = src(f); w.document.body.appendChild(s);
}
await new Promise((r) => setTimeout(r, 20));   // let core's init() fire

let pass = 0; const ok = (m) => { console.log('  ✓ ' + m); pass++; };

assert.equal(typeof w.Nyx, 'object'); ok('core exposed window.Nyx (' + w.Nyx.version + ')');
assert.equal(typeof w.Nyx.openModal, 'function'); ok('overlay plugin extended the API (Nyx.openModal)');
assert.equal(typeof w.Nyx.toast, 'function'); ok('toast plugin extended the API (Nyx.toast)');

// theme (core)
w.Nyx.setTheme('light'); assert.equal(w.document.documentElement.getAttribute('data-theme'), 'light'); ok('core theme toggle works');

// delegated modal open via data-nyx-toggle click (shared bus)
w.document.getElementById('open').click();
assert.ok(w.document.getElementById('m').classList.contains('open')); ok('clicking [data-nyx-toggle=modal] opened the modal');
assert.ok(w.document.querySelector('.nyx-overlay.open')); ok('shared backdrop appeared');
// dismiss
w.document.querySelector('[data-nyx-dismiss]').click();
assert.ok(!w.document.getElementById('m').classList.contains('open')); ok('[data-nyx-dismiss] closed it');

// tabs (delegated)
w.document.querySelector('[data-nyx-tab="b"]').click();
assert.ok(w.document.querySelector('[data-nyx-panel="b"]').classList.contains('active')); ok('tab switch activated panel B');
assert.ok(!w.document.querySelector('[data-nyx-panel="a"]').classList.contains('active')); ok('panel A deactivated');

// toast (pure API)
const t = w.Nyx.toast('Saved', 'success');
assert.ok(t.classList.contains('nyx-toast-success')); ok('Nyx.toast() created a toast element');

// countdown (scan widget) — tick() ran synchronously during scan
const b0 = w.document.querySelector('.nyx-countdown .unit b').textContent;
assert.match(b0, /^\d{2}$/); ok('countdown scan populated units (' + b0 + ')');

w.close();  // stop the countdown interval so the process exits
console.log('\n' + pass + '/' + pass + ' modular checks passed.');

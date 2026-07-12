'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { migrateHtml, mapToken, generateCheatsheet } = require('../tools/migrate');

test('migrate: exact button + component classes', () => {
  const { output, stats } = migrateHtml('<button class="btn btn-primary btn-lg">x</button>');
  assert.match(output, /class="nyx-btn nyx-btn-primary nyx-btn-lg"/);
  assert.equal(stats.classChanges, 3);
});

test('migrate: grid patterns (row/col/responsive)', () => {
  const { output } = migrateHtml('<div class="row"><div class="col-md-6 col-12">a</div></div>');
  assert.match(output, /class="nyx-grid"/);
  assert.match(output, /class="nyx-col-md-6 nyx-col-12"/);
});

test('migrate: spacing incl physical→logical and responsive', () => {
  assert.equal(mapToken('m-3').to, 'nyx-m-3');
  assert.equal(mapToken('ml-2').to, 'nyx-ms-2');   // left → start
  assert.equal(mapToken('mr-4').to, 'nyx-me-4');   // right → end
  assert.equal(mapToken('p-md-3').to, 'nyx-p-md-3');
  assert.equal(mapToken('mx-auto').to, 'nyx-mx-auto');
});

test('migrate: flex + justify + text utilities', () => {
  assert.equal(mapToken('flex-column').to, 'nyx-flex-col');
  assert.equal(mapToken('justify-content-between').to, 'nyx-justify-between');
  assert.equal(mapToken('align-items-center').to, 'nyx-items-center');
  assert.equal(mapToken('text-center').to, 'nyx-text-center');
});

test('migrate: data-bs-* → data-nyx-* incl offcanvas→drawer value', () => {
  const { output, stats } = migrateHtml('<button data-bs-toggle="modal" data-bs-target="#m">x</button>');
  assert.match(output, /data-nyx-toggle="modal"/);
  assert.match(output, /data-nyx-target="#m"/);
  assert.ok(stats.dataChanges >= 2);
  const oc = migrateHtml('<button data-bs-toggle="offcanvas">x</button>').output;
  assert.match(oc, /data-nyx-toggle="drawer"/);
});

test('migrate: unmapped classes are left alone and reported for review', () => {
  const { output, stats } = migrateHtml('<span class="btn-success card-body my-custom">x</span>');
  assert.match(output, /btn-success/);       // untouched
  assert.match(output, /card-body/);          // untouched
  assert.match(output, /my-custom/);          // untouched
  assert.ok(stats.review.has('btn-success'));
  assert.ok(stats.review.has('card-body'));
  assert.ok(!stats.review.has('my-custom'));  // not Bootstrap-looking
});

test('migrate: non-Bootstrap classes are preserved verbatim', () => {
  const { output, stats } = migrateHtml('<div class="my-widget hero-xl">x</div>');
  assert.match(output, /class="my-widget hero-xl"/);
  assert.equal(stats.classChanges, 0);
});

test('migrate: cheat sheet generates and reflects the map', () => {
  const md = generateCheatsheet();
  assert.match(md, /Migrate from Bootstrap/);
  assert.match(md, /`btn-primary` \| `nyx-btn-primary`/);
  assert.match(md, /data-nyx-toggle/);
});

test('migrate: cheat sheet preserves regex escapes (\\d stays \\d)', () => {
  const md = generateCheatsheet();
  assert.match(md, /col-\(\\d\{1,2\}\)/);      // not the mangled `col-(d{1,2})`
  assert.ok(!/col-\(d\{1,2\}\)/.test(md));      // the backslash-stripped form must NOT appear
});

test('migrate: framework class bindings are left untouched', () => {
  const vue = migrateHtml('<div :class="btn"></div>').output;
  assert.match(vue, /:class="btn"/);            // Vue binding value is not a class list
  const ng = migrateHtml('<div ng-class="card"></div>').output;
  assert.match(ng, /ng-class="card"/);
  const react = migrateHtml('<div className="btn card">x</div>').output;
  assert.match(react, /className="nyx-btn nyx-card"/); // real className IS rewritten
});

test('migrate: code/script/style/pre regions are shielded', () => {
  const code = migrateHtml('<p>use <code>class="btn"</code> here</p>').output;
  assert.match(code, /<code>class="btn"<\/code>/); // sample markup untouched
  const script = migrateHtml('<script>var el = document.querySelector(".card");</script>').output;
  assert.match(script, /querySelector\(".card"\)/); // JS inside <script> untouched
  assert.ok(!/nyx-card/.test(script));
  const pre = migrateHtml('<pre>data-bs-toggle="modal"</pre>').output;
  assert.match(pre, /data-bs-toggle="modal"/);     // preformatted sample untouched
});

test('migrate: data-bs-* only rewritten as an attribute, not in prose', () => {
  const prose = migrateHtml('<p>Set the data-bs-toggle attribute.</p>').output;
  assert.match(prose, /data-bs-toggle attribute/); // prose mention untouched
  const attr = migrateHtml('<button data-bs-dismiss="modal">x</button>').output;
  assert.match(attr, /data-nyx-dismiss="modal"/);  // real attribute rewritten
});

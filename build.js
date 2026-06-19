#!/usr/bin/env node
/*
 * Nyx build — splits the authored bundle (nyx.css) into individual,
 * downloadable component files under components/.
 *
 *   node build.js
 *
 * nyx.css stays the source of truth (the "all-in-one bundle"); this
 * regenerates the à-la-carte files. Every component file requires
 * components/tokens.css for the CSS variables it references.
 */
'use strict';
var fs = require('fs');
var path = require('path');

var VERSION = '1.3.0';
var SRC = path.join(__dirname, 'nyx.css');
var OUT = path.join(__dirname, 'components');
var css = fs.readFileSync(SRC, 'utf8');

/* numbered banner index -> filename */
var NAMES = {
  1: 'layout', 2: 'typography', 3: 'buttons', 4: 'cards', 5: 'forms',
  6: 'navigation', 7: 'feedback', 8: 'data', 9: 'overlays', 10: 'signature', 11: 'extras', 12: 'motion', 13: 'utilities'
};

/* collect the big ==== banners (sections 1..11 + RTL) */
var bannerRe = /\/\*\s*={20,}\s*\r?\n\s*([^\r\n]+?)\s*\r?\n\s*={20,}\s*\*\//g;
var banners = [], m;
while ((m = bannerRe.exec(css))) banners.push({ index: m.index, title: m[1].trim() });
if (!banners.length) { console.error('No section banners found — aborting.'); process.exit(1); }

function header(name, note) {
  return '/*! Nyx · ' + name + '.css · v' + VERSION + ' · MIT\n' +
    ' * ' + note + '\n' +
    ' * Bundle: nyx.css   Docs: docs.html\n' +
    ' */\n';
}
function write(name, note, body) {
  fs.writeFileSync(path.join(OUT, name + '.css'), header(name, note) + body.trim() + '\n');
  return name;
}

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

/* preamble (before the first banner) = file header + tokens + base */
var preamble = css.slice(0, banners[0].index);
var tokStart = preamble.indexOf('/* ---------- TOKENS');
var baseStart = preamble.indexOf('/* ---------- BASE');
var written = [];

written.push(write('tokens', 'Design tokens — dark + light themes. Required by every other file.', preamble.slice(tokStart, baseStart)));
written.push(write('base', 'Reset + body.nyx canvas/typography. Requires tokens.css.', preamble.slice(baseStart)));

/* each banner section -> its own file */
banners.forEach(function (b, i) {
  var body = css.slice(b.index, i + 1 < banners.length ? banners[i + 1].index : css.length);
  var num = parseInt(b.title, 10);
  var name = !isNaN(num) ? NAMES[num] : (/^RTL/i.test(b.title) ? 'rtl' : null);
  if (!name) { console.warn('Skipped unmapped section: ' + b.title); return; }
  var note = name === 'rtl'
    ? 'RTL mirroring layer + reduced-motion. Requires tokens.css.'
    : 'The ' + name + ' module. Requires tokens.css.';
  written.push(write(name, note, body));
});

/* write the bundle copy into components too, for one-click "everything" */
fs.copyFileSync(SRC, path.join(OUT, 'nyx.bundle.css'));

console.log('Built ' + written.length + ' component files + nyx.bundle.css in components/:');
console.log('  ' + written.map(function (n) { return n + '.css'; }).join(', '));

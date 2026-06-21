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
var zlib = require('zlib');

var VERSION = require('./package.json').version;   // single source of truth
var SRC = path.join(__dirname, 'nyx.css');
var JSSRC = path.join(__dirname, 'nyx.js');
var OUT = path.join(__dirname, 'components');
var css = fs.readFileSync(SRC, 'utf8');

/* ---- minifiers (string-safe; no external deps) ---- */
var SENT = '__NYXSTR__';
function minifyCss(src) {
  var strings = [];
  src = src.replace(/\/\*[\s\S]*?\*\//g, '');                        // drop comments FIRST (apostrophes in comments would mis-pair string protection)
  src = src.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, function (s) {
    strings.push(s); return SENT + (strings.length - 1) + SENT;     // protect literals
  });
  src = src.replace(/\s+/g, ' ');                                    // collapse whitespace
  src = src.replace(/\s*([{}:;,>])\s*/g, '$1');                      // trim around safe punctuation only (keeps calc()/+~ combinators valid)
  src = src.replace(/;}/g, '}').trim();                              // drop trailing semicolons
  return src.replace(new RegExp(SENT + '(\\d+)' + SENT, 'g'), function (_, n) { return strings[+n]; });
}
function minifyJs(src) {
  src = src.replace(/\/\*[\s\S]*?\*\//g, '');                        // strip block comments (incl. header); keep newlines = ASI-safe
  return src.split('\n').map(function (l) { return l.replace(/^\s+/, ''); })
    .filter(function (l) { return l.length; }).join('\n').trim() + '\n';
}
function kb(s) { return (Buffer.byteLength(s) / 1024).toFixed(1) + 'kb'; }
function gz(s) { return (zlib.gzipSync(s).length / 1024).toFixed(1) + 'kb'; }

/* numbered banner index -> filename */
var NAMES = {
  1: 'layout', 2: 'typography', 3: 'buttons', 4: 'cards', 5: 'forms',
  6: 'navigation', 7: 'feedback', 8: 'data', 9: 'overlays', 10: 'signature', 11: 'extras', 12: 'motion', 13: 'utilities',
  14: 'hierarchy', 15: 'regional', 16: 'forms-plus', 17: 'overlays-plus', 18: 'commerce', 19: 'regional-plus',
  20: 'backgrounds', 21: 'charts', 22: 'code', 23: 'blocks', 24: 'blocks-plus', 25: 'media', 26: 'enhancements'
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

/* ---- minified distribution (project root, for npm/CDN) ---- */
var minCss = '/*! Nyx v' + VERSION + ' · MIT · the first CSS library built for Arabic developers */\n' + minifyCss(css) + '\n';
var jsRaw = fs.readFileSync(JSSRC, 'utf8');
/* keep nyx.js in sync with package.json: header banner + the runtime version field */
var jsSynced = jsRaw
  .replace(/(Nyx — runtime · v)[\d.]+/, '$1' + VERSION)
  .replace(/(version:\s*')[\d.]+(')/, '$1' + VERSION + '$2');
if (jsSynced !== jsRaw) { fs.writeFileSync(JSSRC, jsSynced); jsRaw = jsSynced; console.log('Synced nyx.js version -> ' + VERSION); }
var minJs = '/*! Nyx v' + VERSION + ' · MIT */\n' + minifyJs(jsRaw);
fs.writeFileSync(path.join(__dirname, 'nyx.min.css'), minCss);
fs.writeFileSync(path.join(__dirname, 'nyx.min.js'), minJs);

console.log('Built ' + written.length + ' component files + nyx.bundle.css in components/:');
console.log('  ' + written.map(function (n) { return n + '.css'; }).join(', '));
console.log('Minified distribution (root):');
console.log('  nyx.min.css   ' + kb(minCss) + ' min · ' + gz(minCss) + ' gzip   (source ' + kb(css) + ')');
console.log('  nyx.min.js    ' + kb(minJs) + ' min · ' + gz(minJs) + ' gzip   (source ' + kb(jsRaw) + ')');

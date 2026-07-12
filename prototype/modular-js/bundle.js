#!/usr/bin/env node
'use strict';
/**
 * Custom-bundle composer (prototype). Concatenates nyx.core.js + the plugins you
 * name into nyx.custom.js, and prints a per-file size table so the cost of each
 * component — and of the whole modular approach vs the monolith — is visible.
 *
 *   node bundle.js                 # all demo plugins
 *   node bundle.js overlay toast   # just these two
 */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
let esbuild; try { esbuild = require('esbuild'); } catch (e) { /* sizes fall back to raw */ }

const DIR = __dirname;
const ALL = ['overlay', 'tabs', 'toast', 'countdown'];
const picks = process.argv.slice(2).filter((a) => a[0] !== '-');
const chosen = picks.length ? picks : ALL;
const bad = chosen.filter((p) => !ALL.includes(p));
if (bad.length) { console.error('Unknown plugin(s): ' + bad.join(', ') + '\nAvailable: ' + ALL.join(', ')); process.exit(1); }

const files = ['nyx.core.js'].concat(chosen.map((p) => 'nyx.' + p + '.js'));
const bundle = files.map((f) => fs.readFileSync(path.join(DIR, f), 'utf8')).join('\n');
fs.writeFileSync(path.join(DIR, 'nyx.custom.js'), bundle);

const kb = (n) => (n / 1024).toFixed(1) + 'kb';
function sizes(code) {
  const min = esbuild ? esbuild.transformSync(code, { minify: true }).code : code;
  return { min: Buffer.byteLength(min), gz: zlib.gzipSync(min).length };
}
const row = (name, s) => '  ' + name.padEnd(20) + kb(s.min).padStart(8) + ' min · ' + kb(s.gz).padStart(7) + ' gz';

console.log('Custom bundle: core + ' + chosen.join(' + ') + '  →  nyx.custom.js\n');
console.log('Per file' + (esbuild ? '' : '  (raw — install esbuild for min/gzip)') + ':');
files.forEach((f) => console.log(row(f, sizes(fs.readFileSync(path.join(DIR, f), 'utf8')))));
console.log(row('══ this bundle ══', sizes(bundle)));

try {
  const m = sizes(fs.readFileSync(path.join(DIR, '..', '..', 'nyx.js'), 'utf8'));
  console.log('\nFull monolith nyx.js: ' + kb(m.min) + ' min · ' + kb(m.gz) + ' gz  (all ~40 components, one file)');
} catch (e) { /* ignore if run outside the repo */ }

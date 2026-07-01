#!/usr/bin/env node
'use strict';

/**
 * Nyx build — regenerates every distributable from the two authored sources.
 *
 *   node build.js
 *
 * Sources of truth:  nyx.css (the all-in-one bundle) and nyx.js (the runtime).
 * Generated here:     components/*.css, nyx.bundle.css, nyx.min.css, nyx.min.js,
 *                     plus version stamps across the site + docs HTML.
 *
 * Every component file requires components/tokens.css for its CSS variables.
 * Zero dependencies: pure Node, no install step.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const { version: VERSION } = require('./package.json');   // single source of truth
const ROOT = __dirname;
const COMPONENTS = path.join(ROOT, 'components');

// The numbered sections in nyx.css, in banner order, mapped to file names.
const SECTION_FILES = {
  1: 'layout', 2: 'typography', 3: 'buttons', 4: 'cards', 5: 'forms',
  6: 'navigation', 7: 'feedback', 8: 'data', 9: 'overlays', 10: 'signature',
  11: 'extras', 12: 'motion', 13: 'utilities', 14: 'hierarchy', 15: 'regional',
  16: 'forms-plus', 17: 'overlays-plus', 18: 'commerce', 19: 'regional-plus',
  20: 'backgrounds', 21: 'charts', 22: 'code', 23: 'blocks', 24: 'blocks-plus',
  25: 'media', 26: 'enhancements', 27: 'regional-pro', 28: 'hijri',
};

// Site/docs pages whose "v1.2.3" badges track package.json.
const VERSIONED_HTML = ['index.html', 'index.ar.html', 'docs/docs.html', 'docs/docs.ar.html'];

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const writeText = (rel, body) => fs.writeFileSync(path.join(ROOT, rel), body);
const kb = (s) => `${(Buffer.byteLength(s) / 1024).toFixed(1)}kb`;
const gzip = (s) => `${(zlib.gzipSync(s).length / 1024).toFixed(1)}kb`;

function main() {
  // 1 · keep the authored sources' version banners in sync with package.json
  const css = syncVersion('nyx.css', [
    [/(v)\d+\.\d+\.\d+( · MIT License)/, (_, pre, post) => pre + VERSION + post],
  ]);
  const js = syncVersion('nyx.js', [
    [/(Nyx — runtime · v)[\d.]+/, (_, pre) => pre + VERSION],
    [/(version:\s*')[\d.]+(')/, (_, pre, post) => pre + VERSION + post],
  ]);

  // 2 · split the bundle into à-la-carte modules + a full-bundle copy
  const modules = splitIntoComponents(css);
  fs.copyFileSync(path.join(ROOT, 'nyx.css'), path.join(COMPONENTS, 'nyx.bundle.css'));

  // 3 · minified distribution for npm / CDN
  const minCss = `/*! Nyx v${VERSION} · MIT · the first CSS library built for Arabic developers */\n${minifyCss(css)}\n`;
  const minJs = `/*! Nyx v${VERSION} · MIT */\n${minifyJs(js)}`;
  writeText('nyx.min.css', minCss);
  writeText('nyx.min.js', minJs);

  // 4 · refresh version badges across the site + docs
  VERSIONED_HTML.forEach(stampVersionBadge);

  report(modules, { minCss, css, minJs, js });
}

/* ------------------------------------------------------------------ *
 *  Component splitting
 * ------------------------------------------------------------------ */

// nyx.css → components/*.css: tokens + base come from the preamble (before the
// first banner), then one file per numbered/RTL section. Returns files written.
function splitIntoComponents(css) {
  if (!fs.existsSync(COMPONENTS)) fs.mkdirSync(COMPONENTS);

  const banners = findBanners(css);
  if (!banners.length) {
    console.error('No section banners found — aborting.');
    process.exit(1);
  }

  const written = [];
  const emit = (name, note, body) => {
    writeText(`components/${name}.css`, componentHeader(name, note) + body.trim() + '\n');
    written.push(name);
  };

  // Preamble holds the tokens + base layers, split at their "---" markers.
  const preamble = css.slice(0, banners[0].index);
  const baseAt = preamble.indexOf('/* ---------- BASE');
  emit('tokens', 'Design tokens — dark + light themes. Required by every other file.',
    preamble.slice(preamble.indexOf('/* ---------- TOKENS'), baseAt));
  emit('base', 'Reset + body.nyx canvas/typography. Requires tokens.css.',
    preamble.slice(baseAt));

  // One file per section banner.
  banners.forEach((banner, i) => {
    const end = i + 1 < banners.length ? banners[i + 1].index : css.length;
    const name = fileNameFor(banner.title);
    if (!name) {
      console.warn(`Skipped unmapped section: ${banner.title}`);
      return;
    }
    const note = name === 'rtl'
      ? 'RTL mirroring layer + reduced-motion. Requires tokens.css.'
      : `The ${name} module. Requires tokens.css.`;
    emit(name, note, css.slice(banner.index, end));
  });

  return written;
}

// The big "==== TITLE ====" comment banners that separate sections.
function findBanners(css) {
  const re = /\/\*\s*={20,}\s*\r?\n\s*([^\r\n]+?)\s*\r?\n\s*={20,}\s*\*\//g;
  const banners = [];
  for (let m; (m = re.exec(css)); ) banners.push({ index: m.index, title: m[1].trim() });
  return banners;
}

// "27. REGIONAL++ …" → 'regional-pro'; "RTL …" → 'rtl'; else null.
// The dot after the number is required so descriptive banners
// ("3D Tilt Card") aren't misread as a section number.
function fileNameFor(title) {
  const numbered = /^(\d+)\./.exec(title);
  if (numbered) return SECTION_FILES[Number(numbered[1])] || null;
  return /^RTL/i.test(title) ? 'rtl' : null;
}

function componentHeader(name, note) {
  return `/*! Nyx · ${name}.css · v${VERSION} · MIT\n`
    + ` * ${note}\n`
    + ` * Bundle: nyx.css   Docs: docs/docs.html\n`
    + ` */\n`;
}

/* ------------------------------------------------------------------ *
 *  Minifiers — string-safe, no external deps
 * ------------------------------------------------------------------ */

const STR_TOKEN = '__NYXSTR__';

// Protect string literals, strip comments + whitespace, then restore literals.
function minifyCss(css) {
  const literals = [];
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')                          // comments first (apostrophes inside would break literal pairing)
    .replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, (s) => {  // stash literals behind a token
      literals.push(s);
      return `${STR_TOKEN}${literals.length - 1}${STR_TOKEN}`;
    })
    .replace(/\s+/g, ' ')                                      // collapse whitespace
    .replace(/\s*([{}:;,>])\s*/g, '$1')                        // trim around safe punctuation (keeps calc()/+~ valid)
    .replace(/;}/g, '}')                                       // drop trailing semicolons
    .trim()
    .replace(new RegExp(`${STR_TOKEN}(\\d+)${STR_TOKEN}`, 'g'), (_, i) => literals[Number(i)]);
}

// Strip block comments, then trim each line and drop blanks. Newlines stay, so
// automatic semicolon insertion is safe — this is a size pass, not a mangler.
function minifyJs(js) {
  return js
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/^\s+/, ''))
    .filter((line) => line.length > 0)
    .join('\n')
    .trim() + '\n';
}

/* ------------------------------------------------------------------ *
 *  Version stamping
 * ------------------------------------------------------------------ */

// Apply [pattern, replacer] pairs to a source file in place; log if it changed.
function syncVersion(rel, replacements) {
  const original = read(rel);
  const updated = replacements.reduce((text, [pattern, replacer]) => text.replace(pattern, replacer), original);
  if (updated !== original) {
    writeText(rel, updated);
    console.log(`Synced ${rel} version -> ${VERSION}`);
  }
  return updated;
}

// Refresh the "v1.2.3" badges in a site/docs page.
function stampVersionBadge(rel) {
  if (!fs.existsSync(path.join(ROOT, rel))) return;
  const original = read(rel);
  const updated = original.replace(/>v\d+\.\d+\.\d+</g, `>v${VERSION}<`);
  if (updated !== original) {
    writeText(rel, updated);
    console.log(`Synced ${rel} version -> ${VERSION}`);
  }
}

/* ------------------------------------------------------------------ */

function report(modules, { minCss, css, minJs, js }) {
  console.log(`Built ${modules.length} component files + nyx.bundle.css in components/:`);
  console.log(`  ${modules.map((n) => `${n}.css`).join(', ')}`);
  console.log('Minified distribution (root):');
  console.log(`  nyx.min.css   ${kb(minCss)} min · ${gzip(minCss)} gzip   (source ${kb(css)})`);
  console.log(`  nyx.min.js    ${kb(minJs)} min · ${gzip(minJs)} gzip   (source ${kb(js)})`);
}

main();

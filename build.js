#!/usr/bin/env node
'use strict';

/**
 * Nyx build — regenerates every distributable from the two authored sources.
 *
 *   node build.js
 *
 * Sources of truth:  src/nyx.css (the all-in-one bundle) and src/nyx.js (the runtime).
 * Generated here:     dist/components/*.css, dist/nyx.min.css, dist/nyx.min.js,
 *                     plus version stamps across the site + docs HTML.
 *
 * Every component file requires components/tokens.css for its CSS variables.
 * JS is minified with esbuild (a devDependency); CSS minification is built in.
 * Run `npm install` once before building.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const esbuild = require('esbuild');   // real JS minifier (devDependency)

const pkg = require('./package.json');   // single source of truth
const VERSION = pkg.version;
const SITE = 'https://fadyehabamer.github.io/NYX';   // GitHub Pages root (serves /llms.txt)
const ROOT = __dirname;
const COMPONENTS = path.join(ROOT, 'dist', 'components');

// The numbered sections in nyx.css, in banner order, mapped to file names.
const SECTION_FILES = {
  1: 'layout', 2: 'typography', 3: 'buttons', 4: 'cards', 5: 'forms',
  6: 'navigation', 7: 'feedback', 8: 'data', 9: 'overlays', 10: 'signature',
  11: 'extras', 12: 'motion', 13: 'utilities', 14: 'hierarchy', 15: 'regional',
  16: 'forms-plus', 17: 'overlays-plus', 18: 'commerce', 19: 'regional-plus',
  20: 'backgrounds', 21: 'charts', 22: 'code', 23: 'blocks', 24: 'blocks-plus',
  25: 'media', 26: 'enhancements', 27: 'regional-pro', 28: 'hijri',
  29: 'data-plus', 30: 'feedback-plus', 31: 'layout-plus',
  32: 'forms-pro', 33: 'charts-plus', 34: 'overlays-pro', 35: 'layout-pro',
};

// Site/docs pages whose "v1.2.3" badges track package.json.
const VERSIONED_HTML = ['index.html', 'index.ar.html', 'docs/docs.html', 'docs/docs.ar.html'];

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const writeText = (rel, body) => fs.writeFileSync(path.join(ROOT, rel), body);
const kb = (s) => `${(Buffer.byteLength(s) / 1024).toFixed(1)}kb`;
const gzip = (s) => `${(zlib.gzipSync(s).length / 1024).toFixed(1)}kb`;

/* ------------------------------------------------------------------ *
 *  Responsive-utility generator — the "custom utilities" config.
 *  Base utilities stay hand-authored in nyx.css; only their breakpoint
 *  variants are generated, into the marked block in the UTILITIES section
 *  (so they ship in nyx.css, nyx.min.css, the bundle and utilities.css).
 *  Add a row below and rebuild to mint new responsive utilities.
 * ------------------------------------------------------------------ */
const UTIL_BREAKPOINTS = { sm: 640, md: 768, lg: 1024, xl: 1280 };
const UTIL_SPACE = { 0: '0', 1: 'var(--nyx-s1)', 2: 'var(--nyx-s2)', 3: 'var(--nyx-s3)', 4: 'var(--nyx-s4)', 5: 'var(--nyx-s5)', 6: 'var(--nyx-s6)' };
// [ prefix, 'property:%', valuesMap ] — '%' is replaced by each value; class = nyx-<prefix>-<bp>-<key>.
const UTILITIES = [
  ['m', 'margin:%', UTIL_SPACE], ['mt', 'margin-top:%', UTIL_SPACE], ['mb', 'margin-bottom:%', UTIL_SPACE],
  ['ms', 'margin-inline-start:%', UTIL_SPACE], ['me', 'margin-inline-end:%', UTIL_SPACE], ['mx', 'margin-inline:%', { auto: 'auto' }],
  ['p', 'padding:%', UTIL_SPACE], ['pt', 'padding-top:%', UTIL_SPACE], ['pb', 'padding-bottom:%', UTIL_SPACE],
  ['ps', 'padding-inline-start:%', UTIL_SPACE], ['pe', 'padding-inline-end:%', UTIL_SPACE],
  ['gap', 'gap:%', UTIL_SPACE],
  ['d', 'display:%', { none: 'none', block: 'block', inline: 'inline', 'inline-block': 'inline-block', flex: 'flex', 'inline-flex': 'inline-flex', grid: 'grid' }],
  ['text', 'text-align:%', { start: 'start', center: 'center', end: 'end' }],
  ['flex', 'flex-direction:%', { row: 'row', 'row-reverse': 'row-reverse', col: 'column', 'col-reverse': 'column-reverse' }],
  ['justify', 'justify-content:%', { start: 'flex-start', end: 'flex-end', center: 'center', between: 'space-between', around: 'space-around', evenly: 'space-evenly' }],
  ['items', 'align-items:%', { start: 'flex-start', end: 'flex-end', center: 'center', stretch: 'stretch', baseline: 'baseline' }],
];
const RU_START = '/* @responsive-utilities:start */';
const RU_END = '/* @responsive-utilities:end */';
function buildResponsiveUtilities() {
  const out = [];
  for (const bp of Object.keys(UTIL_BREAKPOINTS)) {
    out.push(`@media(min-width:${UTIL_BREAKPOINTS[bp]}px){`);
    for (const [prefix, tmpl, values] of UTILITIES) {
      out.push('  ' + Object.keys(values).map((k) => `.nyx-${prefix}-${bp}-${k}{${tmpl.replace('%', values[k])}}`).join(''));
    }
    out.push('}');
  }
  return out.join('\n');
}
// State variants — class="nyx-hover:shadow-lg" / "nyx-focus:border-accent" (the ':' is escaped in the selector).
const UTIL_STATES = { hover: ':hover', focus: ':focus-visible' };
const STATE_UTILS = {
  'bg-surface': 'background:var(--nyx-surface)', 'bg-surface-2': 'background:var(--nyx-surface-2)',
  'bg-accent': 'background:var(--nyx-accent);color:#fff', 'bg-glass': 'background:var(--nyx-glass)',
  'text-accent': 'color:var(--nyx-accent)', 'text-danger': 'color:var(--nyx-danger)', 'text-muted': 'color:var(--nyx-text-muted)',
  'shadow': 'box-shadow:var(--nyx-shadow)', 'shadow-sm': 'box-shadow:var(--nyx-shadow-sm)', 'shadow-lg': 'box-shadow:var(--nyx-shadow-lg)', 'shadow-glow': 'box-shadow:var(--nyx-glow)',
  'border': 'border:1px solid var(--nyx-border)', 'border-accent': 'border-color:var(--nyx-accent)',
  'rounded': 'border-radius:var(--nyx-radius)', 'rounded-lg': 'border-radius:var(--nyx-radius-lg)',
  'opacity-100': 'opacity:1', 'opacity-75': 'opacity:.75', 'opacity-50': 'opacity:.5',
};
function buildStateUtilities() {
  const out = ['/* state variants (hover / focus) */'];
  for (const state of Object.keys(UTIL_STATES)) {
    out.push('  ' + Object.keys(STATE_UTILS).map((s) => `.nyx-${state}\\:${s}${UTIL_STATES[state]}{${STATE_UTILS[s]}}`).join(''));
  }
  return out.join('\n');
}
function injectResponsiveUtilities(rel, css) {
  const s = css.indexOf(RU_START), e = css.indexOf(RU_END);
  if (s < 0 || e < 0) { console.warn(`! responsive-utilities markers missing in ${rel} — skipped`); return css; }
  const block = buildResponsiveUtilities() + '\n' + buildStateUtilities();
  const updated = css.slice(0, s + RU_START.length) + '\n' + block + '\n' + css.slice(e);
  if (updated !== css) { writeText(rel, updated); console.log(`Regenerated responsive + state utilities in ${rel}`); }
  return updated;
}

/* ------------------------------------------------------------------ *
 *  Design-token export — nyx.css :root → tokens.json (W3C-flavored).
 *  Makes the CSS-variable system machine-readable for Style Dictionary,
 *  Figma token plugins, and JS consumers. Derived, so it stays in sync.
 * ------------------------------------------------------------------ */
const TOKEN_TYPE = { color: 'color', radius: 'dimension', spacing: 'dimension', fontSize: 'dimension', shadow: 'shadow', fontFamily: 'fontFamily', easing: 'cubicBezier' };
function cssBlock(css, selector) {                              // inner text of `selector{ ... }` (token blocks have no nested braces)
  const i = css.indexOf(selector); if (i < 0) return '';
  const open = css.indexOf('{', i); if (open < 0) return '';
  return css.slice(open + 1, css.indexOf('}', open));
}
function parseVars(block) {
  const out = {}; const re = /--nyx-([\w-]+)\s*:\s*([^;}]+)/g; let m;
  while ((m = re.exec(block))) out[m[1]] = m[2].trim();
  return out;
}
function tokenCategory(name) {
  if (/^radius/.test(name)) return 'radius';
  if (/^(shadow|glow)/.test(name)) return 'shadow';
  if (/^fs-/.test(name)) return 'fontSize';
  if (/^s[1-9]$/.test(name)) return 'spacing';
  if (/^font-/.test(name)) return 'fontFamily';
  if (/^ease/.test(name)) return 'easing';
  return 'color';
}
function structureTokens(vars) {
  const out = {};
  Object.keys(vars).forEach((name) => {
    const cat = tokenCategory(name);
    (out[cat] = out[cat] || {})[name] = { $value: vars[name], $type: TOKEN_TYPE[cat] || 'other', cssVar: `--nyx-${name}` };
  });
  return out;
}
function buildTokens(css) {
  const dark = parseVars(cssBlock(css, ':root{'));
  const light = parseVars(cssBlock(css, ':root[data-theme="light"]'));
  const accents = { violet: { accent: dark.accent, 'accent-2': dark['accent-2'] } };
  ['emerald', 'rose', 'amber'].forEach((a) => { accents[a] = parseVars(cssBlock(css, `:root[data-accent="${a}"]`)); });
  return {
    name: 'nyx',
    version: VERSION,
    $description: 'NYX design tokens, derived from nyx.css :root. Some values reference other tokens via CSS var()/color-mix().',
    themes: { dark: structureTokens(dark), light: structureTokens(light) },
    accents: accents,
  };
}
// Tokens Studio for Figma format: sets of { value, type } grouped by TS type, + $metadata.
// Import via the Tokens Studio plugin to mint Figma variables + color/text/radius styles.
const TS_GROUP = { color: 'color', radius: 'borderRadius', spacing: 'spacing', fontSize: 'fontSizes', fontFamily: 'fontFamilies', shadow: 'boxShadow', easing: 'other' };
const TS_TYPE = { color: 'color', radius: 'borderRadius', spacing: 'spacing', fontSize: 'fontSizes', fontFamily: 'fontFamilies', shadow: 'other', easing: 'other' };
function toTokensStudioSet(structured) {
  const set = {};
  Object.keys(structured).forEach((cat) => {
    const group = TS_GROUP[cat] || 'other', type = TS_TYPE[cat] || 'other';
    set[group] = set[group] || {};
    Object.keys(structured[cat]).forEach((name) => { set[group][name] = { value: structured[cat][name].$value, type: type }; });
  });
  return set;
}
function buildFigmaTokens(t) {
  const out = { dark: toTokensStudioSet(t.themes.dark), light: toTokensStudioSet(t.themes.light) };
  Object.keys(t.accents).forEach((a) => {
    const color = {};
    Object.keys(t.accents[a]).forEach((k) => { if (t.accents[a][k]) color[k] = { value: t.accents[a][k], type: 'color' }; });
    out[a] = { color: color };
  });
  out.$themes = [];
  out.$metadata = { tokenSetOrder: ['dark', 'light'].concat(Object.keys(t.accents)) };
  return out;
}
function writeTokens(css) {
  const t = buildTokens(css);
  writeText('dist/tokens.json', JSON.stringify(t, null, 2) + '\n');
  writeText('dist/tokens.figma.json', JSON.stringify(buildFigmaTokens(t), null, 2) + '\n');
  const count = Object.values(t.themes.dark).reduce((n, g) => n + Object.keys(g).length, 0);
  console.log(`Wrote tokens.json + tokens.figma.json (${count} dark tokens · +light · ${Object.keys(t.accents).length} accents)`);
  return t;
}

function main() {
  // 1 · keep the authored sources' version banners in sync with package.json
  const cssStamped = syncVersion('src/nyx.css', [
    [/(v)\d+\.\d+\.\d+( · MIT License)/, (_, pre, post) => pre + VERSION + post],
  ]);
  const css = injectResponsiveUtilities('src/nyx.css', cssStamped);   // regenerate breakpoint utilities in place
  const js = syncVersion('src/nyx.js', [
    [/(Nyx — runtime · v)[\d.]+/, (_, pre) => pre + VERSION],
    [/(version:\s*')[\d.]+(')/, (_, pre, post) => pre + VERSION + post],
  ]);

  // 2 · split the bundle into à-la-carte modules + a full-bundle copy
  const modules = splitIntoComponents(css);
  fs.copyFileSync(path.join(ROOT, 'src', 'nyx.css'), path.join(COMPONENTS, 'nyx.bundle.css'));

  // 3 · minified + ESM distribution for npm / CDN
  const minCss = `/*! Nyx v${VERSION} · MIT · the first CSS library built for Arabic developers */\n${minifyCss(css)}\n`;
  writeText('dist/nyx.min.css', minCss);
  const minJs = buildMinJs();                          // nyx.min.js (+ nyx.min.js.map)
  const esm = buildEsm();                              // native ESM entry
  writeText('dist/nyx.mjs', esm);

  // 4 · refresh version badges, regenerate the Arabic page + AI reference
  VERSIONED_HTML.forEach(stampVersionBadge);
  const ar = generateArabic();                         // index.ar.html from index.html + locales/
  const llms = buildLlms(css, js);                     // llms.txt + llms-full.txt
  writeTokens(css);                                    // tokens.json + tokens.figma.json
  writeText('MIGRATION.md', require('./tools/migrate').generateCheatsheet());  // Bootstrap→NYX cheat sheet (from the codemod map)

  report(modules, { minCss, css, minJs, js, esm, ar, llms });
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
    writeText(`dist/components/${name}.css`, componentHeader(name, note) + body.trim() + '\n');
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
    + ` * Bundle: src/nyx.css   Docs: docs/docs.html\n`
    + ` */\n`;
}

/* ------------------------------------------------------------------ *
 *  Minifiers — CSS hand-rolled (string-safe); JS via esbuild
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

// Minified UMD build + external source map. esbuild's build API is used (not the
// transform API) so the banner and trailing //# sourceMappingURL offsets are baked
// into the map — DevTools resolves nyx.min.js back to nyx.js line-for-line. The
// runtime is authored as modern ES2019, so this is a size pass only (no downleveling).
function buildMinJs() {
  const { outputFiles } = esbuild.buildSync({
    entryPoints: [path.join(ROOT, 'src', 'nyx.js')],
    minify: true, target: 'es2019', legalComments: 'none', sourcemap: true,
    banner: { js: `/*! Nyx v${VERSION} · MIT */` },
    outfile: path.join(ROOT, 'dist', 'nyx.min.js'), write: false,
  });
  outputFiles.forEach((f) => fs.writeFileSync(f.path, f.contents));   // nyx.min.js + nyx.min.js.map
  return outputFiles.find((f) => f.path.endsWith('.js')).text;
}

// Native ES module entry: bundles the UMD runtime into an ESM file whose default
// export is the Nyx API (`import Nyx from 'nyx-css'`). Auto-inits on import exactly
// like the UMD build; consumers get a clean `import` with no CJS-interop shim.
function buildEsm() {
  const { outputFiles } = esbuild.buildSync({
    entryPoints: [path.join(ROOT, 'src', 'nyx.js')],
    bundle: true, format: 'esm', target: 'es2019', legalComments: 'none',
    outfile: path.join(ROOT, 'dist', 'nyx.mjs'), write: false,
  });
  return `/*! Nyx v${VERSION} · MIT · ESM (default export → Nyx) */\n${outputFiles[0].text}`;
}

/* ------------------------------------------------------------------ *
 *  LLM-consumable reference — llms.txt (curated map) + llms-full.txt
 *  (every class, attribute, token, and API method). Both are derived
 *  from the authored sources, so they can never drift. See llmstxt.org.
 * ------------------------------------------------------------------ */

// Callable methods on window.Nyx, read from the runtime's final `return { … }`.
function apiMethods(js) {
  const open = js.lastIndexOf('return {');
  const body = js.slice(open + 'return {'.length, js.indexOf('};', open));
  return body.replace(/\/\*[\s\S]*?\*\//g, '').split(',')
    .map((s) => s.trim().split(':')[0].trim())
    .filter((k) => /^[a-z]/i.test(k) && k !== 'version');
}

// The runtime's top /*! … */ doc block, stripped of comment markers.
function headerDoc(js) {
  const m = js.match(/\/\*![\s\S]*?\*\//);
  if (!m) return '';
  return m[0].replace(/^\/\*!\s*\n?/, '').replace(/\s*\*\/\s*$/, '')
    .split('\n').map((l) => l.replace(/^\s*\* ?/, '')).join('\n').trim();
}

// Defined design tokens (custom properties that appear as `--nyx-x:`), deduped.
function tokenNames(css) {
  return [...new Set(css.match(/--nyx-[a-z0-9-]+(?=\s*:)/g) || [])].sort();
}

// Unique .nyx-* class names grouped by the same section banners the split uses.
function sectionClasses(css) {
  const banners = findBanners(css);
  return banners.map((b, i) => {
    const end = i + 1 < banners.length ? banners[i + 1].index : css.length;
    const classes = [...new Set(css.slice(b.index, end).match(/\.nyx-[a-z0-9-]+/g) || [])].sort();
    return { title: b.title, classes };
  }).filter((s) => s.classes.length);
}

function buildLlms(css, js) {
  const methods = apiMethods(js);
  const tokens = tokenNames(css);
  const sections = sectionClasses(css);
  const allClasses = [...new Set(css.match(/\.nyx-[a-z0-9-]+/g) || [])];

  const short = [
    `# ${pkg.name} (Nyx) v${VERSION}`,
    '',
    `> ${pkg.description}`,
    '',
    'Nyx is a zero-dependency CSS + JS component framework. Components are plain HTML',
    'with `nyx-*` classes and `data-nyx-*` attributes — no JSX and no build step. The',
    'runtime auto-initializes on load and exposes `window.Nyx`.',
    '',
    '## Use',
    '- CSS — one stylesheet: link `nyx.min.css` or `import \'nyx-css/nyx.css\'`.',
    '- JS (UMD): `<script src="nyx.min.js"></script>` → `window.Nyx`.',
    '- JS (ESM): `import Nyx from \'nyx-css\'` (default export is the Nyx API).',
    '- Theme/dir: `<html data-theme="dark|light" dir="ltr|rtl">`; retint with `--nyx-accent`.',
    '',
    '## Docs',
    `- [Documentation](${SITE}/docs/docs.html)`,
    `- [Arabic documentation](${SITE}/docs/docs.ar.html)`,
    `- [Full LLM reference](${SITE}/llms-full.txt) — every class, attribute, token, and method.`,
    '',
    `## Component sections (${sections.length} sections, ${allClasses.length} classes)`,
    ...sections.map((s) => `- ${s.title} (${s.classes.length})`),
    '',
    '## JS API (window.Nyx)',
    methods.map((m) => `Nyx.${m}`).join(', '),
    '',
  ].join('\n');

  const full = [
    short.trimEnd(),
    '',
    '---',
    '',
    '## Runtime API — declarative attributes + imperative methods',
    '',
    '```',
    headerDoc(js),
    '```',
    '',
    `## Design tokens (${tokens.length}) — override any \`--nyx-*\` to theme`,
    tokens.map((t) => `- \`${t}\``).join('\n'),
    '',
    '## All classes, by section',
    ...sections.map((s) => `\n### ${s.title}\n${s.classes.map((c) => `\`${c}\``).join(' ')}`),
    '',
  ].join('\n');

  writeText('llms.txt', short);
  writeText('llms-full.txt', full);
  return { short, full, sections: sections.length, classes: allClasses.length, tokens: tokens.length };
}

/* ------------------------------------------------------------------ *
 *  Arabic landing page — generated from index.html (the canonical
 *  source) + locales/ar.json (translated copy + attributes) +
 *  locales/ar.blocks.html (Arabic-only fragments injected at the
 *  <!--nyx:ar KEY--> anchors). index.html is never hand-edited for
 *  Arabic; re-run build.js to refresh index.ar.html.
 * ------------------------------------------------------------------ */

const AR_SKIP = /^<(script|style|pre|code|svg)[\s>]/i;   // no text translation inside these
const AR_SKIP_CLOSE = /^<\/(script|style|pre|code|svg)>/i;

// "@key\n<block html>…" → { key: html }. Leading file comment + blank lines ignored.
function parseBlocks(src) {
  const out = {};
  let key = null, buf = [];
  for (const line of src.split('\n')) {
    const m = /^@(\S+)\s*$/.exec(line);
    if (m) { if (key) out[key] = buf.join('\n').replace(/^\n+|\n+$/g, ''); key = m[1]; buf = []; }
    else if (key !== null) buf.push(line);
  }
  if (key) out[key] = buf.join('\n').replace(/^\n+|\n+$/g, '');
  return out;
}

// Translate the whitelisted attributes on one start tag via the dictionary.
function translateAttrs(tag, dict) {
  return tag.replace(/\b(aria-label|title|placeholder|alt|content)="([^"]*)"/g,
    (m, name, val) => (dict[val] != null ? `${name}="${dict[val]}"` : m));
}

function generateArabic() {
  const dict = JSON.parse(read('src/locales/ar.json'));
  const blocks = parseBlocks(read('src/locales/ar.blocks.html'));
  let html = read('index.html');

  // 1 · document-level swaps: <html> dir/lang/font + drop the LTR-only display webfonts
  html = html.replace('<html lang="en" data-theme="dark">',
    '<html lang="ar" dir="rtl" data-theme="dark" data-font="thmanyah">');
  html = html.replace(/&(?:amp;)?family=Aref\+Ruqaa:wght@400;700&(?:amp;)?family=Lalezar/, '');
  // load the self-hosted Thmanyah @font-face so data-font="thmanyah" actually resolves
  // (without this the Arabic faces silently fall back to IBM Plex Sans Arabic).
  // Preload the two above-the-fold faces (body Sans 400 + hero Serif Display 700) so the
  // swap lands before first paint instead of flashing the fallback.
  html = html.replace('<link rel="stylesheet" href="src/nyx.css" />',
    '<link rel="preload" as="font" type="font/woff2" crossorigin href="fonts/thmanyah/thmanyahsans-Regular.woff2" />\n' +
    '<link rel="preload" as="font" type="font/woff2" crossorigin href="fonts/thmanyah/thmanyahserifdisplay-Bold.woff2" />\n' +
    '<link rel="stylesheet" href="fonts/thmanyah.css" />\n<link rel="stylesheet" href="src/nyx.css" />');

  // 2 · translate text nodes + attributes, honoring skip-zones. Anchor / en-only
  //     comments are treated as tags here and resolved in step 3.
  const parts = html.split(/(<[^>]+>)/);
  let skip = 0;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (!p) continue;
    if (p[0] === '<') {
      if (AR_SKIP.test(p) && !p.endsWith('/>')) skip++;
      else if (AR_SKIP_CLOSE.test(p) && skip) skip--;
      else if (p[1] !== '!') parts[i] = translateAttrs(p, dict);   // leave comments alone
      continue;
    }
    if (skip) continue;
    const key = p.replace(/\s+/g, ' ').trim();
    if (key && dict[key] != null) parts[i] = p.match(/^\s*/)[0] + dict[key] + p.match(/\s*$/)[0];
  }
  html = parts.join('');

  // 3 · inject Arabic-only blocks; strip en-only spans
  html = html.replace(/[ \t]*<!--nyx:ar ([\w-]+)-->/g, (m, k) => (blocks[k] != null ? blocks[k] : m));
  html = html.replace(/<!--nyx:en-only-->[\s\S]*?<!--\/nyx:en-only-->/g, '');

  // 4 · localize cross-page links for the Arabic page
  html = html.split('index.ar.html').join('index.html');          // switcher → English page
  html = html.split('docs/docs.html').join('docs/docs.ar.html');  // docs links → Arabic docs
  html = html.replace(/hreflang="ar"/g, 'hreflang="en"');         // switcher now points at EN

  writeText('index.ar.html', html);
  return html;
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

function report(modules, { minCss, css, minJs, js, esm, ar, llms }) {
  console.log(`Built ${modules.length} component files + nyx.bundle.css in components/:`);
  console.log(`  ${modules.map((n) => `${n}.css`).join(', ')}`);
  console.log('Distribution (dist/):');
  console.log(`  nyx.min.css   ${kb(minCss)} min · ${gzip(minCss)} gzip   (source ${kb(css)})`);
  console.log(`  nyx.min.js    ${kb(minJs)} min · ${gzip(minJs)} gzip   (source ${kb(js)}) + nyx.min.js.map`);
  console.log(`  nyx.mjs       ${kb(esm)} ESM   (default export → Nyx)`);
  console.log('Generated pages:');
  console.log(`  index.ar.html   ${kb(ar)}   (from index.html + locales/ar.json + ar.blocks.html)`);
  console.log(`  llms.txt · llms-full.txt   ${kb(llms.short)} / ${kb(llms.full)}   (${llms.sections} sections, ${llms.classes} classes, ${llms.tokens} tokens)`);
}

main();

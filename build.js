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

/* ------------------------------------------------------------------ *
 *  Machine-readable manifest — dist/manifest.json.
 *  Every class (with its section, module file, source line, states and
 *  the tokens it reads) and every behaviour (its init function, the
 *  selectors it claims, the data-nyx-* attributes it reads and the
 *  events it fires), derived from src/nyx.css, src/nyx.js and
 *  src/nyx.d.ts. Nothing here is hand-maintained, so it cannot drift.
 *  reference.html is rendered from this same object.
 * ------------------------------------------------------------------ */

// Line number (1-based) of a character offset.
const lineAt = (src, index) => src.slice(0, index).split('\n').length;

// Body of the block whose opening brace is at `open`, brace-matched.
function braceBody(src, open) {
  for (let i = open, depth = 0; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && !--depth) return src.slice(open + 1, i);
  }
  return '';
}

// Visit every style rule as (selector, body, index), descending into at-rules.
// Comments and string literals are skipped so braces inside them can't confuse
// the scanner. @keyframes offsets ("0%") come through too — callers filter.
function eachStyleRule(css, visit) {
  let i = 0, from = 0;
  while (i < css.length) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') {
      const leading = !css.slice(from, i).trim();                  // a comment before the selector, not inside it
      const end = css.indexOf('*/', i + 2);
      i = end < 0 ? css.length : end + 2;
      if (leading) from = i;                                       // …so it can't be mistaken for the selector's start
      continue;
    }
    if (c === '"' || c === "'") {
      for (i++; i < css.length && css[i] !== c; i++) if (css[i] === '\\') i++;
      i++;
      continue;
    }
    if (c === '{') {
      const selector = css.slice(from, i).trim();
      if (selector[0] === '@') { i++; from = i; continue; }        // at-rule — descend into its block
      let depth = 1, j = i + 1;
      while (j < css.length && depth) {                            // consume to the matching brace
        if (css[j] === '{') depth++;
        else if (css[j] === '}') depth--;
        j++;
      }
      visit(selector, css.slice(i + 1, j - 1), i);
      i = j; from = i;
      continue;
    }
    if (c === '}') { i++; from = i; continue; }
    i++;
  }
}

// The compound a rule actually styles: the last one in the selector.
// ".nyx-btn-group > .nyx-btn:first-child" → ".nyx-btn:first-child".
const subjectCompound = (sel) => sel.trim().split(/\s*[>+~]\s*|\s+/).pop() || '';

// A .nyx-* class in a selector. The optional tail catches the state variants,
// whose ':' is backslash-escaped in CSS but plain in the HTML attribute
// (".nyx-hover\:shadow-lg" ← class="nyx-hover:shadow-lg").
const CLASS_RE = /\.nyx-[a-z0-9-]+(?:\\:[a-z0-9-]+)?/g;
// Pseudo-classes/elements on a compound, ignoring an escaped ':' from a variant.
const STATE_RE = /(?<!\\)::?[a-z-]+(?:\([^)]*\))?/g;
// ".nyx-hover\:shadow-lg" → the class as it is written in HTML.
const className = (match) => match.slice(1).replace(/\\/g, '');

// Every .nyx-* class in the CSS, with where it lives and what it reads.
function cssClasses(css) {
  // Only banners that map to a module file are sections; descriptive sub-banners inside one
  // ("3D Tilt Card") are part of their enclosing section, exactly as splitIntoComponents
  // slices them. Resolving to the nearest *named* banner keeps every class's `module` real.
  const banners = findBanners(css).filter((b) => fileNameFor(b.title));
  const sectionAt = (index) => {
    let hit = null;
    for (const b of banners) { if (b.index <= index) hit = b; else break; }
    return hit;
  };
  const ruStart = css.indexOf(RU_START), ruEnd = css.indexOf(RU_END);
  const generated = (index) => ruStart >= 0 && index > ruStart && index < ruEnd;

  const classes = new Map();
  const touch = (name, index) => {
    let c = classes.get(name);
    if (!c) {
      const banner = sectionAt(index);
      c = {
        name,
        component: name.replace(/^nyx-/, '').split(/[-:]/)[0],
        section: banner ? banner.title : 'BASE',
        module: banner ? fileNameFor(banner.title) || null : 'base',
        line: lineAt(css, index),
        rules: 0,
        states: [],
        tokens: [],
        js: [],
      };
      if (generated(index)) c.generated = true;
      classes.set(name, c);
    }
    return c;
  };

  eachStyleRule(css, (selector, body, index) => {
    if (!/\.nyx-/.test(selector)) return;
    const tokens = [...new Set(body.match(/--nyx-[a-z0-9-]+/g) || [])];
    selector.split(',').forEach((one) => {
      const subject = subjectCompound(one);
      const owned = subject.match(CLASS_RE) || [];
      const mentioned = one.match(CLASS_RE) || [];
      // Every class in the selector is registered; only the subject's classes
      // inherit the rule's tokens and states (a descendant selector styles its
      // subject, not its context).
      mentioned.forEach((m) => touch(className(m), index));
      owned.forEach((m) => {
        const c = touch(className(m), index);
        c.rules++;
        tokens.forEach((t) => { if (!c.tokens.includes(t)) c.tokens.push(t); });
        (subject.match(STATE_RE) || []).forEach((s) => { if (!c.states.includes(s)) c.states.push(s); });
      });
    });
  });

  return [...classes.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// Union of the overlay kinds overlayType() can return — the "<type>" that the
// runtime interpolates into nyx:<type>-show and friends.
function overlayTypes(js) {
  const m = /function overlayType\([\s\S]*?\n/.exec(js);
  return m ? [...new Set(m[0].match(/'([a-z]+)'/g) || [])].map((s) => s.slice(1, -1)) : [];
}

// Behaviours = the runtime's initX(root) functions. For each: the selectors it
// claims, the attributes it reads, the events it fires, and whether init() runs
// it automatically. Sub-behaviours (called by another init) are marked auto:false.
function jsBehaviours(js, css) {
  const types = overlayTypes(js);
  // The auto-init registry: `const INIT_STEPS = [ … ]`, the list init() iterates. Anchored
  // on the declaration and hard-failed if absent — a silent miss here would flip every
  // behaviour to auto:false and the manifest would still look internally consistent.
  const stepsAt = js.indexOf('const INIT_STEPS = [');
  if (stepsAt < 0) throw new Error('jsBehaviours: INIT_STEPS registry not found in src/nyx.js');
  const initBody = js.slice(stepsAt, js.indexOf('\n  ];', stepsAt));
  const auto = new Set(initBody.match(/init[A-Z]\w*/g) || []);
  if (!auto.size) throw new Error('jsBehaviours: INIT_STEPS matched no behaviours');
  // Some behaviours are handed elements by the registry itself, not a root:
  //   function spy(root) { $$('[data-nyx-spy]', root).forEach(initSpy); }
  const callSites = {};
  for (const m of initBody.matchAll(/\$\$\(\s*'([^']+)'[^)]*\)\s*\.forEach\(\s*(init[A-Z]\w*)/g)) {
    (callSites[m[2]] = callSites[m[2]] || []).push(m[1]);
  }

  const behaviours = [];
  for (const m of js.matchAll(/\n {2}function (init[A-Z]\w*)\(([^)]*)\)\s*\{/g)) {
    const open = m.index + m[0].length - 1;
    const body = braceBody(js, open);
    const line = lineAt(js, m.index) + 1;
    const trailing = /^[^\n]*?\/\/\s*(.+?)\s*$/.exec(js.slice(open + 1, js.indexOf('\n', open)));
    const marker = /\/\* -+ ([^*]+?) -+ \*\/(?![\s\S]*\/\* -+ [^*]+? -+ \*\/)/.exec(js.slice(0, m.index));

    const selectors = [...new Set(
      [...body.matchAll(/(?:\$\$?|querySelector(?:All)?)\(\s*'([^']+)'/g)].map((s) => s[1])
        .concat(callSites[m[1]] || [])
        .filter((s) => /\.nyx-|\[data-nyx-/.test(s))
    )];
    const events = [...new Set(
      [...body.matchAll(/'(nyx:[a-z-]+)'/g)].map((e) => e[1]).concat(
        [...body.matchAll(/'nyx:'\s*\+\s*\w+\s*\+\s*'(-[a-z-]+)'/g)]
          .flatMap((e) => types.map((t) => `nyx:${t}${e[1]}`))
      )
    )].sort();

    behaviours.push({
      name: m[1].replace(/^init/, '').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase(),
      fn: m[1],
      group: marker ? marker[1].trim() : null,
      summary: trailing ? trailing[1] : null,
      line,
      auto: auto.has(m[1]),
      selectors,
      classes: [...new Set(selectors.flatMap((s) => (s.match(/\.nyx-[a-z0-9-]+/g) || []).map((c) => c.slice(1))))]
        .filter((c) => css.includes('.' + c)),
      attributes: [...new Set(body.match(/data-nyx-[a-z0-9-]+/g) || [])].sort(),
      events,
    });
  }
  return behaviours.sort((a, b) => a.name.localeCompare(b.name));
}

// Every nyx:* event the runtime dispatches, with the cancelable flag (emitBefore
// creates the cancelable pair) and the keys carried on event.detail.
function jsEvents(js, behaviours) {
  const types = overlayTypes(js);
  const events = new Map();
  const touch = (name) => {
    let e = events.get(name);
    if (!e) events.set(name, (e = { name, cancelable: false, detail: [], firedBy: [] }));
    return e;
  };
  // Line ranges of the runtime's top-level functions, so a dispatch can name the
  // function it lives in — events fired from a helper rather than from initX().
  const scopes = [];
  for (const m of js.matchAll(/\n {2}(?:function (\w+)|(?:const|let) (\w+) = (?:\([^)]*\)|\w+) =>)\s*[({]/g)) {
    const start = lineAt(js, m.index) + 1;
    const open = js.indexOf('{', m.index + m[0].length - 1);
    scopes.push({ name: m[1] || m[2], start, end: start + braceBody(js, open).split('\n').length });
  }
  const scopeAt = (line) => (scopes.filter((s) => line >= s.start && line <= s.end).pop() || {}).name;

  js.split('\n').forEach((line, i) => {
    if (!/CustomEvent\(|emitBefore\(/.test(line)) return;
    const cancelable = /emitBefore\(|cancelable:\s*true/.test(line);   // the helper, or an inline CustomEvent
    const detail = [...new Set((/detail:\s*\{([^}]*)\}/.exec(line) || [, ''])[1]
      .split(',').map((d) => d.split(':')[0].trim()).filter(Boolean))];
    const names = [...line.matchAll(/'(nyx:[a-z-]+)'/g)].map((n) => n[1])
      .concat([...line.matchAll(/'nyx:'\s*\+\s*\w+\s*\+\s*'(-[a-z-]+)'/g)]
        .flatMap((n) => types.map((t) => `nyx:${t}${n[1]}`)));
    const scope = scopeAt(i + 1);
    names.forEach((name) => {
      const e = touch(name);
      if (cancelable) e.cancelable = true;
      detail.forEach((d) => { if (!e.detail.includes(d)) e.detail.push(d); });
      if (scope && !e.firedBy.includes(scope)) e.firedBy.push(scope);
      e.line = e.line || i + 1;
    });
  });
  const behaviourOf = new Map(behaviours.map((b) => [b.fn, b.name]));
  events.forEach((e) => { e.firedBy = e.firedBy.map((fn) => behaviourOf.get(fn) || fn); });
  return [...events.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// data-nyx-* attributes, with the values the runtime compares against
// (data-nyx-toggle="modal" …) and the behaviours that read each one.
function jsAttributes(js, behaviours) {
  const attrs = new Map();
  const touch = (name) => {
    let a = attrs.get(name);
    if (!a) attrs.set(name, (a = { name, values: [], readBy: [] }));
    return a;
  };
  (js.match(/data-nyx-[a-z0-9-]+/g) || []).forEach(touch);
  for (const m of js.matchAll(/\[(data-nyx-[a-z0-9-]+)=["']([^"'\]]+)["']\]/g)) {
    const a = touch(m[1]);
    if (!a.values.includes(m[2])) a.values.push(m[2]);
  }
  behaviours.forEach((b) => b.attributes.forEach((name) => {
    const a = attrs.get(name);
    if (a && !a.readBy.includes(b.name)) a.readBy.push(b.name);
  }));
  return [...attrs.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// The imperative API, read from the NyxStatic interface in nyx.d.ts so each
// entry carries its real signature and doc comment.
function apiSurface(dts, js) {
  const body = braceBody(dts, dts.indexOf('{', dts.indexOf('interface NyxStatic')));
  const api = new Map();
  let group = null;
  for (const m of body.matchAll(/^ {4}(?:\/\/ -+ ([\w /-]+?) -+|(?:\/\*\*([\s\S]*?)\*\/\s*\n\s*)?(?:readonly )?(\w+)([^;\n]*);)$/gm)) {
    if (m[1]) { group = m[1].trim(); continue; }
    const name = m[3];
    const doc = (m[2] || '').split('\n').map((l) => l.replace(/^\s*\*?\s?/, '')).join(' ').trim();
    const entry = api.get(name);
    if (entry) { entry.signatures.push(m[4].trim()); continue; }   // overload
    api.set(name, { name, group, doc, signatures: [m[4].trim()], runtime: new RegExp(`\\b${name}\\b`).test(js) });
  }
  return [...api.values()];
}

// Flat token list — name, category, and the value in each theme.
function flatTokens(t) {
  const rows = new Map();
  ['dark', 'light'].forEach((theme) => {
    Object.keys(t.themes[theme]).forEach((cat) => {
      Object.keys(t.themes[theme][cat]).forEach((name) => {
        const row = rows.get(name) || { name, cssVar: `--nyx-${name}`, category: cat };
        row[theme] = t.themes[theme][cat][name].$value;
        rows.set(name, row);
      });
    });
  });
  return [...rows.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function buildManifest(css, js, dts, tokens) {
  const banners = findBanners(css).filter((b) => fileNameFor(b.title));   // sections == module files
  const classes = cssClasses(css);
  const behaviours = jsBehaviours(js, css);
  const events = jsEvents(js, behaviours);
  const attributes = jsAttributes(js, behaviours);
  const api = apiSurface(dts, js);

  // Split each class's var() references into global design tokens and the
  // element-local custom properties a page (or the runtime) sets itself —
  // e.g. .nyx-affix reads --nyx-affix-top, which has no :root default.
  const declared = new Set(tokens.map((t) => t.cssVar));
  classes.forEach((c) => {
    const local = c.tokens.filter((t) => !declared.has(t));
    c.tokens = c.tokens.filter((t) => declared.has(t));
    if (local.length) c.custom = local;
  });

  // Cross-link: which behaviours drive each class.
  const byName = new Map(classes.map((c) => [c.name, c]));
  behaviours.forEach((b) => b.classes.forEach((name) => {
    const c = byName.get(name);
    if (c && !c.js.includes(b.name)) c.js.push(b.name);
  }));

  const sections = banners.map((b) => {
    const numbered = /^(\d+)\./.exec(b.title);
    const module = fileNameFor(b.title);
    return {
      id: numbered ? Number(numbered[1]) : null,
      title: b.title,
      module,
      file: module ? `dist/components/${module}.css` : null,
      line: lineAt(css, b.index),
      classes: classes.filter((c) => c.section === b.title).map((c) => c.name),
    };
  });

  const components = [...classes.reduce((map, c) => {
    const comp = map.get(c.component) || { name: c.component, sections: [], classes: [], js: [] };
    comp.classes.push(c.name);
    if (!comp.sections.includes(c.section)) comp.sections.push(c.section);
    c.js.forEach((b) => { if (!comp.js.includes(b)) comp.js.push(b); });
    return map.set(c.component, comp);
  }, new Map()).values()].sort((a, b) => a.name.localeCompare(b.name));

  return {
    name: pkg.name,
    version: VERSION,
    description: pkg.description,
    homepage: SITE,
    generator: 'build.js — derived from src/nyx.css, src/nyx.js and src/nyx.d.ts. Do not edit by hand.',
    sources: { css: 'src/nyx.css', js: 'src/nyx.js', types: 'src/nyx.d.ts' },
    counts: {
      sections: sections.length, components: components.length, classes: classes.length,
      behaviours: behaviours.length, attributes: attributes.length,
      events: events.length, api: api.length, tokens: tokens.length,
    },
    sections, components, classes, behaviours, attributes, events, api, tokens,
  };
}

function writeManifest(css, js, tokenSet) {
  const dts = read('src/nyx.d.ts');
  const manifest = buildManifest(css, js, dts, flatTokens(tokenSet));
  writeText('dist/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  const c = manifest.counts;
  console.log(`Wrote manifest.json (${c.classes} classes · ${c.behaviours} behaviours · ${c.attributes} attributes · ${c.events} events · ${c.api} API · ${c.tokens} tokens)`);
  return manifest;
}

/* ------------------------------------------------------------------ *
 *  reference.html — one searchable page for the whole framework,
 *  rendered from the manifest. The manifest is inlined as JSON so the
 *  page is self-contained: it works over file://, needs no fetch, and
 *  stays in sync because both come from the same build.
 *  It dogfoods Nyx itself (nyx.css + nyx.js), like the landing pages.
 * ------------------------------------------------------------------ */

const REPO = (pkg.repository.url || '').replace(/^git\+/, '').replace(/\.git$/, '');

// JSON safe to sit inside <script type="application/json">.
const inlineJson = (o) => JSON.stringify(o)
  .replace(/</g, '\\u003c')                                        // can't open a tag (</script>, <!--)
  .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');   // not valid raw in a JS string

function referenceStyles() {
  return `
    .ref-shell{max-width:1100px;margin-inline:auto;padding:var(--nyx-s5) var(--nyx-s4) var(--nyx-s8)}
    .ref-head{display:flex;flex-wrap:wrap;gap:var(--nyx-s3);align-items:baseline;justify-content:space-between;margin-bottom:var(--nyx-s2)}
    .ref-search{position:sticky;top:0;z-index:20;padding:var(--nyx-s3) 0;background:var(--nyx-bg);border-bottom:1px solid var(--nyx-border)}
    .ref-search input{font-family:var(--nyx-font-mono)}
    .ref-filters{display:flex;flex-wrap:wrap;gap:6px;margin-top:var(--nyx-s3)}
    .ref-filters button{cursor:pointer;font:inherit;font-size:var(--nyx-fs-sm)}
    .ref-filters button[aria-pressed="true"]{background:color-mix(in srgb,var(--nyx-accent) 16%,transparent);border-color:var(--nyx-accent);color:var(--nyx-accent)}
    .ref-status{margin:var(--nyx-s4) 0 var(--nyx-s2);font-size:var(--nyx-fs-sm);color:var(--nyx-text-muted)}
    .ref-list{display:grid;gap:var(--nyx-s3)}
    .ref-row{padding:var(--nyx-s4);display:grid;gap:var(--nyx-s2);align-content:start}
    .ref-row h3{margin:0;font-family:var(--nyx-font-mono);font-size:var(--nyx-fs-base);font-weight:600;word-break:break-word}
    .ref-row p{margin:0;color:var(--nyx-text-muted);font-size:var(--nyx-fs-sm)}
    .ref-top{display:flex;flex-wrap:wrap;gap:var(--nyx-s2);align-items:center;justify-content:space-between}
    .ref-meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
    .ref-meta code{font-size:var(--nyx-fs-xs)}
    .ref-kv{display:grid;grid-template-columns:auto 1fr;gap:4px var(--nyx-s3);font-size:var(--nyx-fs-sm)}
    .ref-kv dt{color:var(--nyx-text-muted)}
    .ref-kv dd{margin:0;display:flex;flex-wrap:wrap;gap:6px}
    .ref-swatch{width:16px;height:16px;border-radius:4px;border:1px solid var(--nyx-border);display:inline-block;vertical-align:-3px}
    .ref-code{font-family:var(--nyx-font-mono);font-size:var(--nyx-fs-xs);background:var(--nyx-surface-2);border:1px solid var(--nyx-border);border-radius:var(--nyx-radius-sm);padding:1px 6px;white-space:nowrap}
    mark{background:color-mix(in srgb,var(--nyx-accent) 30%,transparent);color:inherit;border-radius:3px;padding:0 2px}
    @media(max-width:640px){.ref-kv{grid-template-columns:1fr}}`;
}

// Everything the page needs to run: index the manifest, filter, render.
function referenceScript() {
  return `
  const M = JSON.parse(document.getElementById('nyx-manifest').textContent);
  const SRC = ${JSON.stringify(REPO)} + '/blob/main/';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const chip = (t, cls) => t ? '<span class="nyx-badge' + (cls ? ' nyx-badge-' + cls : '') + '">' + esc(t) + '</span>' : '';
  const codes = (list) => (list || []).map((x) => '<code class="ref-code">' + esc(x) + '</code>').join(' ');
  const link = (file, line) => '<a class="nyx-badge" href="' + SRC + file + '#L' + line + '" target="_blank" rel="noopener">' + esc(file.split('/').pop()) + ':' + line + '</a>';
  const kv = (pairs) => {
    const rows = pairs.filter((p) => p[1]);
    return rows.length ? '<dl class="ref-kv">' + rows.map((p) => '<dt>' + p[0] + '</dt><dd>' + p[1] + '</dd>').join('') + '</dl>' : '';
  };

  // ---- one flat, searchable row per manifest entry -------------------
  const ROWS = [];
  const push = (kind, name, sub, meta, body, extra) => ROWS.push({
    kind, name, sub, meta, body,
    hay: (name + ' ' + (sub || '') + ' ' + (extra || '')).toLowerCase(),
  });

  M.classes.forEach((c) => push('class', '.' + c.name, c.section,
    chip(c.kind) + (c.js.length ? chip('js: ' + c.js.join(', '), 'info') : '') + (c.generated ? chip('generated') : '') + link(M.sources.css, c.line),
    kv([
      ['module', c.module ? codes([c.module + '.css']) : ''],
      ['states', codes(c.states)],
      ['tokens', codes(c.tokens)],
      ['you set', codes(c.custom)],
      ['behaviour', c.js.length ? codes(c.js) : ''],
    ]),
    c.component + ' ' + c.module + ' ' + c.tokens.join(' ') + ' ' + (c.custom || []).join(' ') + ' ' + c.js.join(' ')));

  M.behaviours.forEach((b) => push('behaviour', b.name, b.group || 'runtime',
    chip(b.auto ? 'auto-init' : 'nested', b.auto ? 'success' : '') + chip(b.fn) + link(M.sources.js, b.line),
    (b.summary ? '<p>' + esc(b.summary) + '</p>' : '') + kv([
      ['selectors', codes(b.selectors)],
      ['attributes', codes(b.attributes)],
      ['events', codes(b.events)],
    ]),
    b.fn + ' ' + (b.summary || '') + ' ' + b.selectors.join(' ') + ' ' + b.attributes.join(' ') + ' ' + b.events.join(' ')));

  M.attributes.forEach((a) => push('attribute', a.name, 'declarative API',
    chip(a.values.length ? a.values.length + ' values' : 'boolean'),
    kv([['values', codes(a.values)], ['read by', codes(a.readBy)]]),
    a.values.join(' ') + ' ' + a.readBy.join(' ')));

  M.events.forEach((e) => push('event', e.name, 'lifecycle',
    e.cancelable ? chip('cancelable', 'warning') : chip('bubbles'),
    kv([['detail', codes(e.detail)], ['fired by', codes(e.firedBy)]]),
    e.firedBy.join(' ') + ' ' + (e.cancelable ? 'cancelable preventDefault' : '')));

  M.api.forEach((a) => push('api', 'Nyx.' + a.name, a.group || 'runtime',
    a.signatures.length > 1 ? chip(a.signatures.length + ' overloads') : '',
    '<p><code class="ref-code">' + a.signatures.map((s) => esc('Nyx.' + a.name + s)).join('</code><br><code class="ref-code">') + '</code></p>'
      + (a.doc ? '<p>' + esc(a.doc) + '</p>' : ''),
    a.doc + ' ' + a.signatures.join(' ')));

  M.tokens.forEach((t) => push('token', t.cssVar, t.category,
    t.category === 'color' ? '<span class="ref-swatch" style="background:' + esc(t.dark) + '"></span>' : '',
    kv([['dark', codes([t.dark])], ['light', codes([t.light])]]),
    t.dark + ' ' + t.light));

  M.sections.forEach((s) => push('section', s.title, s.module ? s.module + '.css' : 'source',
    chip(s.classes.length + ' classes') + link(M.sources.css, s.line),
    kv([['classes', codes(s.classes.slice(0, 60))]]),
    s.classes.join(' ')));

  // ---- filter + render ----------------------------------------------
  const KINDS = ['class', 'behaviour', 'attribute', 'event', 'api', 'token', 'section'];
  const LIMIT = 300;
  const input = document.getElementById('q');
  const list = document.getElementById('results');
  const status = document.getElementById('status');
  let kind = 'all';

  const highlight = (text, terms) => {
    let out = esc(text);
    terms.forEach((t) => {
      if (!t) return;
      out = out.replace(new RegExp('(' + t.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&') + ')', 'ig'), '<mark>$1</mark>');
    });
    return out;
  };

  // Rank by how directly the name answers the query: exact, then prefix, then
  // anywhere in the name, then a body-only match. Ties keep manifest order.
  const score = (r, terms) => {
    if (!terms.length) return 0;
    const name = r.name.toLowerCase().replace(/^[.]/, '');
    return Math.min(...terms.map((t) =>
      name === t ? 0 : name.startsWith(t) || name.startsWith('nyx-' + t) || name.startsWith('nyx:' + t) ? 1 : name.includes(t) ? 2 : 3));
  };

  function render() {
    const q = input.value.trim().toLowerCase();
    const terms = q.split(/\\s+/).filter(Boolean);
    const hits = ROWS
      .filter((r) => (kind === 'all' || r.kind === kind) && terms.every((t) => r.hay.includes(t)))
      .map((r, i) => ({ r, i, s: score(r, terms) }))
      .sort((a, b) => a.s - b.s || a.i - b.i)
      .map((x) => x.r);
    status.textContent = hits.length
      ? 'Showing ' + Math.min(hits.length, LIMIT) + ' of ' + hits.length + ' matches' + (q ? ' for "' + q + '"' : '') + '.'
      : 'No matches' + (q ? ' for "' + q + '"' : '') + '.';
    list.innerHTML = hits.slice(0, LIMIT).map((r) =>
      '<article class="nyx-card ref-row" id="' + esc(r.kind + '-' + r.name.replace(/[^\\w-]/g, '')) + '">'
      + '<div class="ref-top"><h3>' + highlight(r.name, terms) + '</h3>'
      + '<div class="ref-meta">' + chip(r.kind, 'info') + r.meta + '</div></div>'
      + '<p>' + esc(r.sub || '') + '</p>' + r.body + '</article>').join('')
      || '<div class="nyx-empty"><div class="nyx-empty-icon">∅</div><p>Nothing matches that search.</p></div>';
    const url = new URL(location.href);
    q ? url.searchParams.set('q', q) : url.searchParams.delete('q');
    kind !== 'all' ? url.searchParams.set('kind', kind) : url.searchParams.delete('kind');
    history.replaceState(null, '', url);
  }

  document.querySelectorAll('.ref-filters button').forEach((b) => b.addEventListener('click', () => {
    kind = b.dataset.kind;
    document.querySelectorAll('.ref-filters button').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    render();
  }));
  input.addEventListener('input', render);
  document.addEventListener('keydown', (e) => {                     // "/" focuses search, Esc clears
    if (e.key === '/' && document.activeElement !== input) { e.preventDefault(); input.focus(); input.select(); }
    else if (e.key === 'Escape' && document.activeElement === input) { input.value = ''; render(); }
  });

  const params = new URLSearchParams(location.search);
  input.value = params.get('q') || '';
  if (KINDS.includes(params.get('kind'))) {
    kind = params.get('kind');
    document.querySelectorAll('.ref-filters button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.kind === kind)));
  }
  render();`;
}

function buildReferencePage(manifest) {
  const c = manifest.counts;
  const kinds = [
    ['all', 'Everything'], ['class', `Classes (${c.classes})`], ['behaviour', `Behaviours (${c.behaviours})`],
    ['attribute', `Attributes (${c.attributes})`], ['event', `Events (${c.events})`],
    ['api', `JS API (${c.api})`], ['token', `Tokens (${c.tokens})`], ['section', `Sections (${c.sections})`],
  ];
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Nyx reference — every class &amp; behaviour · v${VERSION}</title>
<meta name="description" content="Searchable reference for every Nyx class, behaviour, attribute, event, JS method and design token. Generated from source." />
<link rel="canonical" href="${SITE}/reference.html" />
<link rel="stylesheet" href="src/nyx.css" />
<style>${referenceStyles()}
</style>
</head>
<body class="nyx">
<main class="ref-shell">
  <div class="ref-head">
    <div>
      <h1>Nyx reference</h1>
      <p class="nyx-text-muted">Every class and behaviour, generated from <code class="ref-code">src/nyx.css</code> + <code class="ref-code">src/nyx.js</code>. Machine-readable twin: <a class="ref-code" href="dist/manifest.json">dist/manifest.json</a></p>
    </div>
    <div class="ref-meta">
      <span class="nyx-badge nyx-badge-info">v${VERSION}</span>
      <button class="nyx-btn nyx-btn-sm nyx-btn-ghost" onclick="Nyx.toggleTheme()" aria-label="Toggle theme">◐ Theme</button>
      <button class="nyx-btn nyx-btn-sm nyx-btn-ghost" onclick="Nyx.toggleDir()" aria-label="Toggle direction">⇄ Dir</button>
      <a class="nyx-btn nyx-btn-sm nyx-btn-ghost" href="docs/docs.html">Docs</a>
    </div>
  </div>

  <div class="ref-search">
    <label class="nyx-label" for="q">Search the framework <span class="nyx-kbd">/</span></label>
    <input class="nyx-input" id="q" type="search" autocomplete="off" spellcheck="false"
           placeholder="btn, data-nyx-toggle, nyx:tab-show, --nyx-accent, combobox…" />
    <div class="ref-filters" role="group" aria-label="Filter by kind">
      ${kinds.map(([k, label], i) => `<button class="nyx-btn nyx-btn-sm nyx-btn-ghost" data-kind="${k}" aria-pressed="${i === 0}">${label}</button>`).join('\n      ')}
    </div>
  </div>

  <p class="ref-status" id="status" role="status" aria-live="polite"></p>
  <div class="ref-list" id="results"></div>
</main>

<script id="nyx-manifest" type="application/json">${inlineJson(manifest)}</script>
<script src="src/nyx.js"></script>
<script>${referenceScript()}
</script>
</body>
</html>
`;
}

function writeReferencePage(manifest) {
  const html = buildReferencePage(manifest);
  writeText('reference.html', html);
  return html;
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
  const tokens = writeTokens(css);                     // tokens.json + tokens.figma.json
  writeText('MIGRATION.md', require('./tools/migrate').generateCheatsheet());  // Bootstrap→NYX cheat sheet (from the codemod map)

  // 5 · machine-readable manifest of every class + behaviour, and the page rendered from it
  const manifest = writeManifest(css, js, tokens);
  const reference = writeReferencePage(manifest);

  report(modules, { minCss, css, minJs, js, esm, ar, llms, manifest, reference });
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

  // One file per *named* section banner. Descriptive sub-banners inside a section
  // ("3D Tilt Card (.nyx-tilt)") map to no file — their rules belong to the section that
  // encloses them, so the slice runs on to the next named banner. Returning early here
  // instead would drop that CSS from every module while leaving it in the bundle.
  banners.forEach((banner, i) => {
    const name = fileNameFor(banner.title);
    if (!name) return;                                 // absorbed by the enclosing section
    let j = i + 1;
    while (j < banners.length && !fileNameFor(banners[j].title)) j++;
    const end = j < banners.length ? banners[j].index : css.length;
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
    .replace(/\s*([{};,>])\s*/g, '$1')                         // trim around safe punctuation (keeps calc()/+~ valid)
    // ':' is deliberately NOT in the class above: the space before a pseudo-class is a
    // descendant combinator, and eating it rewrites the selector ("body.nyx :focus-visible"
    // → "body.nyx:focus-visible", which matches <body> instead of its focused descendant).
    // Trim around ':' only where it cannot be a combinator — declarations and media features.
    .replace(/([{;])\s*([-\w]+)\s*:\s*/g, '$1$2:')             // property: value
    .replace(/\(\s*([-\w]+)\s*:\s*/g, '($1:')                  // (min-width: 640px)
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
    `- [Searchable reference](${SITE}/reference.html) — the same surface as a filterable page.`,
    `- [manifest.json](${SITE}/dist/manifest.json) — machine-readable: every class (section, module, source line, tokens it reads) and every behaviour (selectors, attributes, events).`,
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

function report(modules, { minCss, css, minJs, js, esm, ar, llms, manifest, reference }) {
  console.log(`Built ${modules.length} component files + nyx.bundle.css in components/:`);
  console.log(`  ${modules.map((n) => `${n}.css`).join(', ')}`);
  console.log('Distribution (dist/):');
  console.log(`  nyx.min.css   ${kb(minCss)} min · ${gzip(minCss)} gzip   (source ${kb(css)})`);
  console.log(`  nyx.min.js    ${kb(minJs)} min · ${gzip(minJs)} gzip   (source ${kb(js)}) + nyx.min.js.map`);
  console.log(`  nyx.mjs       ${kb(esm)} ESM   (default export → Nyx)`);
  console.log('Generated pages:');
  console.log(`  index.ar.html   ${kb(ar)}   (from index.html + locales/ar.json + ar.blocks.html)`);
  console.log(`  llms.txt · llms-full.txt   ${kb(llms.short)} / ${kb(llms.full)}   (${llms.sections} sections, ${llms.classes} classes, ${llms.tokens} tokens)`);
  console.log(`  reference.html   ${kb(reference)}   (searchable, renders dist/manifest.json — ${manifest.counts.classes} classes + ${manifest.counts.behaviours} behaviours)`);
}

main();

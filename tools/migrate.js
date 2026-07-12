#!/usr/bin/env node
/*!
 * migrate.js — Bootstrap → NYX codemod + cheat-sheet generator.
 *
 *   node tools/migrate.js <files…>          # dry run: print what would change
 *   node tools/migrate.js --write <files…>  # rewrite the files in place
 *   node tools/migrate.js --cheatsheet      # (re)generate MIGRATION.md from the map
 *
 * It rewrites Bootstrap class tokens inside class="…" attributes and the
 * data-bs-* attribute prefix. The map is the single source of truth for both
 * the codemod and the generated cheat sheet, so they never drift.
 *
 * Scope: the common Bootstrap 4/5 surface. Classes with no 1:1 NYX equivalent
 * are left untouched and reported as "review" so a human can decide.
 */
'use strict';

/* ---- exact token map (Bootstrap class → NYX class) ---- */
const MAP = {
  // buttons
  'btn': 'nyx-btn',
  'btn-primary': 'nyx-btn-primary', 'btn-secondary': 'nyx-btn-secondary', 'btn-danger': 'nyx-btn-danger',
  'btn-outline-primary': 'nyx-btn-outline-primary', 'btn-outline-danger': 'nyx-btn-outline-danger',
  'btn-outline-success': 'nyx-btn-outline-success', 'btn-outline-warning': 'nyx-btn-outline-warning',
  'btn-lg': 'nyx-btn-lg', 'btn-sm': 'nyx-btn-sm', 'btn-group': 'nyx-btn-group', 'btn-link': 'nyx-btn-ghost',
  'btn-close': 'nyx-close',
  // layout
  'container': 'nyx-container', 'container-fluid': 'nyx-container-fluid', 'row': 'nyx-grid',
  // components
  'card': 'nyx-card', 'navbar': 'nyx-navbar', 'nav': 'nyx-nav', 'nav-pills': 'nyx-nav-pills',
  'alert': 'nyx-alert', 'alert-success': 'nyx-alert-success', 'alert-danger': 'nyx-alert-danger',
  'alert-warning': 'nyx-alert-warning', 'alert-info': 'nyx-alert-info',
  'badge': 'nyx-badge',
  'modal': 'nyx-modal', 'modal-content': 'nyx-modal-box', 'modal-title': 'nyx-modal-title',
  'offcanvas': 'nyx-drawer', 'accordion': 'nyx-accordion', 'collapse': 'nyx-collapse',
  'carousel': 'nyx-carousel', 'carousel-item': 'nyx-slide',
  'tooltip': 'nyx-tooltip', 'popover': 'nyx-popover',
  'spinner-border': 'nyx-spinner', 'spinner-grow': 'nyx-spinner',
  'progress': 'nyx-progress', 'pagination': 'nyx-pagination', 'breadcrumb': 'nyx-breadcrumb',
  'list-group': 'nyx-list-group',
  // forms
  'form-control': 'nyx-input', 'form-select': 'nyx-select', 'form-label': 'nyx-label', 'input-group': 'nyx-input-group',
  // sizing / helpers
  'w-25': 'nyx-w-25', 'w-50': 'nyx-w-50', 'w-75': 'nyx-w-75', 'w-100': 'nyx-w-100', 'mw-100': 'nyx-mw-100', 'h-100': 'nyx-h-100',
  'mx-auto': 'nyx-mx-auto', 'border': 'nyx-border', 'border-0': 'nyx-border-0',
  'rounded': 'nyx-rounded', 'rounded-circle': 'nyx-rounded-full', 'rounded-pill': 'nyx-rounded-full',
  'shadow': 'nyx-shadow', 'shadow-sm': 'nyx-shadow-sm', 'shadow-lg': 'nyx-shadow-lg',
  'position-relative': 'nyx-position-relative', 'position-absolute': 'nyx-position-absolute',
  'position-fixed': 'nyx-position-fixed', 'position-sticky': 'nyx-position-sticky',
  'text-truncate': 'nyx-text-truncate', 'text-nowrap': 'nyx-text-nowrap',
  'visually-hidden': 'nyx-visually-hidden', 'sr-only': 'nyx-visually-hidden',
};

/* ---- pattern rules (applied to a single class token if no exact match) ----
   Each: [regex, replacement]. `note` documents non-1:1 behavior for the cheat sheet. */
const PATTERNS = [
  { re: /^col$/, to: 'nyx-col-auto' },
  { re: /^col-(\d{1,2})$/, to: 'nyx-col-$1' },
  { re: /^col-(sm|md|lg|xl)-(\d{1,2})$/, to: 'nyx-col-$1-$2' },
  { re: /^offset-(\d{1,2})$/, to: 'nyx-offset-$1' },
  { re: /^offset-(?:sm|md|lg|xl)-(\d{1,2})$/, to: 'nyx-offset-$1', note: 'NYX offsets are not responsive — breakpoint dropped' },
  // spacing (logical sides + responsive). Bootstrap physical ml/mr/pl/pr → NYX logical ms/me/ps/pe.
  { re: /^(m|mt|mb|ms|me|p|pt|pb|ps|pe|gap)-([0-6])$/, to: 'nyx-$1-$2' },
  { re: /^(m|mt|mb|ms|me|p|pt|pb|ps|pe|gap)-(sm|md|lg|xl)-([0-6])$/, to: 'nyx-$1-$2-$3' },
  { re: /^(m|p)l-([0-6])$/, to: 'nyx-$1s-$2', note: 'physical→logical (LTR: left→start)' },
  { re: /^(m|p)r-([0-6])$/, to: 'nyx-$1e-$2', note: 'physical→logical (LTR: right→end)' },
  // display
  { re: /^d-(none|block|inline|inline-block|flex|inline-flex|grid)$/, to: 'nyx-d-$1' },
  { re: /^d-(sm|md|lg|xl)-(none|block|inline|inline-block|flex|inline-flex|grid)$/, to: 'nyx-d-$1-$2' },
  // text
  { re: /^text-(start|center|end)$/, to: 'nyx-text-$1' },
  { re: /^text-(sm|md|lg|xl)-(start|center|end)$/, to: 'nyx-text-$1-$2' },
  { re: /^text-(uppercase|lowercase|capitalize)$/, to: 'nyx-text-$1' },
  // flex
  { re: /^justify-content-(start|end|center|between|around|evenly)$/, to: 'nyx-justify-$1' },
  { re: /^align-items-(start|end|center|baseline|stretch)$/, to: 'nyx-items-$1' },
  { re: /^flex-row$/, to: 'nyx-flex-row' }, { re: /^flex-row-reverse$/, to: 'nyx-flex-row-reverse' },
  { re: /^flex-column$/, to: 'nyx-flex-col' }, { re: /^flex-column-reverse$/, to: 'nyx-flex-col-reverse' },
  { re: /^gap-([0-6])$/, to: 'nyx-gap-$1' },
  // weights
  { re: /^fw-(light|normal|medium|semibold|bold|black)$/, to: 'nyx-fw-$1' },
];

/* Tokens that look like Bootstrap but have no NYX equivalent → reported for review, not rewritten. */
const REVIEW = /^(btn-(success|warning|info|light|dark)|text-bg-|bg-(primary|success|warning|info)|card-(body|header|footer|title|text)|modal-(dialog|header|body|footer)|list-group-item|page-(item|link)|accordion-(item|header|body|button)|nav-(item|link)|form-check|fs-\d)/;

function mapToken(token) {
  if (Object.prototype.hasOwnProperty.call(MAP, token)) return { to: MAP[token] };
  for (const p of PATTERNS) { if (p.re.test(token)) return { to: token.replace(p.re, p.to) }; }
  if (REVIEW.test(token)) return { review: true };
  return null;
}

function migrateHtml(html) {
  const stats = { classChanges: 0, dataChanges: 0, review: new Set() };
  // Shield regions whose contents are not live markup (code samples, inline styles/scripts) so class
  // tokens and data-bs-* strings inside them are never rewritten. Restored verbatim at the end.
  const shielded = [];
  let out = html.replace(/<(script|style|pre|code)\b[^>]*>[\s\S]*?<\/\1>/gi, (m) => {
    shielded.push(m);
    return `<!--NYXSHIELD${shielded.length - 1}-->`;
  });
  // 1 · class="…" / className="…" — anchor to a real attribute name preceded by whitespace, so framework
  //     bindings (:class, ng-class, v-bind:class, [class]) are left alone.
  out = out.replace(/(\s)(class|className)=("|')(.*?)\3/g, (m, ws, attr, q, body) => {
    const mapped = body.split(/(\s+)/).map((tok) => {
      if (/^\s+$/.test(tok) || tok === '') return tok;
      const r = mapToken(tok);
      if (!r) return tok;
      if (r.review) { stats.review.add(tok); return tok; }
      if (r.to !== tok) stats.classChanges++;
      return r.to;
    }).join('');
    return `${ws}${attr}=${q}${mapped}${q}`;
  });
  // 2 · data-bs-* → data-nyx-* — only in attribute-name position (whitespace before, `=` after), never in prose.
  out = out.replace(/(\s)data-bs-([\w-]+)=/g, (m, ws, rest) => { stats.dataChanges++; return `${ws}data-nyx-${rest}=`; });
  // 3 · toggle value fixups where NYX differs from Bootstrap
  out = out.replace(/data-nyx-toggle=("|')offcanvas\1/g, (m, q) => `data-nyx-toggle=${q}drawer${q}`);
  // restore shielded regions
  out = out.replace(/<!--NYXSHIELD(\d+)-->/g, (m, i) => shielded[Number(i)]);
  return { output: out, stats };
}

/* ---- cheat sheet (Markdown), generated from the same map ---- */
function generateCheatsheet() {
  const rows = Object.keys(MAP).map((k) => `| \`${k}\` | \`${MAP[k]}\` |`).join('\n');
  const patRows = PATTERNS.map((p) => {
    const ex = String(p.re).replace(/^\/\^?|\$?\/[a-z]*$/g, '');   // strip anchors/slashes but KEEP escapes (\d stays \d)
    return `| \`${ex}\` | \`${p.to.replace(/\$\d/g, (s) => `{${s.slice(1)}}`)}\`${p.note ? ` — ${p.note}` : ''} |`;
  }).join('\n');
  return `# Migrate from Bootstrap → NYX

> The #1 way to adopt NYX in an existing project: run the codemod, review a short list, done.
>
> \`\`\`bash
> node tools/migrate.js path/to/**/*.html          # preview
> node tools/migrate.js --write path/to/**/*.html   # apply
> \`\`\`
>
> This file is **generated** from \`tools/migrate.js\` (\`node tools/migrate.js --cheatsheet\`) — edit the map there, not here.

## What the codemod does
1. Rewrites Bootstrap class tokens inside \`class="…"\` (exact + pattern rules below).
2. Rewrites the \`data-bs-*\` attribute prefix to \`data-nyx-*\` (and \`data-bs-toggle="offcanvas"\` → \`…="drawer"\`).
3. Leaves classes with no 1:1 NYX equivalent untouched and prints them as **review** items.

## Exact class map

| Bootstrap | NYX |
|---|---|
${rows}

## Pattern rules

| Bootstrap (pattern) | NYX |
|---|---|
${patRows}

## Manual review (no 1:1 mapping — decide per case)
- \`btn-success\` / \`btn-warning\` / \`btn-info\` / \`btn-light\` / \`btn-dark\` — NYX solid buttons are \`primary\` / \`secondary\` / \`danger\` (+ \`glass\` / \`ghost\` / \`glow\`); pick the closest or theme via \`--nyx-accent\`.
- \`bg-*\` / \`text-bg-*\` badge & background colors — use \`nyx-badge-success\` etc. or the token utilities.
- Component **sub-parts** (\`card-body\`, \`modal-dialog\`/\`modal-header\`/\`modal-body\`, \`accordion-item\`, \`list-group-item\`, \`page-item\`/\`page-link\`, \`nav-link\`, \`form-check\`) — NYX composition differs; see the component docs.
- \`fs-1\`…\`fs-6\` — NYX uses a named scale (\`nyx-text-xs\`…\`nyx-text-3xl\`); map by eye.

## Data-attribute & JS notes
- \`data-bs-toggle\`/\`-target\`/\`-dismiss\` → \`data-nyx-toggle\`/\`-target\`/\`-dismiss\` (done automatically).
- Toggle **values**: \`modal\`, \`collapse\`, \`dropdown\`, \`popover\` match; \`offcanvas\`→\`drawer\` (auto-fixed); **tabs** use \`data-nyx-tab\`/\`data-nyx-panel\`, not \`data-nyx-toggle="tab"\`.
- JS API: Bootstrap's \`new bootstrap.Modal(el).show()\` → \`Nyx.getOrCreateInstance(el).show()\`; \`bootstrap.Carousel\` → \`Nyx.carousel(el)\`.
`;
}

/* ---- CLI ---- */
function main(argv) {
  const fs = require('fs');
  const args = argv.slice(2);
  if (args.includes('--cheatsheet')) {
    fs.writeFileSync(require('path').join(__dirname, '..', 'MIGRATION.md'), generateCheatsheet());
    console.log('Wrote MIGRATION.md');
    return;
  }
  const write = args.includes('--write');
  const files = args.filter((a) => !a.startsWith('--'));
  if (!files.length) { console.log('usage: node tools/migrate.js [--write] <files…>  |  --cheatsheet'); return; }
  let totalC = 0, totalD = 0; const review = new Set();
  files.forEach((f) => {
    const src = fs.readFileSync(f, 'utf8');
    const { output, stats } = migrateHtml(src);
    totalC += stats.classChanges; totalD += stats.dataChanges; stats.review.forEach((r) => review.add(r));
    if (write && output !== src) fs.writeFileSync(f, output);
    console.log(`${write ? 'wrote' : 'would change'} ${f}: ${stats.classChanges} classes, ${stats.dataChanges} data-attrs`);
  });
  console.log(`\nTotal: ${totalC} class + ${totalD} data-attr rewrites across ${files.length} file(s).`);
  if (review.size) console.log(`Review (no 1:1 mapping): ${[...review].sort().join(', ')}`);
  if (!write) console.log('\n(dry run — re-run with --write to apply)');
}

module.exports = { MAP, PATTERNS, mapToken, migrateHtml, generateCheatsheet };
if (require.main === module) main(process.argv);

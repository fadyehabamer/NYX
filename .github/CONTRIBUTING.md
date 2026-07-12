# Contributing to Nyx

Thanks for your interest in improving Nyx! This is a zero‑dependency CSS **+** JS
framework with no bundler and no build framework — just Node for the one build
script. The bar to contribute is intentionally low.

## Project layout

```
src/nyx.css        ← SOURCE OF TRUTH for all styles (the all‑in‑one bundle)
src/nyx.js         ← SOURCE OF TRUTH for the runtime
src/nyx.d.ts       ← SOURCE OF TRUTH for the TypeScript declarations
src/locales/       ← ar.json (translated copy) + ar.blocks.html (AR‑only fragments)
build.js           ← splits src/nyx.css into dist/components/ + writes the min files
dist/components/*.css ← GENERATED — do not edit by hand
dist/nyx.min.css/js ← GENERATED — do not edit by hand
dist/nyx.mjs        ← GENERATED — native ESM entry (bundled from src/nyx.js)
llms.txt/-full.txt  ← GENERATED — AI-consumable class/attr/API reference
fonts/             ← self‑hosted Thmanyah faces (shipped to npm)
docs/              ← documentation site (docs.html + docs.js + locale packs)
examples/          ← full self‑contained example pages
assets/            ← logos + favicons for the site (not shipped to npm)
index.html         ← SOURCE landing page (English) + Arabic anchors
index.ar.html      ← GENERATED Arabic landing page — do not edit by hand
```

## The one rule that matters

**`src/nyx.css` and `src/nyx.js` are the only framework files you edit by hand.**

`dist/components/*.css`, `dist/nyx.min.css`, `dist/nyx.min.js` (+ `.map`), `dist/nyx.mjs`, and
`llms.txt`/`llms-full.txt` are all regenerated from them.

The **Arabic landing page is generated too:** edit `index.html` (the English
source) plus `locales/ar.json` (translated copy) and `locales/ar.blocks.html`
(Arabic‑only sections), then rebuild — `build.js` regenerates `index.ar.html`.
Never edit `index.ar.html` by hand.

After any such change, run the build and commit the result. The build minifies JS
with esbuild, so install the dev dependencies first:

```bash
npm install   # once
node build.js
```

CI runs `node build.js` and **fails if any generated file drifts** from a fresh
build, so a PR that edits a component file directly — or forgets to rebuild —
will be rejected. Always rebuild before you commit.

## Testing

The runtime has a behavioural test suite that loads `nyx.js` (and the minified
build) into a jsdom document and exercises the public API + declarative wiring.
It uses Node's built-in test runner; `jsdom` is the **only** devDependency and is
never shipped to consumers — the framework itself stays runtime-dependency-free.

```bash
npm install   # one-time: pulls the jsdom devDependency
npm test      # node --test
```

Please add or update a test in `test/` when you change runtime behaviour. CI runs
`npm test` on every PR.

## Previewing your change

No dev server is required. Open the files directly, or serve the repo root with
any static server so relative paths resolve:

```bash
python3 -m http.server   # then visit http://localhost:8000/
```

- Landing page → `index.html` (Arabic: `index.ar.html`)
- Docs → `docs/docs.html` (Arabic: `docs/docs.ar.html`)

## Conventions

- **Two‑space indentation**, UTF‑8, LF line endings (see `.editorconfig`).
- **Theme via tokens.** Prefer `--nyx-*` custom properties over hard‑coded values
  so themes and `color-mix()` retinting keep working.
- **Logical properties** (`margin-inline`, `inset-inline-start`, …) — never
  physical `left`/`right` — so RTL keeps working without overrides.
- **Keep EN/AR parity.** The Arabic landing page is generated — put new or changed
  landing copy in `locales/ar.json` (and Arabic‑only sections in
  `locales/ar.blocks.html`), then rebuild; never hand‑edit `index.ar.html`. Docs
  still mirror manually: new strings go in `docs/docs.ar.js`, and `docs/docs.ar.html`
  shadows `docs/docs.html`.
- **Zero runtime dependencies.** Google Fonts is the only allowed external load.

## Pull request checklist

- [ ] Edited only sources (`src/nyx.css`, `src/nyx.js`, `index.html`, `src/locales/*`) — not generated files
- [ ] Ran `node build.js` and committed the regenerated output (incl. `index.ar.html`)
- [ ] Verified light **and** dark themes
- [ ] Verified RTL (Arabic) where relevant
- [ ] Updated docs (`docs/docs.js`, and `docs/docs.ar.js`) for new components/APIs

## Reporting bugs & ideas

Open an issue using one of the templates. A minimal reproduction (a small HTML
snippet or a link) makes bugs dramatically faster to fix.

By contributing you agree your work is licensed under the project's
[MIT License](LICENSE).

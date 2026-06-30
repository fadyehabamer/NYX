# Contributing to Nyx

Thanks for your interest in improving Nyx! This is a zero‑dependency CSS **+** JS
framework with no bundler and no build framework — just Node for the one build
script. The bar to contribute is intentionally low.

## Project layout

```
nyx.css            ← SOURCE OF TRUTH for all styles (the all‑in‑one bundle)
nyx.js             ← SOURCE OF TRUTH for the runtime
build.js           ← splits nyx.css into components/ and writes the min files
components/*.css    ← GENERATED — do not edit by hand
nyx.min.css/js      ← GENERATED — do not edit by hand
fonts/             ← self‑hosted Thmanyah faces (shipped to npm)
docs/              ← documentation site (docs.html + docs.js + locale packs)
examples/          ← full self‑contained example pages
assets/            ← logos + favicons for the site (not shipped to npm)
index.html         ← English landing page · index.ar.html ← Arabic
```

## The one rule that matters

**`nyx.css` and `nyx.js` are the only files you edit by hand.**

`components/*.css`, `nyx.min.css`, and `nyx.min.js` are all regenerated from them.
After any change to `nyx.css` or `nyx.js`, run the build and commit the result:

```bash
node build.js
```

CI runs `node build.js` and **fails if any generated file drifts** from a fresh
build, so a PR that edits a component file directly — or forgets to rebuild —
will be rejected. Always rebuild before you commit.

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
- **Keep EN/AR parity.** If you change `index.html` or `docs/docs.html`, mirror it
  in the `.ar` counterpart. New docs strings go in `docs/docs.ar.js` as well.
- **Zero runtime dependencies.** Google Fonts is the only allowed external load.

## Pull request checklist

- [ ] Edited only `nyx.css` / `nyx.js` (not generated files)
- [ ] Ran `node build.js` and committed the regenerated output
- [ ] Verified light **and** dark themes
- [ ] Verified RTL (Arabic) where relevant
- [ ] Updated docs (`docs/docs.js`, and `docs/docs.ar.js`) for new components/APIs

## Reporting bugs & ideas

Open an issue using one of the templates. A minimal reproduction (a small HTML
snippet or a link) makes bugs dramatically faster to fix.

By contributing you agree your work is licensed under the project's
[MIT License](LICENSE).
